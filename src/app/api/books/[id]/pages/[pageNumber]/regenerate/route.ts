import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hasEnoughCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/stripe";
import {
  regeneratePageText,
  generateImageWithReference,
  generateImage,
  generateIllustration,
} from "@/lib/openai";
import { storeImageBuffer, downloadImageToBuffer } from "@/lib/imageStorage";
import { loadStoredImage } from "@/lib/imageTools";
import {
  composeCoverPrompt,
  composeScenePrompt,
  parseBible,
  parseScene,
} from "@/lib/story/engine";
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
  // Devolución del crédito si algo falla después de cobrarlo
  let refundOnError: (() => Promise<number>) | null = null;

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

    const bible = parseBible(book.bible);
    const scene = parseScene(page.scene);

    // Antes de pagar, regenerar la portada daría la imagen limpia por 1 crédito
    if (regenerateImage && bible && !book.unlockedAt) {
      return NextResponse.json(
        { error: "Desbloquea las ilustraciones antes de regenerar páginas" },
        { status: 400 },
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

    // Consumir créditos (atómico: falla si otro proceso los gastó antes)
    const referenceId = `${id}-page-${pageNumber}`;
    const consumed = await consumeCredits(
      book.userId,
      "PAGE_REGENERATION",
      referenceId,
    );
    if (!consumed) {
      return NextResponse.json(
        { error: "No tienes suficientes créditos", needsCredits: true },
        { status: 402 },
      );
    }
    refundOnError = () =>
      refundCredits(book.userId, CREDIT_COSTS.PAGE_REGENERATION, referenceId);

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
      // En v2 el prompt se compone desde la biblia y la escena, no desde el texto
      if (!bible) updates.imagePrompt = result.imagePrompt;

      if (customPrompt) {
        updates.promptOverride = customPrompt;
      }
    }

    // Regenerar imagen (motor v2): misma escena y mismas referencias, con el
    // ajuste pedido por el usuario añadido a la acción
    if (regenerateImage && bible && (scene || pageNumber === 1)) {
      const adjusted = customPrompt
        ? `
Adjustment requested by the family (keep everything else): ${customPrompt}`
        : "";
      const prompt =
        (pageNumber === 1
          ? composeCoverPrompt(bible, book.style)
          : composeScenePrompt(bible, scene!, book.style)) + adjusted;
      const ids = pageNumber === 1 ? bible.cover.characters : scene!.characters;
      const refs = (
        await Promise.all(
          ids.map((charId) => {
            const url = bible.characters.find((c) => c.id === charId)?.refUrl;
            return url ? loadStoredImage(url).catch(() => null) : null;
          }),
        )
      ).filter((b): b is Buffer => !!b);

      const imageBuffer = await generateIllustration(prompt, refs, "medium");
      const permanentUrl = await storeImageBuffer(
        imageBuffer,
        id,
        `page-${pageNumber}`,
      );
      updates.imageUrl = permanentUrl;
      updates.imagePrompt = prompt;
      if (customPrompt) updates.promptOverride = customPrompt;
      if (pageNumber === 1) {
        await prisma.book.update({
          where: { id },
          data: { coverImageUrl: permanentUrl },
        });
      }
      log.info({ bookId: id, pageNumber }, "Imagen regenerada (v2)");
    } else if (regenerateImage) {
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
    if (refundOnError) {
      try {
        await refundOnError();
        log.info("Crédito devuelto tras fallo de regeneración");
      } catch (refundError) {
        log.error({ err: refundError }, "Error devolviendo crédito");
      }
    }
    return NextResponse.json(
      { error: "Error al regenerar página" },
      { status: 500 },
    );
  }
}
