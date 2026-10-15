import { spawn } from "child_process";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import prisma from "@/lib/prisma";
import { geminiImage } from "@/lib/gemini";
import { loadStoredImage } from "@/lib/imageTools";
import { storeMediaBuffer } from "@/lib/imageStorage";
import { parseScene } from "@/lib/story/engine";
import { createLogger } from "@/lib/logger";

const log = createLogger("animation");

// ============================================
// Cuento animado (+9,90 €): cada ilustración cobra vida en un bucle de 6 s.
// 1. Gemini amplía la ilustración cuadrada a panorámica (Veo no admite 1:1 y
//    deja bandas negras); el lector recorta el centro, que es la original.
// 2. Veo 3.1 Lite la anima con la acción de la escena (0,05 $/s).
// 3. ffmpeg la convierte en bucle de ida y vuelta, sin sonido.
// Coste ≈ 0,37 $ por página (≈ 4,8 $ el libro). Una página cada vez: la
// cuenta de Google tiene poco cupo de vídeo.
//
// Viaje por el cuento (ANIMATION_TRANSITIONS=true): además, un plano de cámara
// continuo de cada página a la siguiente (Veo con primer y último fotograma:
// las panorámicas de los dos bucles). Veo solo interpola en planos de 8 s
// (≈ 0,40 $ cada uno, 11 por libro). Se codifica con fotogramas clave muy
// seguidos para que el lector lo pueda mover con el scroll hacia los dos lados.
// ============================================

const VIDEO_MODEL = process.env.ANIMATION_MODEL || "veo-3.1-lite-generate-preview";
const SECONDS = 6;
const TRANSITION_SECONDS = 8;
const TRANSITIONS = process.env.ANIMATION_TRANSITIONS === "true";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

class QuotaError extends Error {}

const running = new Set<string>();

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY sin configurar");
  return key;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryDelayMs(body: string): number {
  const s = body.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)?.[1];
  return s ? Math.ceil(Number(s) * 1000) + 2000 : 60_000;
}

/** Ilustración cuadrada → panorámica 16:9 con la escena original en el centro */
async function widen(image: Buffer): Promise<Buffer> {
  return geminiImage(
    "Extend this children's book illustration to a wide 16:9 landscape panorama. Keep the original scene, " +
      "characters, faces, colors and exact illustration style unchanged in the center; only continue the " +
      "background naturally to the left and right. No text, no letters, no borders, no frames.",
    [{ buffer: image, mimeType: "image/png" }],
    "16:9",
  );
}

/** Bucle: la ilustración cobra vida con la cámara quieta */
function animate(image: Buffer, action: string): Promise<Buffer> {
  const prompt =
    `The illustration gently comes to life${action ? `: ${action}` : ""}. Subtle, slow, natural movement: ` +
    "characters breathe and blink softly, hair, leaves, water and light move gently. Static camera, no zoom, " +
    "no cuts, no new characters or objects. Keep exactly the same illustration style, colors and composition. " +
    "No text or letters anywhere. Soft ambient sounds only.";
  return veo(prompt, image, null, SECONDS);
}

/** Plano de cámara continuo de una escena a la siguiente */
function travel(from: Buffer, to: Buffer, actionFrom: string, actionTo: string, sameLocation: boolean): Promise<Buffer> {
  const move = sameLocation
    ? "The camera glides slowly and smoothly through the same place, from the first moment to the next one"
    : "The camera travels slowly and smoothly from the first place to the next one, moving naturally through the world " +
      "(gliding, panning or flying between them as if it were one single place)";
  const prompt =
    `${move}. First: ${actionFrom || "the opening scene"}. Then: ${actionTo || "the next scene"}. ` +
    "One single continuous shot with a steady gimbal camera, like floating inside a watercolor children's picture book. " +
    "The characters stay exactly the same. Same illustration style and colors throughout. " +
    "Avoid: cuts, scene changes, fades, crossfades, morphing faces, flicker, shaky camera, fast zoom, text, letters, new people.";
  return veo(prompt, from, to, TRANSITION_SECONDS);
}

/** Lanza Veo y espera el vídeo (MP4) */
async function veo(prompt: string, image: Buffer, lastFrame: Buffer | null, seconds: number): Promise<Buffer> {
  let operation = "";
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      body: JSON.stringify({
        instances: [
          {
            prompt,
            image: { bytesBase64Encoded: image.toString("base64"), mimeType: "image/png" },
            ...(lastFrame ? { lastFrame: { bytesBase64Encoded: lastFrame.toString("base64"), mimeType: "image/png" } } : {}),
          },
        ],
        parameters: { aspectRatio: "16:9", durationSeconds: seconds, resolution: "720p", personGeneration: "allow_adult" },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.text();
    if (response.ok) {
      operation = (JSON.parse(body) as { name: string }).name;
      break;
    }
    if (response.status === 429) {
      if (/PerDay|per day|daily/i.test(body) || attempt >= 4) throw new QuotaError("Cupo de vídeo agotado");
      await sleep(retryDelayMs(body));
      continue;
    }
    throw new Error(`Veo ${response.status}: ${body.slice(0, 400)}`);
  }

  const started = Date.now();
  while (Date.now() - started < 8 * 60_000) {
    await sleep(10_000);
    const r = await fetch(`${BASE}/${operation}`, { headers: { "x-goog-api-key": apiKey() } });
    const status = (await r.json()) as {
      done?: boolean;
      error?: { message?: string };
      response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[]; raiMediaFilteredReasons?: string[] } };
    };
    if (!status.done) continue;
    if (status.error) throw new Error(`Veo: ${status.error.message}`);
    const uri = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!uri) {
      const reasons = status.response?.generateVideoResponse?.raiMediaFilteredReasons?.join("; ");
      throw new Error(`Veo no devolvió vídeo${reasons ? `: ${reasons}` : ""}`);
    }
    const video = await fetch(uri, { headers: { "x-goog-api-key": apiKey() }, redirect: "follow" });
    if (!video.ok) throw new Error(`Descarga del vídeo ${video.status}`);
    return Buffer.from(await video.arrayBuffer());
  }
  throw new Error("Veo tardó demasiado");
}

