import { spawn } from "child_process";
import prisma from "@/lib/prisma";
import { storeAudioBuffer } from "@/lib/imageStorage";
import { createLogger } from "@/lib/logger";

const log = createLogger("narration");

// ============================================
// Cuento narrado (incluido con el PDF): una voz lee cada página y suena una
// música de fondo según el tema. Voz: Gemini TTS (~0,01 $ por libro).
// Música: biblioteca fija en public/music (Lyria, generada una vez).
// ============================================

const TTS_MODEL = process.env.NARRATION_MODEL || "gemini-3.8-flash-tts";
const VOICE = process.env.NARRATION_VOICE || "Sulafat";
/** Separación mínima entre peticiones de voz en todo el servidor (cupo por minuto de la cuenta) */
const MIN_GAP_MS = Number(process.env.NARRATION_MIN_GAP_MS) || 7000;

/** Se agotó el cupo diario de voz: se deja para la siguiente pasada del cron */
class DailyQuotaError extends Error {}

// Cola global: una petición de voz cada vez, con MIN_GAP_MS entre ellas
let queue: Promise<void> = Promise.resolve();
let lastCall = 0;
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCall + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return fn();
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** Espera que pide Google en un 429 ("retryDelay": "12s") y si el cupo es diario */
function quotaInfo(body: string): { waitMs: number; daily: boolean } {
  const delay = body.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1];
  return {
    waitMs: delay ? Math.ceil(Number(delay) * 1000) + 1000 : 30_000,
    daily: /PerDay|per day|daily/i.test(body),
  };
}

// Gemini 3.8 TTS lee el campo de texto literalmente: cualquier instrucción de
// estilo se oiría en voz alta. La voz Sulafat ya suena cálida y pausada.

// ── Música ────────────────────────────────────────────────────────────

export const MUSIC_TRACKS = ["calma", "aventura", "magia", "divertido", "navidad", "halloween"] as const;
export type MusicTrack = (typeof MUSIC_TRACKS)[number];

const MUSIC_KEYWORDS: [MusicTrack, RegExp][] = [
  ["navidad", /navidad|nochebuena|reyes|pap[aá] noel|santa|nieve|invierno|belén/i],
  ["halloween", /halloween|monstru|fantasma|bruj|calabaza|vampir|esqueleto/i],
  ["magia", /drag[oó]n|hada|m[aá]gi|sirena|unicornio|princes|castillo|estrella|hechiz|varita/i],
  ["divertido", /divertid|gracios|risa|fiesta|cumplea|payaso|circo|f[uú]tbol|deporte/i],
  ["aventura", /aventur|pirata|tesoro|espacio|astronaut|dinosaur|selva|superh[eé]roe|explor|viaje|mar\b|oc[eé]ano/i],
];

export function chooseMusic(theme: string): MusicTrack {
  return MUSIC_KEYWORDS.find(([, re]) => re.test(theme))?.[0] ?? "calma";
}

export function musicUrl(track: string | null | undefined): string {
  const t = MUSIC_TRACKS.includes(track as MusicTrack) ? track : "calma";
  return `/music/${t}.mp3`;
}

// ── Voz ───────────────────────────────────────────────────────────────

async function speak(text: string): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY sin configurar");
  for (let attempt = 1; ; attempt++) {
    const response = await throttled(() => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        }),
        signal: AbortSignal.timeout(120_000),
      },
    ));
    if (response.ok) {
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
      };
      const audio = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!audio) throw new Error("La voz no devolvió audio");
      const bytes = Buffer.from(audio.data, "base64");
      // Según el modelo llega WAV completo o PCM de 16 bits sin cabecera
      if (/wav/i.test(audio.mimeType)) return bytes;
      const rate = Number(audio.mimeType.match(/rate=(\d+)/)?.[1] ?? 24000);
      return wavFromPcm(bytes, rate);
    }
    const body = await response.text();
    if (response.status === 429) {
      const { waitMs, daily } = quotaInfo(body);
      if (daily) throw new DailyQuotaError("Cupo diario de voz agotado");
      if (attempt >= 6) throw new Error(`Voz 429 tras ${attempt} intentos: ${body.slice(0, 600)}`);
      log.warn({ waitMs, attempt }, "Cupo por minuto de voz: se espera y se reintenta");
      await new Promise((r) => setTimeout(r, Math.min(waitMs, 120_000)));
      continue;
    }
    if (response.status < 500 || attempt >= 4) throw new Error(`Voz ${response.status}: ${body.slice(0, 600)}`);
    await new Promise((r) => setTimeout(r, 10_000 * attempt));
  }
}

