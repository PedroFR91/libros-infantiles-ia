import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { generateStoryText } from "@/lib/openai";
import { auth } from "@/lib/auth";

// POST /api/books/[id]/generate-story - Generar solo la historia (textos) - GRATIS
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

    // Obtener libro del usuario
    const book = await prisma.book.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 }
      );
    }

    // Si ya tiene páginas con texto, devolver el libro existente
    const existingPages = await prisma.bookPage.findMany({
      where: { bookId: id },
      orderBy: { pageNumber: "asc" },
    });

    if (existingPages.length > 0) {
      // Ya tiene historia generada
      const bookWithPages = await prisma.book.findUnique({
        where: { id },
        include: {
          pages: {
            orderBy: { pageNumber: "asc" },
          },
        },
      });

      return NextResponse.json({
        book: bookWithPages,
        message: "Historia ya generada anteriormente",
        alreadyGenerated: true,
      });
    }

    // Marcar como generando
    await prisma.book.update({
      where: { id },
      data: { status: "GENERATING" },
    });

    try {
      // Obtener estilo artístico del libro (por defecto cartoon)
      const artStyle = (book as { style?: string }).style || "cartoon";

      // Generar historia con characterSheet para consistencia
      // ESTO ES GRATIS - Solo usa GPT-4 para texto, no genera imágenes
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
          // Guardar characterSheet en metadatos del libro
          ...(story.characterSheet && {
            characterDescription: story.characterSheet,
          }),
          // Estado: DRAFT = tiene historia pero no imágenes
          status: "DRAFT",
        },
      });

      // Crear páginas SIN imágenes (solo texto e imagePrompt)
      const pagePromises = story.pages.map((page) => {
        return prisma.bookPage.create({
          data: {
            bookId: id,
            pageNumber: page.pageNumber,
            text: page.text,
            imagePrompt: page.imagePrompt,
            imageUrl: null, // Sin imagen todavía
            thumbnailUrl: null,
          },
        });
      });

      await Promise.all(pagePromises);

      // Retornar libro con páginas (sin imágenes)
      const draftBook = await prisma.book.findUnique({
        where: { id },
        include: {
          pages: {
            orderBy: { pageNumber: "asc" },
          },
        },
      });

      return NextResponse.json({
        book: draftBook,
        message:
          "Historia generada. Ahora puedes editar los textos antes de generar las ilustraciones.",
        isDraft: true,
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
    console.error("Error generando historia:", error);
    return NextResponse.json(
      { error: "Error al generar historia" },
      { status: 500 }
    );
  }
}
