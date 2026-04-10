import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
import {
  generateStoryText,
  generateCharacterImage,
  generateImageWithReference,
  generateImage,
} from "@/lib/openai";
import { storeImageBuffer } from "@/lib/imageStorage";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger("generate");

// POST /api/books/[id]/generate - Generar libro completo
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

    // Rate limiting: máximo 5 generaciones por minuto por usuario
    const rateLimitResponse = checkRateLimit(
      `gen:${userId}`,
      RATE_LIMIT_PRESETS.generation,
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Obtener libro del usuario
    const book = await prisma.book.findFirst({
      where: {
        id,
        userId,
      },
      include: { user: true },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    if (book.status === "GENERATING") {
      return NextResponse.json(
        { error: "El libro ya está siendo generado" },
        { status: 400 },
      );
    }

    // Verificar si ya hay páginas generadas
    const existingPages = await prisma.bookPage.count({
      where: { bookId: id },
    });

    if (book.status === "COMPLETED" && existingPages > 0) {
      return NextResponse.json(
        {
          error:
            "El libro ya fue generado. Usa regenerar página para modificar.",
        },
        { status: 400 },
      );
    }

    // Verificar créditos
    const hasCredits = await hasEnoughCredits(book.userId, "BOOK_GENERATION");
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
      // Consumir créditos
      await consumeCredits(book.userId, "BOOK_GENERATION", id);

      // Obtener estilo artístico del libro (por defecto cartoon)
      const artStyle = (book as { style?: string }).style || "cartoon";

      // Generar historia con characterSheet para consistencia
      const story = await generateStoryText(
        book.kidName,
        book.theme,
        [],
        (book as { characterDescription?: string | null }).characterDescription,
        artStyle,
      );

      log.info({ bookId: id }, "Character Sheet generado");

      // Actualizar título y guardar characterSheet
      await prisma.book.update({
        where: { id },
        data: {
          title: story.title,
          // Guardar characterSheet en metadatos del libro si el campo existe
          ...(story.characterSheet && {
            characterDescription: story.characterSheet,
          }),
        },
      });

      // ── Character reference image for consistency ──
      let characterBuffer: Buffer | null = null;
      if (story.characterSheet) {
        try {
          characterBuffer = await generateCharacterImage(
            story.characterSheet,
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
          log.info({ bookId: id }, "Character reference image generated");
        } catch (error) {
          log.error(
            { err: error, bookId: id },
            "Error generando imagen de referencia, continuando sin ella",
          );
        }
      }

      // ── Generate page illustrations ──
      const pagePromises = story.pages.map(async (page) => {
        let imageUrl = null;
        let thumbnailUrl = null;

        try {
          log.info({ bookId: id, page: page.pageNumber }, "Generando imagen");

          const imageBuffer = characterBuffer
            ? await generateImageWithReference(
                page.imagePrompt,
                characterBuffer,
              )
            : await generateImage(page.imagePrompt);

          imageUrl = await storeImageBuffer(
            imageBuffer,
            id,
            `page-${page.pageNumber}`,
          );
          thumbnailUrl = imageUrl;
          log.info({ bookId: id, page: page.pageNumber }, "Imagen guardada");
        } catch (error) {
          log.error(
            { err: error, bookId: id, page: page.pageNumber },
            "Error generando imagen",
          );
        }

        return prisma.bookPage.create({
          data: {
            bookId: id,
            pageNumber: page.pageNumber,
            text: page.text,
            imagePrompt: page.imagePrompt,
            imageUrl,
            thumbnailUrl,
          },
        });
      });

      // Ejecutar en paralelo (máximo 2 a la vez para mejor consistencia)
      const batchSize = 2;
      const pages = [];
      for (let i = 0; i < pagePromises.length; i += batchSize) {
        const batch = pagePromises.slice(i, i + batchSize);
        const results = await Promise.all(batch);
        pages.push(...results);
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
        message: "Libro generado exitosamente",
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
    log.error({ err: error }, "Error generando libro");
    return NextResponse.json(
      { error: "Error al generar libro" },
      { status: 500 },
    );
  }
}
