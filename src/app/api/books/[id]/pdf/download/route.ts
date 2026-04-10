import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  generateDigitalPDF,
  generatePrintReadyPDF,
  getPDFPath,
} from "@/lib/pdf";
import { auth } from "@/lib/auth";
import * as fs from "fs/promises";
import { createLogger } from "@/lib/logger";

const log = createLogger("pdf-download");

// GET /api/books/[id]/pdf/download - Descargar PDF (genera si no existe)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as "digital" | "print") || "digital";

    // PRIMERO: Verificar sesión de NextAuth
    const session = await auth();
    let userId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // FALLBACK: Usuario anónimo por sessionId
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("sessionId")?.value;

      if (sessionId) {
        const anonymousUser = await prisma.user.findUnique({
          where: { sessionId },
          select: { id: true },
        });
        userId = anonymousUser?.id || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener libro con páginas
    const book = await prisma.book.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    if (book.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "El libro debe estar completado para descargar" },
        { status: 400 },
      );
    }

    // Intentar obtener PDF existente
    let pdfPath = await getPDFPath(id, type);

    // Si no existe, generarlo bajo demanda
    if (!pdfPath) {
      // Generar PDF bajo demanda

      const bookData = {
        id: book.id,
        title: book.title || `La aventura de ${book.kidName}`,
        kidName: book.kidName,
        pages: book.pages.map(
          (p: {
            pageNumber: number;
            text: string | null;
            imageUrl: string | null;
          }) => ({
            pageNumber: p.pageNumber,
            text: p.text || "",
            imageUrl: p.imageUrl || undefined,
          }),
        ),
      };

      if (type === "print") {
        await generatePrintReadyPDF(bookData);
      } else {
        await generateDigitalPDF(bookData);
      }

      // Obtener path del PDF recién generado
      pdfPath = await getPDFPath(id, type);
    }

    if (!pdfPath) {
      return NextResponse.json(
        { error: "No se pudo generar el PDF" },
        { status: 500 },
      );
    }

    // Leer archivo
    const pdfBuffer = await fs.readFile(pdfPath);

    // Nombre del archivo limpio
    const safeName = book.kidName
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, "")
      .replace(/\s+/g, "-");
    const filename = `${safeName}-libro${
      type === "print" ? "-imprenta" : ""
    }.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error descargando PDF");
    return NextResponse.json(
      { error: "Error al descargar PDF" },
      { status: 500 },
    );
  }
}
