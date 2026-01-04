import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { getPDFPath } from "@/lib/pdf";
import * as fs from "fs/promises";

// GET /api/books/[id]/pdf/download - Descargar PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as "digital" | "print") || "digital";

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar propiedad del libro
    const book = await prisma.book.findFirst({
      where: {
        id,
        user: { sessionId },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 }
      );
    }

    // Obtener path del PDF
    const pdfPath = await getPDFPath(id, type);
    if (!pdfPath) {
      return NextResponse.json(
        { error: "PDF no encontrado. Genera el PDF primero." },
        { status: 404 }
      );
    }

    // Leer archivo
    const pdfBuffer = await fs.readFile(pdfPath);

    // Nombre del archivo
    const filename = `${book.kidName.replace(/\s+/g, "-")}-libro-${type}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error descargando PDF:", error);
    return NextResponse.json(
      { error: "Error al descargar PDF" },
      { status: 500 }
    );
  }
}
