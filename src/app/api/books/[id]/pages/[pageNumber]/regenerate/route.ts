import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
import {
  regeneratePageText,
  generateImageWithReference,
  generateImage,
} from "@/lib/openai";
import { storeImageBuffer, downloadImageToBuffer } from "@/lib/imageStorage";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { regeneratePageSchema, validateBody } from "@/lib/validation";
import { createLogger } from "@/lib/logger";

const log = createLogger("regenerate");

// POST /api/books/[id]/pages/[pageNumber]/regenerate - Regenerar una página
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNumber: string }> },
) {
  try {
    const { id, pageNumber: pageNumberStr } = await params;
    const pageNumber = parseInt(pageNumberStr, 10);
    const body = await request.json();

    // Validación con Zod
    const validation = validateBody(regeneratePageSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const {
      customPrompt,
      regenerateImage = true,
      regenerateText = true,
    } = validation.data;

    // Autenticación centralizada (NextAuth + fallback sessionId)
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = checkRateLimit(
      `regen:${userId}`,
      RATE_LIMIT_PRESETS.generation,
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Obtener libro y página
    const book = await prisma.book.findFirst({
      where: {
        id,
        userId,
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
        { status: 404 },
      );
    }

    const page = book.pages[0];
    if (!page) {
      return NextResponse.json(
        { error: "Página no encontrada" },
        { status: 404 },
      );
    }

    // Verificar créditos
    const hasCredits = await hasEnoughCredits(book.userId, "PAGE_REGENERATION");
    if (!hasCredits) {
      return NextResponse.json(
        { error: "No tienes suficientes créditos", needsCredits: true },
        { status: 402 },
      );
    }

    // Consumir créditos
    await consumeCredits(
      book.userId,
      "PAGE_REGENERATION",
      `${id}-page-${pageNumber}`,
    );

    const updates: {
      text?: string;
      imagePrompt?: string;
      imageUrl?: string;
      promptOverride?: string;
    } = {};

    const artStyle = (book as { style?: string }).style || "cartoon";
    const characterSheet =
      (book as { characterDescription?: string | null }).characterDescription ||
      "";

    // Regenerar texto si se solicita
    if (regenerateText) {
      const result = await regeneratePageText(
        book.kidName,
        book.theme,
        pageNumber,
        page.text || "",
        characterSheet,
        artStyle,
        customPrompt,
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
        // Load character reference for consistency
        let characterBuffer: Buffer | null = null;
        const charImgUrl = (book as { characterImageUrl?: string | null })
          .characterImageUrl;
        if (charImgUrl) {
          try {
            characterBuffer = await downloadImageToBuffer(charImgUrl);
          } catch {
            log.warn(
              { bookId: id },
              "Character ref not available for regeneration",
            );
          }
        }

        const imageBuffer = characterBuffer
          ? await generateImageWithReference(prompt, characterBuffer)
          : await generateImage(prompt);

        const permanentUrl = await storeImageBuffer(
          imageBuffer,
          id,
          `page-${pageNumber}`,
        );
        updates.imageUrl = permanentUrl;
        log.info({ bookId: id, pageNumber }, "Imagen regenerada");
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
    log.error({ err: error }, "Error regenerando página");
    return NextResponse.json(
      { error: "Error al regenerar página" },
      { status: 500 },
    );
  }
}
