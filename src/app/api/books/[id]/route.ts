import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const log = createLogger("books");

// Helper para obtener userId
async function getUserId(): Promise<string | null> {
  // Verificar NextAuth
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  // Fallback a sessionId
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;
  if (sessionId) {
    const user = await prisma.user.findUnique({
      where: { sessionId },
      select: { id: true },
    });
    return user?.id || null;
  }

  return null;
}

// GET /api/books/[id] - Obtener libro con páginas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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

    return NextResponse.json({ book });
  } catch (error) {
    log.error({ err: error }, "Error obteniendo libro");
    return NextResponse.json(
      { error: "Error al obtener libro" },
      { status: 500 },
    );
  }
}

// PATCH /api/books/[id] - Actualizar libro (título, texto de páginas)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar propiedad
    const book = await prisma.book.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    const {
      title,
      pages,
      pageNumber,
      text,
      textPosition,
      textBackground,
      textStyle,
      textColor,
    } = body;

    // Actualizar título si se proporciona
    if (title) {
      await prisma.book.update({
        where: { id },
        data: { title },
      });
    }

    // Actualizar una página específica (desde el editor)
    if (pageNumber !== undefined) {
      const pageData: Record<string, string | null> = {};
      if (text !== undefined) pageData.text = text;
      if (textPosition !== undefined) pageData.textPosition = textPosition;
      if (textBackground !== undefined)
        pageData.textBackground = textBackground;
      if (textStyle !== undefined) pageData.textStyle = textStyle;
      if (textColor !== undefined) pageData.textColor = textColor;

      if (Object.keys(pageData).length > 0) {
        await prisma.bookPage.updateMany({
          where: {
            bookId: id,
            pageNumber: pageNumber,
          },
          data: pageData,
        });
      }
    }

    // Actualizar páginas si se proporcionan como array
    if (pages && Array.isArray(pages)) {
      for (const page of pages) {
        if (page.pageNumber !== undefined) {
          const pageData: Record<string, string | null> = {};
          if (page.text !== undefined) pageData.text = page.text;
          if (page.textPosition !== undefined)
            pageData.textPosition = page.textPosition;
          if (page.textBackground !== undefined)
            pageData.textBackground = page.textBackground;
          if (page.textStyle !== undefined) pageData.textStyle = page.textStyle;
          if (page.textColor !== undefined) pageData.textColor = page.textColor;

          if (Object.keys(pageData).length > 0) {
            await prisma.bookPage.updateMany({
              where: {
                bookId: id,
                pageNumber: page.pageNumber,
              },
              data: pageData,
            });
          }
        }
      }
    }

    // Retornar libro actualizado
    const updatedBook = await prisma.book.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: "asc" },
        },
      },
    });

    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    log.error({ err: error }, "Error actualizando libro");
    return NextResponse.json(
      { error: "Error al actualizar libro" },
      { status: 500 },
    );
  }
}

// DELETE /api/books/[id] - Eliminar libro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar propiedad
    const book = await prisma.book.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 },
      );
    }

    await prisma.book.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ err: error }, "Error eliminando libro");
    return NextResponse.json(
      { error: "Error al eliminar libro" },
      { status: 500 },
    );
  }
}
