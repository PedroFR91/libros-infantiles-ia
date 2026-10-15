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
// ============================================

const VIDEO_MODEL = process.env.ANIMATION_MODEL || "veo-3.1-lite-generate-preview";
const SECONDS = 6;
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

/** Lanza Veo y espera el vídeo (MP4) */
async function animate(image: Buffer, action: string): Promise<Buffer> {
  const prompt =
    `The illustration gently comes to life${action ? `: ${action}` : ""}. Subtle, slow, natural movement: ` +
    "characters breathe and blink softly, hair, leaves, water and light move gently. Static camera, no zoom, " +
    "no cuts, no new characters or objects. Keep exactly the same illustration style, colors and composition. " +
    "No text or letters anywhere. Soft ambient sounds only.";

  let operation = "";
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE}/models/${VIDEO_MODEL}:predictLongRunning`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey() },
      body: JSON.stringify({
        instances: [{ prompt, image: { bytesBase64Encoded: image.toString("base64"), mimeType: "image/png" } }],
        parameters: { aspectRatio: "16:9", durationSeconds: SECONDS, resolution: "720p", personGeneration: "allow_adult" },
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

/** Bucle de ida y vuelta sin sonido, ligero para la web */
async function toLoop(mp4: Buffer): Promise<Buffer> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "anim-"));
  const input = path.join(dir, "in.mp4");
  const output = path.join(dir, `${randomUUID()}.mp4`);
  try {
    await fs.writeFile(input, mp4);
    await new Promise<void>((resolve, reject) => {
      const ff = spawn("ffmpeg", [
        "-v", "error", "-y", "-i", input,
        "-filter_complex", "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]",
        "-map", "[v]", "-an", "-c:v", "libx264", "-crf", "26", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", output,
      ]);
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

  await prisma.book.update({
    where: { id: bookId },
    data:
      failed === 0
        ? { animationStatus: "done", animatedAt: new Date() }
        : { animationStatus: "requested" }, // el cron lo retoma
  });
  log.info({ bookId, pages: pending.length, failed, ms: Date.now() - started }, "Cuento animado");
}
