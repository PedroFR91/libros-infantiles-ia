import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { createLogger } from "@/lib/logger";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const log = createLogger("image-storage");

// ── S3 Configuration (Hetzner Object Storage compatible) ──
const USE_S3 = !!(process.env.S3_ENDPOINT && process.env.S3_BUCKET);

let s3Client: S3Client | null = null;

function getS3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION || "fsn1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // Required for Hetzner Object Storage
    });
  }
  return s3Client;
}

const S3_BUCKET = process.env.S3_BUCKET || "libros-ia";

// Local filesystem fallback
const IMAGES_DIR = process.env.IMAGES_DIR || "./public/images/books";

/**
 * Downloads an image from a URL and stores it permanently (S3 or local)
 */
export async function downloadAndStoreImage(
  url: string,
  bookId: string,
  pageNumber: number,
): Promise<string> {
  try {
    // Download the image
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `page-${pageNumber}-${randomUUID().slice(0, 8)}.png`;

    if (USE_S3) {
      return await storeToS3(buffer, bookId, fileName);
    } else {
      return await storeToLocal(buffer, bookId, fileName);
    }
  } catch (error) {
    log.error({ err: error, bookId, pageNumber }, "Error guardando imagen");
    // Fallback: return original URL (will expire but works temporarily)
    return url;
  }
}

/**
 * Store an image Buffer directly (for gpt-image-1 which returns base64).
 * @param label  e.g. "page-3", "character-ref"
 */
export async function storeImageBuffer(
  buffer: Buffer,
  bookId: string,
  label: string,
): Promise<string> {
  const fileName = `${label}-${randomUUID().slice(0, 8)}.png`;

  if (USE_S3) {
    return await storeToS3(buffer, bookId, fileName);
  } else {
    return await storeToLocal(buffer, bookId, fileName);
  }
}

/**
 * Download an image URL into a Buffer (for loading stored character refs).
 */
export async function downloadImageToBuffer(url: string): Promise<Buffer> {
  // Handle local URLs by prepending the app origin
  const fetchUrl =
    url.startsWith("/api/") || url.startsWith("/images/")
      ? `${process.env.NEXTAUTH_URL || "http://localhost:3000"}${url}`
      : url;

  const response = await fetch(fetchUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Store image to S3 (Hetzner Object Storage)
 */
async function storeToS3(
  buffer: Buffer,
  bookId: string,
  fileName: string,
): Promise<string> {
  const key = `books/${bookId}/${fileName}`;
  const s3 = getS3();

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  // Build public URL
  const endpoint = process.env.S3_ENDPOINT!.replace("https://", "");
  const publicUrl = `https://${S3_BUCKET}.${endpoint}/${key}`;

  log.info({ key, publicUrl }, "Imagen guardada en S3");
  return publicUrl;
}

/**
 * Store image to local filesystem (development / fallback)
 */
async function storeToLocal(
  buffer: Buffer,
  bookId: string,
  fileName: string,
): Promise<string> {
  const bookDir = path.join(IMAGES_DIR, bookId);
  await fs.mkdir(bookDir, { recursive: true });

  const filePath = path.join(bookDir, fileName);
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/api/images/books/${bookId}/${fileName}`;
  log.info({ filePath, publicUrl }, "Imagen guardada localmente");
  return publicUrl;
}

/**
 * Delete all images for a book
 */
export async function deleteBookImages(bookId: string): Promise<void> {
  try {
    if (USE_S3) {
      await deleteFromS3(bookId);
    } else {
      await deleteFromLocal(bookId);
    }
    log.info({ bookId }, "Imágenes eliminadas");
  } catch (error) {
    log.error({ err: error, bookId }, "Error eliminando imágenes");
  }
}

async function deleteFromS3(bookId: string): Promise<void> {
  const s3 = getS3();
  const prefix = `books/${bookId}/`;

  const listResult = await s3.send(
    new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    }),
  );

  if (!listResult.Contents || listResult.Contents.length === 0) return;

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: S3_BUCKET,
      Delete: {
        Objects: listResult.Contents.map((obj) => ({ Key: obj.Key! })),
      },
    }),
  );
}

async function deleteFromLocal(bookId: string): Promise<void> {
  const bookDir = path.join(IMAGES_DIR, bookId);
  await fs.rm(bookDir, { recursive: true, force: true });
}

/**
 * Check if a URL is a local stored URL
 */
export function isLocalUrl(url: string): boolean {
  return (
    url.startsWith("/images/") ||
    url.startsWith("/uploads/") ||
    url.startsWith("/api/images/")
  );
}

/**
 * Check if a URL is a temporary OpenAI URL
 */
export function isOpenAIUrl(url: string): boolean {
  return url.includes("oaidalleapiprodscus.blob.core.windows.net");
}

/**
 * Check if a URL is stored in S3
 */
export function isS3Url(url: string): boolean {
  const endpoint = process.env.S3_ENDPOINT || "";
  return url.includes(endpoint.replace("https://", ""));
}

/**
 * Get the current storage mode
 */
export function getStorageMode(): "s3" | "local" {
  return USE_S3 ? "s3" : "local";
}
