import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  
  // Construir la ruta del archivo
  const filePath = path.join(
    process.cwd(),
    "public",
    "images",
    ...pathSegments
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
    };
    
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error reading image:", error);
    return NextResponse.json({ error: "Error reading image" }, { status: 500 });
  }
}
