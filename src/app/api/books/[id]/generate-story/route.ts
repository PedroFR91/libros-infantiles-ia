import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { createStory, composeScenePrompt, parseGender } from "@/lib/story/engine";
import {
  checkIntellectualProperty,
  ipErrorMessage,
} from "@/lib/story/contentSafety";
import { isFlaggedContent } from "@/lib/openai";
import {
  startPhotoReference,
  startPreview,
  type PhotoInput,
} from "@/lib/generation";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { AGE_RANGES, type AgeRange } from "@/lib/validation";
import { createLogger } from "@/lib/logger";
import { isAdminUser } from "@/lib/adminAuth";
import { toPublicBook } from "@/lib/bookView";

const log = createLogger("generate-story");

// Portadas de muestra gratis: tope por usuario y global para acotar el coste
// (≈0,40-0,65 $ cada una: hojas de referencia + portada en calidad high con
// control de calidad y como mucho 1 reintento; ver generation.ts)
const FREE_PREVIEWS_PER_USER_DAY = 3;
const FREE_PREVIEWS_PER_DAY = parseInt(
  process.env.FREE_PREVIEW_DAILY_LIMIT || "60",
  10,
);
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// POST /api/books/[id]/generate-story
// Crea la historia (gratis) con el motor v2. Acepta JSON vacío o multipart con
// "photo": la foto solo se usa en memoria para la hoja de referencia del
// protagonista y no se guarda.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rateLimitResponse = checkRateLimit(
      `story:${userId}`,
      RATE_LIMIT_PRESETS.generation,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const photo = await readPhoto(request);
    if (photo === "invalid") {
      return NextResponse.json(
        { error: "La foto debe ser JPG, PNG o WebP de menos de 10 MB" },
        { status: 400 },
      );
    }

    const book = await prisma.book.findFirst({ where: { id, userId } });
    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }

    const existingPages = await prisma.bookPage.count({ where: { bookId: id } });
    if (existingPages > 0) {
      const bookWithPages = await prisma.book.findUnique({
        where: { id },
        include: { pages: { orderBy: { pageNumber: "asc" } } },
      });
      return NextResponse.json({
        book: bookWithPages ? toPublicBook(bookWithPages) : null,
        message: "Historia ya generada anteriormente",
        alreadyGenerated: true,
      });
    }

    // La portada gratis cuesta dinero: se pide el email antes (para enviarle su
    // cuento). Quien ha iniciado sesión ya lo tiene; los administradores, no.
    if (!book.leadEmail) {
      const owner = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, role: true },
      });
      if (!owner?.email && owner?.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Dinos tu email para enviarte su cuento.", needsEmail: true },
          { status: 400 },
        );
      }
    }

    // Personajes y marcas con derechos (antes que la moderación: es local)
    const ipMatch = checkIntellectualProperty({
      theme: book.theme,
      companion: book.companion,
      dedication: book.dedication,
    });
    if (ipMatch) {
      log.info({ bookId: id, field: ipMatch.field, label: ipMatch.label }, "Tema con propiedad intelectual rechazado");
      return NextResponse.json(
        { error: ipErrorMessage(ipMatch), field: ipMatch.field },
        { status: 400 },
      );
    }

    const userText = [book.kidName, book.theme, book.companion, book.dedication]
      .filter(Boolean)
      .join("\n");
    if (await isFlaggedContent(userText)) {
      return NextResponse.json(
        {
          error:
            "El nombre, el tema o la dedicatoria contienen algo que no podemos usar en un cuento infantil. Prueba con otras palabras.",
        },
        { status: 400 },
      );
    }

    // Atómico: una segunda petición simultánea no escribe la historia dos veces
    const claimed = await prisma.book.updateMany({
      where: { id, status: { not: "GENERATING" } },
      data: { status: "GENERATING" },
    });
    if (claimed.count === 0) {
      return NextResponse.json(
        { error: "La historia ya se está escribiendo" },
        { status: 409 },
      );
    }

    try {
      const ageRange: AgeRange = (AGE_RANGES as readonly string[]).includes(
        book.ageRange ?? "",
      )
        ? (book.ageRange as AgeRange)
        : "5-6";

      const story = await createStory({
        kidName: book.kidName,
        theme: book.theme,
        ageRange,
        style: book.style,
        companion: book.companion,
        characterDescription: book.characterDescription,
        gender: parseGender(book.gender),
      });

      await prisma.$transaction([
        prisma.book.update({
          where: { id },
          data: {
            title: story.title,
            bible: story.bible as unknown as Prisma.InputJsonValue,
            ageRange,
            status: "DRAFT",
          },
        }),
        prisma.bookPage.createMany({
          data: story.pages.map((page) => ({
            bookId: id,
            pageNumber: page.pageNumber,
            text: page.text,
            scene: page.scene as unknown as Prisma.InputJsonValue,
            imagePrompt: composeScenePrompt(story.bible, page.scene, book.style),
          })),
        }),
      ]);

      const previewPending = await canGeneratePreview(userId);
      if (previewPending) {
        startPreview(id, photo);
      } else if (photo) {
        // Sin muestra gratis, la hoja con foto se hace igualmente ahora: la
        // foto no se guarda y al pagar ya no estaría (se perdería el parecido)
        startPhotoReference(id, photo);
      }

      const draftBook = await prisma.book.findUnique({
        where: { id },
        include: { pages: { orderBy: { pageNumber: "asc" } } },
      });

      return NextResponse.json({
        book: draftBook ? toPublicBook(draftBook) : null,
        previewPending,
        message:
          "Historia generada. Puedes editar los textos antes de generar las ilustraciones.",
        isDraft: true,
      });
    } catch (error) {
      await prisma.book.update({ where: { id }, data: { status: "ERROR" } });
      throw error;
    }
  } catch (error) {
    log.error({ err: error }, "Error generando historia");
    return NextResponse.json(
      { error: "Error al generar la historia. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}

async function readPhoto(
  request: NextRequest,
): Promise<PhotoInput | null | "invalid"> {
  if (!request.headers.get("content-type")?.includes("multipart/form-data")) {
    return null;
  }
  const form = await request.formData();
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!PHOTO_TYPES.includes(file.type) || file.size > MAX_PHOTO_BYTES) {
    return "invalid";
  }
  return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}

async function canGeneratePreview(userId: string): Promise<boolean> {
  if (await isAdminUser(userId)) return true;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [mine, total] = await Promise.all([
    prisma.book.count({
      where: { userId, createdAt: { gt: since }, bible: { not: Prisma.DbNull } },
    }),
    prisma.book.count({
      where: { createdAt: { gt: since }, bible: { not: Prisma.DbNull } },
    }),
  ]);
  // `mine` ya incluye este libro
  return mine <= FREE_PREVIEWS_PER_USER_DAY && total <= FREE_PREVIEWS_PER_DAY;
}
