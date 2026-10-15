import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { createLogger } from "@/lib/logger";

const log = createLogger("images");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;

  // Construir la ruta del archivo
  const filePath = path.join(
    process.cwd(),
    "public",
    "images",
    ...pathSegments,
  );

  // Verificar que el archivo existe
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Verificar que la ruta está dentro del directorio permitido (seguridad)
  const publicImagesDir = path.join(process.cwd(), "public", "images");
  if (!filePath.startsWith(publicImagesDir)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const fileBuffer = await readFile(filePath);

    // Determinar el content-type basado en la extensión
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    // Rangos: el audio (sobre todo en Safari) pide trozos del archivo
    const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
    if (range) {
      const size = fileBuffer.length;
      const start = range[1] ? parseInt(range[1], 10) : Math.max(0, size - parseInt(range[2] || "0", 10));
      const end = range[1] && range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
      if (Number.isNaN(start) || start >= size || start > end) {
        return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      }
      return new NextResponse(fileBuffer.subarray(start, end + 1), {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(end - start + 1),
          "Accept-Ranges": "bytes",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error reading image");
    return NextResponse.json({ error: "Error reading image" }, { status: 500 });
  }
}
