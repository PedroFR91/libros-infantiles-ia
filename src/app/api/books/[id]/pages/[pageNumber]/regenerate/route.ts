import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
import { regeneratePageText, generateImage } from "@/lib/openai";
import { downloadAndStoreImage } from "@/lib/imageStorage";

// POST /api/books/[id]/pages/[pageNumber]/regenerate - Regenerar una página
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNumber: string }> }
) {
  try {
    const { id, pageNumber: pageNumberStr } = await params;
    const pageNumber = parseInt(pageNumberStr, 10);
    const body = await request.json();
    const {
      customPrompt,
      regenerateImage = true,
      regenerateText = true,
    } = body;

    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener libro y página
    const book = await prisma.book.findFirst({
      where: {
        id,
        user: { sessionId },
      },
      include: {
        user: true,
        pages: {
          where: { pageNumber },
        },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 }
      );
    }

    const page = book.pages[0];
    if (!page) {
      return NextResponse.json(
        { error: "Página no encontrada" },
        { status: 404 }
      );
    }

    // Verificar créditos
    const hasCredits = await hasEnoughCredits(book.userId, "PAGE_REGENERATION");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "No tienes suficientes créditos", needsCredits: true },
        { status: 402 }
      );
    }

    // Consumir créditos
    await consumeCredits(
      book.userId,
      "PAGE_REGENERATION",
      `${id}-page-${pageNumber}`
    );

    const updates: {
      text?: string;
      imagePrompt?: string;
      imageUrl?: string;
      promptOverride?: string;
    } = {};

    // Regenerar texto si se solicita
    if (regenerateText) {
      const result = await regeneratePageText(
        book.kidName,
        book.theme,
        pageNumber,
        page.text || "",
        customPrompt
      );
      updates.text = result.text;
      updates.imagePrompt = result.imagePrompt;

      if (customPrompt) {
        updates.promptOverride = customPrompt;
      }
    }

    // Regenerar imagen si se solicita
    if (regenerateImage) {
      const prompt = updates.imagePrompt || page.imagePrompt;
      if (prompt) {
        // Generar imagen con OpenAI (URL temporal)
        const tempImageUrl = await generateImage(prompt);
        // Descargar y almacenar permanentemente
        const permanentUrl = await downloadAndStoreImage(
          tempImageUrl,
          id,
          pageNumber
        );
        updates.imageUrl = permanentUrl;
        console.log(
          `Imagen regenerada página ${pageNumber} guardada: ${permanentUrl}`
        );
      }
    }

    // Actualizar página
    const updatedPage = await prisma.bookPage.update({
      where: { id: page.id },
      data: updates,
    });

    // Invalidar PDFs cacheados
    await prisma.book.update({
      where: { id },
      data: {
        digitalPdfUrl: null,
        printPdfUrl: null,
      },
    });

    return NextResponse.json({
      page: updatedPage,
      message: "Página regenerada exitosamente",
    });
  } catch (error) {
    console.error("Error regenerando página:", error);
    return NextResponse.json(
      { error: "Error al regenerar página" },
      { status: 500 }
    );
  }
}
