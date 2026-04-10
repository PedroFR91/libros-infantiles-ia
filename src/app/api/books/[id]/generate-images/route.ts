import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
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
    const pagesWithoutImages = book.pages.filter(
      (p: { imageUrl: string | null }) => !p.imageUrl,
    );
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

    try {
      // Consumir créditos AHORA (al generar imágenes)
      await consumeCredits(userId, "BOOK_GENERATION", id);

      // ── Step 1: Character reference image for consistency ──
      const artStyle = (book as { style?: string }).style || "cartoon";
      let characterBuffer: Buffer | null = null;

      // Try to reuse an existing character reference
      if ((book as { characterImageUrl?: string | null }).characterImageUrl) {
        try {
          characterBuffer = await downloadImageToBuffer(
            (book as { characterImageUrl: string }).characterImageUrl,
          );
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
      if (
        !characterBuffer &&
        (book as { characterDescription?: string | null }).characterDescription
      ) {
        characterBuffer = await generateCharacterImage(
          (book as { characterDescription: string }).characterDescription,
          artStyle,
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
      }

      // ── Step 2: Generate page illustrations with reference ──
      for (const page of pagesWithoutImages) {
        if (!page.imagePrompt) {
          log.warn(
            { bookId: id, page: page.pageNumber },
            "Sin imagePrompt, saltando",
          );
          continue;
        }

        try {
          log.info({ bookId: id, page: page.pageNumber }, "Generando imagen");

          const imageBuffer = characterBuffer
            ? await generateImageWithReference(
                page.imagePrompt,
                characterBuffer,
              )
            : await generateImage(page.imagePrompt);

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

          log.info({ bookId: id, page: page.pageNumber }, "Imagen guardada");
        } catch (error) {
          log.error(
            { err: error, bookId: id, page: page.pageNumber },
            "Error generando imagen",
          );
          // Continuar con las demás páginas
        }
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
        message: "Ilustraciones generadas exitosamente",
      });
    } catch (error) {
      // Si falla, marcar como error
      await prisma.book.update({
        where: { id },
        data: { status: "ERROR" },
      });

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
