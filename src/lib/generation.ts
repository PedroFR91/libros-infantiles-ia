import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  generateIllustration,
  generateReferenceSheet,
} from "@/lib/openai";
import {
  composeCoverPrompt,
  composeReferencePrompt,
  composeScenePrompt,
  parseBible,
  parseScene,
  type StoryBible,
} from "@/lib/story/engine";
import { storeImageBuffer } from "@/lib/imageStorage";
import { loadStoredImage, watermarkPreview } from "@/lib/imageTools";
import { refundCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/stripe";
import { sendBookReadyEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("generation");

// ============================================
// Generación en segundo plano
// ============================================
// Corre dentro del proceso Node (contenedor propio, sin límite de tiempo por
// petición). Cada página se guarda al terminar, así el editor las muestra
// según salen consultando GET /api/books/[id]. Si el contenedor se reinicia a
// mitad, el cron fix-stuck-books pasa el libro a ERROR y devuelve los créditos.

const PARALLEL_PAGES = 3;
const running = new Set<string>(); // ilustraciones de pago en curso
const previews = new Map<string, Promise<void>>(); // portadas de muestra en curso

export type PhotoInput = { buffer: Buffer; mimeType: string };

export function isRunning(bookId: string): boolean {
  return running.has(bookId);
}

export function isPreviewRunning(bookId: string): boolean {
  return previews.has(bookId);
}

/** Portada de muestra gratis (referencias + portada con marca de agua) */
export function startPreview(bookId: string, photo?: PhotoInput | null) {
  if (previews.has(bookId)) return;
  const task = runPreview(bookId, photo)
    .catch((error) =>
      log.error({ err: error, bookId }, "Error en la portada de muestra"),
    )
    .finally(() => previews.delete(bookId));
  previews.set(bookId, task);
}

/**
 * Ilustraciones de pago. El llamante ya ha cobrado los créditos y marcado el
 * libro como GENERATING; aquí se devuelven si algo falla.
 */
export function startIllustrations(bookId: string, userId: string) {
  if (running.has(bookId)) return;
  running.add(bookId);
  void runIllustrations(bookId, userId)
    .catch(async (error) => {
      if (error instanceof GenerationTakenOver) {
        log.warn({ bookId }, "El cron ya cerró este libro; generación detenida");
        return;
      }
      log.error({ err: error, bookId }, "Fallo total generando ilustraciones");
      // Solo quien pasa el libro de GENERATING a ERROR devuelve los créditos
      // (el cron puede haberlo hecho ya)
      const closed = await prisma.book.updateMany({
        where: { id: bookId, status: "GENERATING" },
        data: { status: "ERROR" },
      });
      if (closed.count === 1) {
        await refundCredits(userId, CREDIT_COSTS.BOOK_GENERATION, bookId).catch(
          (refundError) =>
            log.error({ err: refundError, bookId }, "Error devolviendo créditos"),
        );
      }
    })
    .finally(() => running.delete(bookId));
}

// ============================================
// Implementación
// ============================================

async function runPreview(bookId: string, photo?: PhotoInput | null) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  const bible = parseBible(book?.bible);
  if (!book || !bible || book.coverPreviewUrl) return;

  const refs = await ensureReferences(bookId, book.style, bible, photo);
  const cover = await generateCover(bookId, book.style, bible, refs);

  const preview = await watermarkPreview(cover);
  const previewUrl = await storeImageBuffer(preview, bookId, "cover-preview", "jpg");
  const coverUrl = await storeImageBuffer(cover, bookId, "cover");

  // Si ya pagó mientras se generaba la muestra, la portada va limpia
  const fresh = await prisma.book.findUnique({
    where: { id: bookId },
    select: { unlockedAt: true },
  });
  await prisma.$transaction([
    prisma.book.update({
      where: { id: bookId },
      data: { coverPreviewUrl: previewUrl, coverImageUrl: coverUrl },
    }),
    prisma.bookPage.updateMany({
      where: { bookId, pageNumber: 1 },
      data: {
        imageUrl: fresh?.unlockedAt ? coverUrl : previewUrl,
        thumbnailUrl: fresh?.unlockedAt ? coverUrl : previewUrl,
      },
    }),
  ]);
  log.info({ bookId }, "Portada de muestra lista");
}

async function runIllustrations(bookId: string, userId: string) {
  // Si paga mientras se genera la muestra, esperar y reutilizar sus
  // referencias y su portada en lugar de generarlas dos veces
  await previews.get(bookId);

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book) return;

  const bible = parseBible(book.bible);
  const refs = bible
    ? await ensureReferences(bookId, book.style, bible, null)
    : await legacyReference(book.characterImageUrl);
  await heartbeat(bookId);

  // Portada: la limpia de la muestra si existe; si no, se genera ahora
  const coverPage = book.pages.find((p) => p.pageNumber === 1);
  if (coverPage) {
    let coverUrl = book.coverImageUrl;
    if (!coverUrl && bible) {
      const cover = await generateCover(bookId, book.style, bible, refs);
      coverUrl = await storeImageBuffer(cover, bookId, "cover");
      await prisma.book.update({
        where: { id: bookId },
        data: { coverImageUrl: coverUrl },
      });
    }
    if (coverUrl) {
      await prisma.bookPage.update({
        where: { id: coverPage.id },
        data: { imageUrl: coverUrl, thumbnailUrl: coverUrl },
      });
    }
    await heartbeat(bookId);
  }

  // En v2 la portada ya se ha resuelto arriba; en v1 es una página más
  const pending = book.pages.filter(
    (p) => !p.imageUrl && (p.pageNumber !== 1 || !bible),
  );

  const failedPages: number[] = [];
  let generated = 0;

  await runPool(pending, PARALLEL_PAGES, async (page) => {
    try {
      const scene = parseScene(page.scene);
      const prompt =
        bible && scene
          ? composeScenePrompt(bible, scene, book.style)
          : page.imagePrompt || "";
      const pageRefs = bible && scene
        ? scene.characters
            .map((id) => refs.get(id))
            .filter((b): b is Buffer => !!b)
        : [...refs.values()];

      const image = await withRetry(() =>
        generateIllustration(prompt, pageRefs, "medium"),
      );
      const url = await storeImageBuffer(image, bookId, `page-${page.pageNumber}`);
      await prisma.bookPage.update({
        where: { id: page.id },
        data: { imageUrl: url, thumbnailUrl: url, imagePrompt: prompt },
      });
      generated++;
      await heartbeat(bookId);
    } catch (error) {
      if (error instanceof GenerationTakenOver) throw error;
      log.error({ err: error, bookId, page: page.pageNumber }, "Página fallida");
      failedPages.push(page.pageNumber);
    }
  });

  if (generated === 0 && pending.length > 0) {
    throw new Error("No se pudo generar ninguna ilustración");
  }

  // Cerrar solo si sigue en GENERATING (si el cron lo pasó a ERROR ya devolvió)
  const completed = await prisma.book.updateMany({
    where: { id: bookId, status: "GENERATING" },
    data: { status: "COMPLETED" },
  });
  if (completed.count === 0) throw new GenerationTakenOver();
  log.info({ bookId, generated, failed: failedPages.length }, "Libro completado");

  // Fallo parcial: 1 crédito por página fallida (lo que cuesta regenerarla)
  if (failedPages.length > 0) {
    const refund = Math.min(
      failedPages.length * CREDIT_COSTS.PAGE_REGENERATION,
      CREDIT_COSTS.BOOK_GENERATION,
    );
    await refundCredits(userId, refund, bookId).catch((error) =>
      log.error({ err: error, bookId }, "Error devolviendo créditos parciales"),
    );
    log.warn({ bookId, failedPages, refund }, "Libro con páginas sin ilustrar");
  }

  // Un fallo del email no debe tumbar un libro ya terminado
  await notifyReady(bookId).catch((error) =>
    log.error({ err: error, bookId }, "Error enviando el email de libro listo"),
  );
}