/** Pasa un MP4 por ffmpeg con los argumentos dados (entre la entrada y la salida) */
async function ffmpeg(mp4: Buffer, args: string[], ext = "mp4"): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anim-"));
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, `${randomUUID()}.${ext}`);
  try {
    await fs.writeFile(input, mp4);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", ["-v", "error", "-y", "-i", input, ...args, output]);
      let err = "";
      ff.stderr.on("data", (c) => (err += c));
      ff.on("error", reject);
      ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err}`))));
    });
    return await fs.readFile(output);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

const H264 = ["-an", "-c:v", "libx264", "-crf", "26", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

/** Bucle de ida y vuelta sin sonido, ligero para la web */
function toLoop(mp4: Buffer): Promise<Buffer> {
  return ffmpeg(mp4, ["-filter_complex", "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]", "-map", "[v]", ...H264]);
}

/** Para moverlo con el scroll: un fotograma clave cada 4 (retroceder no da tirones) */
export function toScrub(mp4: Buffer): Promise<Buffer> {
  return ffmpeg(mp4, ["-g", "4", "-bf", "0", ...H264]);
}

/** Primer fotograma del bucle: la panorámica de la página */
function firstFrame(mp4: Buffer): Promise<Buffer> {
  return ffmpeg(mp4, ["-frames:v", "1"], "png");
}

/** Ilustración cuadrada → bucle MP4 animado (también para probarlo desde scripts) */
export async function animateIllustration(image: Buffer, action: string): Promise<Buffer> {
  return toLoop(await animate(await widen(image), action));
}

/** Anima en segundo plano las páginas que aún no tienen vídeo */
export function startAnimation(bookId: string) {
  if (running.has(bookId) || !process.env.GEMINI_API_KEY) return;
  running.add(bookId);
  void animateBook(bookId)
    .catch((error) => log.error({ err: error, bookId }, "Error animando el cuento"))
    .finally(() => running.delete(bookId));
}

async function animateBook(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book || book.status !== "COMPLETED" || !book.unlockedAt) return;
  await prisma.book.update({ where: { id: bookId }, data: { animationStatus: "running" } });

  const pending = book.pages.filter((p) => !p.videoUrl && (p.pageNumber === 1 ? book.coverImageUrl : p.imageUrl));
  const started = Date.now();
  let failed = 0;
  for (const page of pending) {
    try {
      const source = page.pageNumber === 1 ? book.coverImageUrl! : page.imageUrl!;
      const action = page.pageNumber === 1 ? "" : (parseScene(page.scene)?.action ?? "");
      const loop = await animateIllustration(await loadStoredImage(source), action);
      const url = await storeMediaBuffer(loop, bookId, `video-${page.pageNumber}`, "mp4");
      await prisma.bookPage.update({ where: { id: page.id }, data: { videoUrl: url } });
      log.info({ bookId, page: page.pageNumber }, "Página animada");
    } catch (error) {
      failed++;
      if (error instanceof QuotaError) {
        log.warn({ bookId }, "Cupo de vídeo agotado: se sigue en la próxima pasada");
        break;
      }
      log.error({ err: error, bookId, page: page.pageNumber }, "Página sin animar");
    }
  }

  if (TRANSITIONS && failed === 0) failed += await travelBook(bookId);

  await prisma.book.update({
    where: { id: bookId },
    data:
      failed === 0
        ? { animationStatus: "done", animatedAt: new Date() }
        : { animationStatus: "requested" }, // el cron lo retoma
  });
  log.info({ bookId, pages: pending.length, failed, ms: Date.now() - started }, "Cuento animado");
}

/** Planos de cámara entre páginas animadas consecutivas; devuelve cuántos fallaron */
async function travelBook(bookId: string): Promise<number> {
  const pages = await prisma.bookPage.findMany({
    where: { bookId, pageNumber: { gt: 1 } },
    orderBy: { pageNumber: "asc" },
  });
  let failed = 0;
  for (let i = 0; i + 1 < pages.length; i++) {
    const [a, b] = [pages[i], pages[i + 1]];
    if (a.transitionUrl || !a.videoUrl || !b.videoUrl) continue;
    try {
      const [from, to] = await Promise.all([a.videoUrl, b.videoUrl].map(async (url) => firstFrame(await loadStoredImage(url))));
      const sceneA = parseScene(a.scene);
      const sceneB = parseScene(b.scene);
      const sameLocation = Boolean(sceneA && sceneB && sceneA.location === sceneB.location);
      const clip = await travel(from, to, sceneA?.action ?? "", sceneB?.action ?? "", sameLocation);
      const url = await storeMediaBuffer(await toScrub(clip), bookId, `viaje-${a.pageNumber}`, "mp4");
      await prisma.bookPage.update({ where: { id: a.id }, data: { transitionUrl: url } });
      log.info({ bookId, page: a.pageNumber }, "Viaje entre páginas listo");
    } catch (error) {
      failed++;
      if (error instanceof QuotaError) {
        log.warn({ bookId }, "Cupo de vídeo agotado: el viaje sigue en la próxima pasada");
        break;
      }
      log.error({ err: error, bookId, page: a.pageNumber }, "Viaje sin generar");
    }
  }
  return failed;
}
