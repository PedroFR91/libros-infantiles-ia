import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  hasEnoughCredits,
  consumeCredits,
  refundCredits,
} from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/stripe";
import {
  generateCharacterImage,
  generateImageWithReference,
  generateImage,
} from "@/lib/openai";
import { storeImageBuffer, downloadImageToBuffer } from "@/lib/imageStorage";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger("generate-images");

/** Reintenta una operación una vez (errores transitorios de OpenAI/red) */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn();
  } catch (firstError) {
    log.warn({ err: firstError, label }, "Fallo, reintentando una vez");
    return await fn();
  }
}

// POST /api/books/[id]/generate-images - Generar imágenes para un libro - CUESTA CRÉDITOS
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Autenticación centralizada (NextAuth + fallback sessionId)
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResponse = checkRateLimit(
      `genimg:${userId}`,
      RATE_LIMIT_PRESETS.generation,
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Obtener libro del usuario con páginas
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

    // Verificar que tiene páginas
    if (!book.pages || book.pages.length === 0) {
      return NextResponse.json(
        { error: "El libro no tiene historia. Genera la historia primero." },
        { status: 400 },
      );
    }

    // Verificar si ya tiene todas las imágenes
    const pagesWithoutImages = book.pages.filter((p) => !p.imageUrl);
    if (pagesWithoutImages.length === 0) {
      return NextResponse.json(
        { error: "Todas las páginas ya tienen imágenes." },
        { status: 400 },
      );
    }

    if (book.status === "GENERATING") {
      return NextResponse.json(
        { error: "El libro ya está siendo generado" },
        { status: 400 },
      );
    }

    // Verificar créditos
    const hasCredits = await hasEnoughCredits(userId, "BOOK_GENERATION");
    if (!hasCredits) {
      return NextResponse.json(
        {
          error:
            "No tienes suficientes créditos. Compra un pack para continuar.",
          needsCredits: true,
        },
        { status: 402 },
      );
    }

    // Marcar como generando
    await prisma.book.update({
      where: { id },
      data: { status: "GENERATING" },
    });

    let creditsConsumed = false;
    try {
      // Consumir créditos AHORA (atómico: falla si otro proceso los gastó antes)
      creditsConsumed = await consumeCredits(userId, "BOOK_GENERATION", id);
      if (!creditsConsumed) {
        await prisma.book.update({
          where: { id },
          data: { status: "DRAFT" },
        });
        return NextResponse.json(
          {
            error:
              "No tienes suficientes créditos. Compra un pack para continuar.",
            needsCredits: true,
          },
          { status: 402 },
        );
      }

      // ── Step 1: Character reference image for consistency ──
      const artStyle = book.style || "cartoon";
      let characterBuffer: Buffer | null = null;

      // Try to reuse an existing character reference
      if (book.characterImageUrl) {
        try {
          characterBuffer = await downloadImageToBuffer(book.characterImageUrl);
          log.info(
            { bookId: id },
            "Reutilizando imagen de referencia existente",
          );
        } catch {
          log.warn(
            { bookId: id },
            "No se pudo descargar referencia existente, generando nueva",
          );
        }
      }

      // Generate a fresh character reference if we don't have one
      if (!characterBuffer && book.characterDescription) {
        const characterDescription = book.characterDescription;
        try {
          characterBuffer = await withRetry(
            () => generateCharacterImage(characterDescription, artStyle),
            "character-ref",
          );
          const characterUrl = await storeImageBuffer(
            characterBuffer,
            id,
            "character-ref",
          );
          await prisma.book.update({
            where: { id },
            data: { characterImageUrl: characterUrl },
          });
          log.info(
            { bookId: id },
            "Character reference image generated & stored",
          );
        } catch (error) {
          // Seguimos sin referencia: las páginas se generan solo con el prompt
          log.error(
            { err: error, bookId: id },
            "Error generando imagen de referencia, continuando sin ella",
          );
        }
      }

      // ── Step 2: Generate page illustrations with reference ──
      let generated = 0;
      const failedPages: number[] = [];

      for (const page of pagesWithoutImages) {
        const imagePrompt = page.imagePrompt;
        if (!imagePrompt) {
          log.warn(
            { bookId: id, page: page.pageNumber },
            "Sin imagePrompt, saltando",
          );
          failedPages.push(page.pageNumber);
          continue;
        }

        try {
          log.info({ bookId: id, page: page.pageNumber }, "Generando imagen");

          const imageBuffer = await withRetry(
            () =>
              characterBuffer
                ? generateImageWithReference(imagePrompt, characterBuffer)
                : generateImage(imagePrompt),
            `page-${page.pageNumber}`,
          );

          const permanentUrl = await storeImageBuffer(
            imageBuffer,
            id,
            `page-${page.pageNumber}`,
          );

          await prisma.bookPage.update({
            where: { id: page.id },
            data: {
              imageUrl: permanentUrl,
              thumbnailUrl: permanentUrl,
            },
          });

          generated++;
          log.info({ bookId: id, page: page.pageNumber }, "Imagen guardada");
        } catch (error) {
          log.error(
            { err: error, bookId: id, page: page.pageNumber },
            "Error generando imagen",
          );
          failedPages.push(page.pageNumber);
          // Continuar con las demás páginas
        }
      }

      // Si no se generó NADA, es un fallo total: ERROR + devolución completa
      if (generated === 0) {
        throw new Error("No se pudo generar ninguna ilustración");
      }

      // Fallo parcial: devolvemos 1 crédito por página fallida (lo que cuesta
      // regenerarla) para que el usuario no pague por páginas en blanco.
      let refunded = 0;
      if (failedPages.length > 0) {
        refunded = Math.min(
          failedPages.length * CREDIT_COSTS.PAGE_REGENERATION,
          CREDIT_COSTS.BOOK_GENERATION,
        );
        try {
          await refundCredits(userId, refunded, id);
        } catch (refundError) {
          log.error(
            { err: refundError, bookId: id },
            "Error devolviendo créditos por páginas fallidas",
          );
        }
        log.warn(
          { bookId: id, failedPages, refunded },
          "Libro completado con páginas sin ilustración",
        );
      }

      // Marcar como completado
      await prisma.book.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // Retornar libro completo
      const completedBook = await prisma.book.findUnique({
        where: { id },
        include: {
          pages: {
            orderBy: { pageNumber: "asc" },
          },
        },
      });

      return NextResponse.json({
        book: completedBook,
        failedPages,
        refundedCredits: refunded,
        message:
          failedPages.length > 0
            ? `Ilustraciones generadas. ${failedPages.length} página(s) no pudieron ilustrarse; te hemos devuelto ${refunded} crédito(s) para regenerarlas.`
            : "Ilustraciones generadas exitosamente",
      });
    } catch (error) {
      // Si falla, marcar como error y devolver los créditos cobrados
      await prisma.book.update({
        where: { id },
        data: { status: "ERROR" },
      });

      if (creditsConsumed) {
        try {
          await refundCredits(userId, CREDIT_COSTS.BOOK_GENERATION, id);
          log.info({ bookId: id }, "Créditos devueltos tras fallo");
        } catch (refundError) {
          log.error(
            { err: refundError, bookId: id },
            "Error devolviendo créditos",
          );
        }
      }

      throw error;
    }
  } catch (error) {
    log.error({ err: error }, "Error generando imágenes");
    return NextResponse.json(
      { error: "Error al generar ilustraciones" },
      { status: 500 },
    );
  }
}