/** El cron dio el libro por atascado mientras esta generación seguía viva */
class GenerationTakenOver extends Error {}

/**
 * Refresca updatedAt (el cron considera atascado >15 min sin cambios) y
 * comprueba que el libro sigue siendo nuestro
 */
async function heartbeat(bookId: string) {
  const alive = await prisma.book.updateMany({
    where: { id: bookId, status: "GENERATING" },
    data: { status: "GENERATING" },
  });
  if (alive.count === 0) throw new GenerationTakenOver();
}

/** Genera las hojas de referencia que falten y devuelve id → imagen */
async function ensureReferences(
  bookId: string,
  style: string,
  bible: StoryBible,
  photo?: PhotoInput | null,
): Promise<Map<string, Buffer>> {
  const refs = new Map<string, Buffer>();

  await Promise.all(
    bible.characters.map(async (character) => {
      if (character.refUrl) {
        try {
          refs.set(character.id, await loadStoredImage(character.refUrl));
          return;
        } catch (error) {
          log.warn({ err: error, bookId, character: character.id }, "Referencia perdida, se regenera");
        }
      }
      const usePhoto = character.role === "protagonist" && photo ? photo : null;
      const prompt = composeReferencePrompt(character, style, !!usePhoto);
      const image = await withRetry(() => generateReferenceSheet(prompt, usePhoto));
      character.refUrl = await storeImageBuffer(image, bookId, `ref-${character.id}`);
      refs.set(character.id, image);
    }),
  );

  const protagonist = bible.characters.find((c) => c.role === "protagonist");
  await prisma.book.update({
    where: { id: bookId },
    data: {
      bible: bible as unknown as Prisma.InputJsonValue,
      ...(protagonist?.refUrl && { characterImageUrl: protagonist.refUrl }),
    },
  });
  return refs;
}

async function generateCover(
  bookId: string,
  style: string,
  bible: StoryBible,
  refs: Map<string, Buffer>,
): Promise<Buffer> {
  const coverRefs = bible.cover.characters
    .map((id) => refs.get(id))
    .filter((b): b is Buffer => !!b);
  log.info({ bookId }, "Generando portada");
  return withRetry(() =>
    generateIllustration(composeCoverPrompt(bible, style), coverRefs, "medium"),
  );
}

// Libros del motor v1: una sola referencia del protagonista
async function legacyReference(url: string | null): Promise<Map<string, Buffer>> {
  const refs = new Map<string, Buffer>();
  if (url) {
    try {
      refs.set("prota", await loadStoredImage(url));
    } catch (error) {
      log.warn({ err: error }, "Referencia v1 no disponible");
    }
  }
  return refs;
}

async function notifyReady(bookId: string) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: {
      user: {
        select: {
          email: true,
          payments: {
            where: { status: "COMPLETED", customerEmail: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { customerEmail: true },
          },
        },
      },
    },
  });
  if (!book || book.readyEmailSentAt) return;

  const to =
    book.user.email ?? book.user.payments[0]?.customerEmail ?? book.leadEmail;
  if (!to) return;

  const sent = await sendBookReadyEmail({
    to,
    kidName: book.kidName,
    title: book.title || `El libro de ${book.kidName}`,
    bookId,
  });
  if (sent) {
    await prisma.book.update({
      where: { id: bookId },
      data: { readyEmailSentAt: new Date() },
    });
  }
}

// ============================================
// Utilidades
// ============================================

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
) {
  let index = 0;
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      await worker(item);
    }
  });
  await Promise.all(lanes);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }
  throw lastError;
}
