import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
import { generateImage } from "@/lib/openai";
import { downloadAndStoreImage } from "@/lib/imageStorage";
import { auth } from "@/lib/auth";

// POST /api/books/[id]/generate-images - Generar imágenes para un libro - CUESTA CRÉDITOS
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verificar sesión de NextAuth
    const session = await auth();
    let userId: string | null = null;

    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      // FALLBACK: Usuario anónimo por sessionId
      const cookieStore = await cookies();
      const sessionId = cookieStore.get("sessionId")?.value;

      if (sessionId) {
        const anonymousUser = await prisma.user.findUnique({
          where: { sessionId },
          select: { id: true },
        });
        userId = anonymousUser?.id || null;
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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
        { status: 404 }
      );
    }

    // Verificar que tiene páginas
    if (!book.pages || book.pages.length === 0) {
      return NextResponse.json(
        { error: "El libro no tiene historia. Genera la historia primero." },
        { status: 400 }
      );
    }

    // Verificar si ya tiene todas las imágenes
    const pagesWithoutImages = book.pages.filter((p) => !p.imageUrl);
    if (pagesWithoutImages.length === 0) {
      return NextResponse.json(
        { error: "Todas las páginas ya tienen imágenes." },
        { status: 400 }
      );
    }

    if (book.status === "GENERATING") {
      return NextResponse.json(
        { error: "El libro ya está siendo generado" },
        { status: 400 }
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
        { status: 402 }
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

      // Generar imágenes solo para páginas que no tienen
      for (const page of pagesWithoutImages) {
        if (!page.imagePrompt) {
          console.log(`Página ${page.pageNumber} sin imagePrompt, saltando...`);
          continue;
        }

        try {
          console.log(`Generando imagen página ${page.pageNumber}...`);
          // Generar imagen con OpenAI (URL temporal)
          const tempImageUrl = await generateImage(page.imagePrompt);

          // Descargar y almacenar permanentemente
          const permanentUrl = await downloadAndStoreImage(
            tempImageUrl,
            id,
            page.pageNumber
          );

          await prisma.bookPage.update({
            where: { id: page.id },
            data: {
              imageUrl: permanentUrl,
              thumbnailUrl: permanentUrl,
            },
          });

          console.log(
            `Imagen página ${page.pageNumber} guardada: ${permanentUrl}`
          );
        } catch (error) {
          console.error(
            `Error generando imagen para página ${page.pageNumber}:`,
            error
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
    console.error("Error generando imágenes:", error);
    return NextResponse.json(
      { error: "Error al generar ilustraciones" },
      { status: 500 }
    );
  }
}
