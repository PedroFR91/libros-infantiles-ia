import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { consumeCredits, refundCredits } from "@/lib/credits";
import { CREDIT_COSTS } from "@/lib/stripe";
import {
  regeneratePageText as regenerateLegacyPageText,
  generateImageWithReference,
  generateImage,
  isFlaggedContent,
} from "@/lib/openai";
import { storeImageBuffer, downloadImageToBuffer } from "@/lib/imageStorage";
import { loadStoredImage } from "@/lib/imageTools";
import {
  parseBible,
  parseGender,
  parseScene,
  regeneratePageText,
  type StoryBible,
} from "@/lib/story/engine";
import {
  checkIntellectualProperty,
  ipErrorMessage,
} from "@/lib/story/contentSafety";
import { renderScene } from "@/lib/story/illustrate";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import {
  AGE_RANGES,
  regeneratePageSchema,
  validateBody,
  type AgeRange,
} from "@/lib/validation";
import { createLogger } from "@/lib/logger";
import { isAdminUser } from "@/lib/adminAuth";

const log = createLogger("regenerate");

// POST /api/books/[id]/pages/[pageNumber]/regenerate - Rehacer una página
//
// - Por defecto SOLO la imagen; el texto solo si llega regenerateText: true
//   (en libros v2 se reescribe con la biblia, la edad y las reglas del motor).
// - El ajuste libre (customPrompt) pasa por el filtro de propiedad
//   intelectual y por la moderación antes de usarse.
// - Garantía: rehacer un dibujo gasta primero Book.freeRedraws (decremento
//   atómico) y solo cuando no quedan cobra 1 crédito. La respuesta incluye
//   freeRedrawsLeft.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pageNumber: string }> },
) {
  // Devolución (crédito o redibujo gratis) si algo falla después de cobrar
  let refundOnError: (() => Promise<unknown>) | null = null;

  try {
    const { id, pageNumber: pageNumberStr } = await params;
    const pageNumber = parseInt(pageNumberStr, 10);
    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return NextResponse.json({ error: "Página no válida" }, { status: 400 });
    }
    const body: unknown = await request.json().catch(() => ({}));

    const validation = validateBody(regeneratePageSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { customPrompt, regenerateImage = true } = validation.data;
    // Solo imagen salvo que se pida el texto explícitamente
    const wantsText =
      !!body &&
      typeof body === "object" &&
      (body as { regenerateText?: unknown }).regenerateText === true;

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rateLimitResponse = checkRateLimit(
      `regen:${userId}`,
      RATE_LIMIT_PRESETS.generation,
    );
    if (rateLimitResponse) return rateLimitResponse;

    // Ajuste libre: propiedad intelectual y moderación antes de nada
    const instruction = customPrompt?.trim() || "";
    if (instruction) {
      const ipMatch = checkIntellectualProperty({ customPrompt: instruction });
      if (ipMatch) {
        return NextResponse.json(
          { error: ipErrorMessage(ipMatch), field: "customPrompt" },
          { status: 400 },
        );
      }
      if (await isFlaggedContent(instruction)) {
        return NextResponse.json(
          {
            error:
              "El ajuste contiene algo que no podemos usar en un cuento infantil. Prueba con otras palabras.",
          },
          { status: 400 },
        );
      }
    }

    const book = await prisma.book.findFirst({
      where: { id, userId },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });
    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }

    const page = book.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) {
      return NextResponse.json({ error: "Página no encontrada" }, { status: 404 });
    }

    const bible = parseBible(book.bible);
    const scene = parseScene(page.scene);
    // La portada de un libro v2 no tiene texto que reescribir (es el título)
    const regenerateText = wantsText && !(bible && pageNumber === 1);

    if (!regenerateImage && !regenerateText) {
      return NextResponse.json(
        { error: "No hay nada que regenerar en esta página" },
        { status: 400 },
      );
    }

    // Antes de pagar, regenerar la portada daría la imagen limpia gratis
    if (regenerateImage && bible && !book.unlockedAt) {
      return NextResponse.json(
        { error: "Desbloquea las ilustraciones antes de regenerar páginas" },
        { status: 400 },
      );
    }

    // Cobro: primero un redibujo gratis (garantía); si no quedan, 1 crédito
    let usedFreeRedraw = false;
    const admin = await isAdminUser(userId);
    if (regenerateImage && !admin) {
      const free = await prisma.book.updateMany({
        where: { id, userId, freeRedraws: { gt: 0 } },
        data: { freeRedraws: { decrement: 1 } },
      });
      usedFreeRedraw = free.count === 1;
    }
    const referenceId = `${id}-page-${pageNumber}`;
    if (admin) {
      // sin cobro
    } else if (usedFreeRedraw) {
      refundOnError = () =>
        prisma.book.update({
          where: { id },
          data: { freeRedraws: { increment: 1 } },
        });
    } else {
      // Atómico: falla si otro proceso gastó los créditos antes
      const consumed = await consumeCredits(
        book.userId,
        "PAGE_REGENERATION",
        referenceId,
      );
      if (!consumed) {
        return NextResponse.json(
          {
            error: "No tienes suficientes créditos",
            needsCredits: true,
            freeRedrawsLeft: 0,
          },
          { status: 402 },
        );
      }
      refundOnError = () =>
        refundCredits(book.userId, CREDIT_COSTS.PAGE_REGENERATION, referenceId);
    }

    const updates: Prisma.BookPageUpdateInput = {};
    let imageScene = scene;

    // ---------- Texto ----------
    if (regenerateText) {
      if (bible) {
        const ageRange: AgeRange = (AGE_RANGES as readonly string[]).includes(
          book.ageRange ?? "",
        )
          ? (book.ageRange as AgeRange)
          : (bible.ageRange ?? "5-6");
        const result = await regeneratePageText({
          bible,
          pages: book.pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text })),
          pageNumber,
          ageRange,
          gender: parseGender(book.gender) ?? bible.gender ?? null,
          instruction,
        });
        updates.text = result.text;
        // La escena solo cambia si también se rehace el dibujo (si no, no
        // cuadraría con la imagen actual)
        if (regenerateImage) {
          imageScene = result.scene;
          updates.scene = result.scene as unknown as Prisma.InputJsonValue;
        }
      } else {
        // Libros del motor v1 (sin biblia)
        const result = await regenerateLegacyPageText(
          book.kidName,
          book.theme,
          pageNumber,
          page.text || "",
          book.characterDescription || "",
          book.style || "cartoon",
          instruction || undefined,
        );
        updates.text = result.text;
        updates.imagePrompt = result.imagePrompt;
      }
      if (instruction) updates.promptOverride = instruction;
    }

    // ---------- Imagen ----------
    if (regenerateImage && bible && (imageScene || pageNumber === 1)) {
      const isCover = pageNumber === 1;
      const refs = await loadReferences(bible, id);
      // La portada es el ancla de estilo de las demás páginas
      const styleAnchor =
        !isCover && book.coverImageUrl
          ? await loadStoredImage(book.coverImageUrl).catch(() => null)
          : null;

      const rendered = await renderScene({
        bible,
        style: book.style,
        scene: imageScene,
        cover: isCover,
        refs,
        styleAnchor,
        quality: isCover ? "high" : "medium",
        adjustment: instruction,
        // Petición síncrona: sin reintentos por QA (el resultado queda en el
        // log para revisión y la familia puede volver a rehacerla)
        maxRetries: 0,
        context: { bookId: id, page: pageNumber, regenerate: true },
      });
      const permanentUrl = await storeImageBuffer(
        rendered.image,
        id,
        `page-${pageNumber}`,
      );
      updates.imageUrl = permanentUrl;
      updates.thumbnailUrl = permanentUrl;
      updates.imagePrompt = rendered.prompt;
      if (instruction) updates.promptOverride = instruction;
      if (isCover) {
        await prisma.book.update({
          where: { id },
          data: { coverImageUrl: permanentUrl },
        });
      }
      log.info(
        { bookId: id, pageNumber, qa: rendered.qa, usedFreeRedraw },
        "Imagen regenerada (v2)",
      );
    } else if (regenerateImage) {
      const prompt =
        (typeof updates.imagePrompt === "string" ? updates.imagePrompt : null) ||
        page.imagePrompt;
      if (!prompt) throw new Error("La página no tiene prompt de imagen");

      let characterBuffer: Buffer | null = null;
      if (book.characterImageUrl) {
        try {
          characterBuffer = await downloadImageToBuffer(book.characterImageUrl);
        } catch {
          log.warn({ bookId: id }, "Referencia del personaje no disponible");
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
      log.info({ bookId: id, pageNumber, usedFreeRedraw }, "Imagen regenerada");
    }

    const updatedPage = await prisma.bookPage.update({
      where: { id: page.id },
      data: updates,
    });

    // Invalidar PDFs cacheados
    const fresh = await prisma.book.update({
      where: { id },
      data: { digitalPdfUrl: null, printPdfUrl: null },
      select: { freeRedraws: true },
    });

    return NextResponse.json({
      page: updatedPage,
      message: "Página regenerada exitosamente",
      usedFreeRedraw,
      freeRedrawsLeft: fresh.freeRedraws,
      creditsCharged: usedFreeRedraw ? 0 : CREDIT_COSTS.PAGE_REGENERATION,
    });
  } catch (error) {
    log.error({ err: error }, "Error regenerando página");
    if (refundOnError) {
      try {
        await refundOnError();
        log.info("Cobro devuelto tras fallo de regeneración");
      } catch (refundError) {
        log.error({ err: refundError }, "Error devolviendo el cobro");
      }
    }
    return NextResponse.json(
      { error: "Error al regenerar página" },
      { status: 500 },
    );
  }
}

/** Hojas de referencia guardadas (no se regeneran aquí) */
async function loadReferences(
  bible: StoryBible,
  bookId: string,
): Promise<Map<string, Buffer>> {
  const refs = new Map<string, Buffer>();
  await Promise.all(
    bible.characters.map(async (character) => {
      if (!character.refUrl) return;
      try {
        refs.set(character.id, await loadStoredImage(character.refUrl));
      } catch (error) {
        log.warn(
          { err: error, bookId, character: character.id },
          "Referencia no disponible al rehacer la página",
        );
      }
    }),
  );
  return refs;
}
