import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// GET /api/books/[id] - Obtener libro con páginas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const book = await prisma.book.findFirst({
      where: {
        id,
        user: { sessionId },
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
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar propiedad
    const book = await prisma.book.findFirst({
      where: {
        id,
        user: { sessionId },
      },
    });

    if (!book) {
      return NextResponse.json(
        { error: "Libro no encontrado" },
        { status: 404 }
      );
    }

    const { title, pages } = body;

    // Actualizar título si se proporciona
    if (title) {
      await prisma.book.update({
        where: { id },
        data: { title },
      });
    }

    // Actualizar páginas si se proporcionan
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
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar propiedad
    const book = await prisma.book.findFirst({
      where: {
        id,
        user: { sessionId },
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
