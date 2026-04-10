import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateDigitalPDF, generatePrintReadyPDF } from "@/lib/pdf";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { createLogger } from "@/lib/logger";

const log = createLogger("pdf");

// POST /api/books/[id]/pdf - Generar PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as "digital" | "print") || "digital";

    // Autenticación centralizada (NextAuth + fallback sessionId)
    const userId = await getAuthenticatedUserId();
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
        { error: "El libro debe estar completado para generar PDF" },
        { status: 400 },
      );
    }

    // Verificar si ya existe el PDF
    const existingUrl =
      type === "digital" ? book.digitalPdfUrl : book.printPdfUrl;
    if (existingUrl) {
      return NextResponse.json({
        url: existingUrl,
        cached: true,
      });
    }

    // Preparar datos para PDF
    // Nota: Los campos de personalización (textPosition, textBackground, etc.)
    // no están en la base de datos actualmente, se usarán valores por defecto
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

    // Generar PDF
    let pdfUrl: string;
    if (type === "print") {
      pdfUrl = await generatePrintReadyPDF(bookData);
      await prisma.book.update({
        where: { id },
        data: { printPdfUrl: pdfUrl },
      });
    } else {
      pdfUrl = await generateDigitalPDF(bookData);
      await prisma.book.update({
        where: { id },
        data: { digitalPdfUrl: pdfUrl },
      });
    }

    return NextResponse.json({
      url: pdfUrl,
      cached: false,
    });
  } catch (error) {
    log.error({ err: error }, "Error generando PDF");
    return NextResponse.json(
      { error: "Error al generar PDF" },
      { status: 500 },
    );
  }
}