function wavFromPcm(pcm: Buffer, rate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** WAV → MP3 mono 64 kbps (~250 KB por página) */
function toMp3(wav: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-v", "error", "-i", "pipe:0", "-ac", "1", "-b:a", "64k", "-f", "mp3", "pipe:1"]);
    const out: Buffer[] = [];
    let err = "";
    ff.stdout.on("data", (c) => out.push(c));
    ff.stderr.on("data", (c) => (err += c));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg ${code}: ${err}`))));
    ff.stdin.end(wav);
  });
}

/** Texto → MP3 narrado (también para probarlo desde scripts) */
export async function synthesizeNarration(text: string): Promise<Buffer> {
  return toMp3(await speak(text));
}

// ── Narración de un libro ─────────────────────────────────────────────

const running = new Set<string>();

/** Qué se lee en cada página: la portada dice el título; el resto, su texto */
function pageScript(page: { pageNumber: number; text: string | null }, book: { title: string | null; kidName: string }) {
  if (page.pageNumber === 1) {
    const title = book.title || `La aventura de ${book.kidName}`;
    return `${title}. Un cuento para ${book.kidName}.`;
  }
  return page.text?.trim() || "";
}

/**
 * Narra en segundo plano las páginas que aún no tienen audio (libro pagado y
 * terminado). Idempotente: si ya está narrando ese libro, no hace nada.
 */
export function startNarration(bookId: string) {
  if (running.has(bookId) || !process.env.GEMINI_API_KEY) return;
  running.add(bookId);
  void narrateBook(bookId)
    .catch((error) => log.error({ err: error, bookId }, "Error narrando el cuento"))
    .finally(() => running.delete(bookId));
}

async function narrateBook(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book || book.status !== "COMPLETED" || !book.unlockedAt) return;

  if (!book.musicTrack) {
    await prisma.book.update({ where: { id: bookId }, data: { musicTrack: chooseMusic(book.theme) } });
  }

  const pending = book.pages.filter((p) => !p.audioUrl && pageScript(p, book));
  const started = Date.now();
  let failed = 0;
  // Página a página (la cola global ya espacia las peticiones)
  for (const page of pending) {
    try {
      const mp3 = await synthesizeNarration(pageScript(page, book));
      const url = await storeAudioBuffer(mp3, bookId, `voz-${page.pageNumber}`);
      await prisma.bookPage.update({ where: { id: page.id }, data: { audioUrl: url } });
    } catch (error) {
      failed++;
      if (error instanceof DailyQuotaError) {
        log.warn({ bookId }, "Cupo diario de voz agotado: se sigue en la próxima pasada");
        break;
      }
      log.error({ err: error, bookId, page: page.pageNumber }, "Página sin narrar");
    }
  }

  if (failed === 0) {
    await prisma.book.update({ where: { id: bookId }, data: { narratedAt: new Date() } });
  }
  log.info({ bookId, pages: pending.length, failed, ms: Date.now() - started }, "Cuento narrado");
}

/** Al cambiar el texto de una página hay que volver a narrarla */
export async function invalidateNarration(bookId: string, pageNumber: number) {
  await prisma.$transaction([
    prisma.bookPage.updateMany({ where: { bookId, pageNumber }, data: { audioUrl: null } }),
    prisma.book.update({ where: { id: bookId }, data: { narratedAt: null } }),
  ]);
}
