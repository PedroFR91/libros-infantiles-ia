import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateIllustration } from "@/lib/openai";
import { parseBible, parseScene, type StoryBible } from "@/lib/story/engine";
import {
  ensureReferenceSheets,
  renderScene,
  withRetry,
} from "@/lib/story/illustrate";
import { QA_MAX_RETRIES } from "@/lib/story/qualityCheck";
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
//
// Calidad (REVISION-PRODUCTO-2026-10 §5):
// - Referencias en orden fijo (protagonista primero) y nombradas en el prompt.
// - Secundarios generados por edición desde la hoja del protagonista.
// - Portada en calidad "high" y usada como ancla de estilo (última referencia)
//   en todas las páginas.
// - Control de calidad por visión de cada página; si no pasa, se rehace solo
//   esa página (máx. QA_MAX_RETRIES) y si persiste se deja la mejor + log.warn.
//
// Coste estimado por libro con gpt-image-1 (1024², 2 personajes de media):
//   texto (gpt-4.1: biblia + páginas + revisión + pulido) ......... ≈ 0,12 $
//   hojas de referencia (2 × medium + entradas) ................... ≈ 0,15 $
//   portada high (0,167 $ + 2 referencias) ........................ ≈ 0,23 $
//   12 páginas medium (0,042 $ + ~3 entradas × ~0,03 $) ........... ≈ 1,50 $
//   QA por visión (13 × gpt-4.1-mini) ............................. ≈ 0,04 $
//   reintentos por QA (≈20 % de páginas) .......................... ≈ 0,30 $
//   TOTAL ≈ 2,3-2,5 $ por libro (antes ≈ 1,6-1,8 $). La portada de muestra
//   gratis (referencias + portada high, máx. 1 reintento) ≈ 0,40-0,65 $.
//   Con gpt-image-2 (sin input_fidelity) debería quedar ≈ 1,6-2 $: medir con
//   scripts/eval-engine.ts --full antes de cambiar IMAGE_MODEL.

const PARALLEL_PAGES = 3;
const running = new Set<string>(); // ilustraciones de pago en curso
const previews = new Map<string, Promise<void>>(); // portadas de muestra en curso
const photoRefs = new Map<string, Promise<void>>(); // hojas con foto sin muestra

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
 * Si no hay portada de muestra (tope diario), al menos se hace ya la hoja del
 * protagonista con la foto: la foto no se guarda y al pagar ya no estaría.
 */
export function startPhotoReference(bookId: string, photo: PhotoInput) {
  if (previews.has(bookId) || photoRefs.has(bookId)) return;
  const task = runPhotoReference(bookId, photo)
    .catch((error) =>
      log.error({ err: error, bookId }, "Error en la hoja de referencia con foto"),
    )
    .finally(() => photoRefs.delete(bookId));
  photoRefs.set(bookId, task);
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

  const refs = await ensureReferences(bookId, book, bible, photo);
  // Muestra gratis: como mucho 1 reintento por QA para acotar el coste
  const cover = await generateCover(
    bookId,
    book.style,
    bible,
    refs,
    Math.min(1, QA_MAX_RETRIES),
  );

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

async function runPhotoReference(bookId: string, photo: PhotoInput) {
  const book = await prisma.book.findUnique({ where: { id: bookId } });
  const bible = parseBible(book?.bible);
  const protagonist = bible?.characters.find((c) => c.role === "protagonist");
  if (!book || !bible || !protagonist || protagonist.refUrl) return;
  await ensureReferences(bookId, book, bible, photo, [protagonist.id]);
  log.info({ bookId }, "Hoja del protagonista con foto lista");
}

async function runIllustrations(bookId: string, userId: string) {
  // Si paga mientras se genera la muestra (o la hoja con foto), esperar y
  // reutilizar sus referencias y su portada en lugar de generarlas dos veces
  await previews.get(bookId);
  await photoRefs.get(bookId);

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book) return;

  const bible = parseBible(book.bible);
  // Sin foto: si la hoja hecha con foto se perdió, ensureReferenceSheets
  // avisa y la rehace con los rasgos en texto (Book.characterDescription)
  const refs = bible
    ? await ensureReferences(bookId, book, bible, null)
    : await legacyReference(book.characterImageUrl);
  await heartbeat(bookId);

  // Portada: la limpia de la muestra si existe; si no, se genera ahora.
  // En v2 es además el ancla de estilo de todas las páginas.
  let styleAnchor: Buffer | null = null;
  const coverPage = book.pages.find((p) => p.pageNumber === 1);
  if (coverPage) {
    let coverUrl = book.coverImageUrl;
    if (coverUrl && bible) {
      styleAnchor = await loadStoredImage(coverUrl).catch((error) => {
        log.warn({ err: error, bookId }, "Portada no disponible como ancla de estilo");
        return null;
      });
    }
    if (!coverUrl && bible) {
      const cover = await generateCover(bookId, book.style, bible, refs, QA_MAX_RETRIES);
      styleAnchor = cover;
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
      let image: Buffer;
      let prompt: string;
      if (bible && scene) {
        const rendered = await renderScene({
          bible,
          style: book.style,
          scene,
          refs,
          styleAnchor,
          quality: "medium",
          beforeRetry: () => heartbeat(bookId),
          context: { bookId, page: page.pageNumber },
        });
        image = rendered.image;
        prompt = rendered.prompt;
      } else {
        // Libros del motor v1: prompt guardado y la referencia del protagonista
        prompt = page.imagePrompt || "";
        const pageRefs = [...refs.values()];
        image = await withRetry(() =>
          generateIllustration(prompt, pageRefs, "medium"),
        );
      }
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
  book: { style: string; characterDescription: string | null },
  bible: StoryBible,
  photo?: PhotoInput | null,
  onlyIds?: string[],
): Promise<Map<string, Buffer>> {
  const refs = await ensureReferenceSheets({
    bible,
    style: book.style,
    photo,
    traits: book.characterDescription,
    onlyIds,
    load: loadStoredImage,
    store: (character, image) =>
      storeImageBuffer(image, bookId, `ref-${character.id}`),
    context: { bookId },
  });

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

/** Portada en calidad alta: es la cara del libro y el ancla de estilo */
async function generateCover(
  bookId: string,
  style: string,
  bible: StoryBible,
  refs: Map<string, Buffer>,
  maxRetries: number,
): Promise<Buffer> {
  log.info({ bookId }, "Generando portada");
  const rendered = await renderScene({
    bible,
    style,
    cover: true,
    refs,
    quality: "high",
    maxRetries,
    context: { bookId, page: 1 },
  });
  return rendered.image;
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
