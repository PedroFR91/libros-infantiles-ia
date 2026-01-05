import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

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
  { params }: { params: Promise<{ id: string }> }
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
        { status: 404 }
      );
    }

    return NextResponse.json({ book });
  } catch (error) {
    console.error("Error obteniendo libro:", error);
    return NextResponse.json(
      { error: "Error al obtener libro" },
      { status: 500 }
    );
  }
}

// PATCH /api/books/[id] - Actualizar libro (título, texto de páginas)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { status: 404 }
      );
    }

    const { title, pages, pageNumber, text } = body;

    // Actualizar título si se proporciona
    if (title) {
      await prisma.book.update({
        where: { id },
        data: { title },
      });
    }

    // Actualizar una página específica (desde el editor)
    if (pageNumber !== undefined && text !== undefined) {
      await prisma.bookPage.updateMany({
        where: {
          bookId: id,
          pageNumber: pageNumber,
        },
        data: { text },
      });
    }

    // Actualizar páginas si se proporcionan como array
    if (pages && Array.isArray(pages)) {
      for (const page of pages) {
        if (page.pageNumber && page.text !== undefined) {
          await prisma.bookPage.updateMany({
            where: {
              bookId: id,
              pageNumber: page.pageNumber,
            },
            data: { text: page.text },
          });
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
    console.error("Error actualizando libro:", error);
    return NextResponse.json(
      { error: "Error al actualizar libro" },
      { status: 500 }
    );
  }
}

// DELETE /api/books/[id] - Eliminar libro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { status: 404 }
      );
    }

    await prisma.book.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando libro:", error);
    return NextResponse.json(
      { error: "Error al eliminar libro" },
      { status: 500 }
    );
  }
}
