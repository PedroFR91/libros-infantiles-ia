import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
import { generateStoryText, generateImage } from "@/lib/openai";
import { downloadAndStoreImage } from "@/lib/imageStorage";
import { auth } from "@/lib/auth";

// POST /api/books/[id]/generate - Generar libro completo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // PRIMERO: Verificar sesión de NextAuth
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
        { status: 404 }
      );
    }

    if (book.status === "GENERATING") {
      return NextResponse.json(
        { error: "El libro ya está siendo generado" },
        { status: 400 }
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
        { status: 400 }
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
        { status: 402 }
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
        artStyle
      );

      console.log("Character Sheet generado:", story.characterSheet);

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

      // Generar imágenes y crear páginas
      const pagePromises = story.pages.map(async (page, index) => {
        let imageUrl = null;
        let thumbnailUrl = null;

        try {
          console.log(`Generando imagen página ${page.pageNumber}...`);
          // Generar imagen con OpenAI (URL temporal)
          const tempImageUrl = await generateImage(page.imagePrompt);
          // Descargar y almacenar permanentemente
          imageUrl = await downloadAndStoreImage(
            tempImageUrl,
            id,
            page.pageNumber
          );
          thumbnailUrl = imageUrl;
          console.log(`Imagen página ${page.pageNumber} guardada: ${imageUrl}`);
        } catch (error) {
          console.error(
            `Error generando imagen para página ${page.pageNumber}:`,
            error
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
    console.error("Error generando libro:", error);
    return NextResponse.json(
      { error: "Error al generar libro" },
      { status: 500 }
    );
  }
}
