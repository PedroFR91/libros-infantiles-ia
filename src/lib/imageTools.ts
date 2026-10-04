import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { createLogger } from "@/lib/logger";

const log = createLogger("image-tools");

const IMAGES_DIR = process.env.IMAGES_DIR || "./public/images/books";

/**
 * Lee una imagen guardada por imageStorage: del disco si es local
 * (/api/images/books/<id>/<archivo>) o por HTTP si está en S3.
 */
export async function loadStoredImage(url: string): Promise<Buffer> {
  const match = url.match(/\/(?:api\/)?images\/books\/([^/]+)\/([^/?#]+)$/);
  if (match) {
    const [, bookId, fileName] = match;
    return fs.readFile(path.join(IMAGES_DIR, bookId, fileName));
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Versión de muestra de la portada: más pequeña y con marca de agua en
 * diagonal, para enseñarla gratis sin regalar la imagen limpia.
 */
export async function watermarkPreview(image: Buffer): Promise<Buffer> {
  const size = 768;
  const label = "MUESTRA · LibrosIA";
  const rows = [0.18, 0.5, 0.82]
    .map(
      (y) =>
        `<text x="50%" y="${y * 100}%" text-anchor="middle" dominant-baseline="middle" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="58" font-weight="700" fill="#ffffff" fill-opacity="0.42" stroke="#000000" stroke-opacity="0.18" stroke-width="2" transform="rotate(-28 ${size / 2} ${y * size})">${label}</text>`,
    )
    .join("");
  const overlay = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${rows}</svg>`,
  );

  return sharp(image)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: overlay }])
    .jpeg({ quality: 78 })
    .toBuffer();
}

/**
 * Reescala una ilustración para imprenta (300 ppp). Si hay token de
 * Replicate usa un modelo de super-resolución; si no, Lanczos + enfoque
 * suave con sharp, suficiente para ilustración de colores planos.
 */
export async function upscaleForPrint(
  image: Buffer,
  targetPx: number,
): Promise<Buffer> {
  if (process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_UPSCALE_VERSION) {
    try {
      const upscaled = await upscaleWithReplicate(image);
      return sharp(upscaled)
        .resize(targetPx, targetPx, { fit: "cover", kernel: "lanczos3" })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
        .toBuffer();
    } catch (error) {
      log.error({ err: error }, "Replicate falló, reescalado local");
    }
  }

  return sharp(image)
    .resize(targetPx, targetPx, { fit: "cover", kernel: "lanczos3" })
    .sharpen({ sigma: 0.8 })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

/**
 * Para los PDF de pantalla y de imprimir en casa: JPEG ligero (un PDF de
 * 13 PNG pesaba ~36 MB, demasiado para abrirlo en el móvil o enviarlo).
 */
export async function compressForScreen(image: Buffer, maxPx = 1600): Promise<Buffer> {
  return sharp(image)
    .resize(maxPx, maxPx, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

// Super-resolución ×4 en Replicate (API de predicciones síncrona con Prefer: wait).
// REPLICATE_UPSCALE_VERSION: id de versión del modelo (p. ej. el de Real-ESRGAN,
// copiado de su página en replicate.com, formato "owner/model:hash" o "hash").
async function upscaleWithReplicate(image: Buffer): Promise<Buffer> {
  const version = process.env.REPLICATE_UPSCALE_VERSION!;
  const response = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      version: version.split(":")[1] ?? version,
      input: {
        image: `data:image/png;base64,${image.toString("base64")}`,
        scale: 4,
      },
    }),
  });
  const prediction = (await response.json()) as {
    status?: string;
    output?: string;
    error?: string;
  };
  if (prediction.status !== "succeeded" || !prediction.output) {
    throw new Error(prediction.error || `Estado ${prediction.status}`);
  }
  const output = await fetch(prediction.output);
  return Buffer.from(await output.arrayBuffer());
}
