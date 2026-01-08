import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/books - Obtener todos los libros con detalles
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");

    // Si se pide un libro específico, devolver con todas las páginas
    if (bookId) {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
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
    }

    // Construir filtros
    const where: any = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    // Obtener todos los libros
    const books = await prisma.book.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        pages: {
          orderBy: { pageNumber: "asc" },
          select: {
            id: true,
            pageNumber: true,
            imageUrl: true,
            thumbnailUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error fetching admin books:", error);
    return NextResponse.json(
      { error: "Error al obtener libros" },
      { status: 500 }
    );
  }
}

// POST /api/admin/books - Acciones sobre libros (regenerar, eliminar, etc.)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { action, bookId } = await request.json();

    if (!bookId) {
      return NextResponse.json({ error: "bookId requerido" }, { status: 400 });
    }

    switch (action) {
      case "delete":
        // Eliminar libro y sus páginas
        await prisma.book.delete({
          where: { id: bookId },
        });
        return NextResponse.json({ message: "Libro eliminado" });

      case "reset":
        // Resetear libro a estado DRAFT (eliminar imágenes)
        await prisma.bookPage.updateMany({
          where: { bookId },
          data: {
            imageUrl: null,
            thumbnailUrl: null,
          },
        });
        await prisma.book.update({
          where: { id: bookId },
          data: { status: "DRAFT" },
        });
        return NextResponse.json({ message: "Libro reseteado a borrador" });

      default:
        return NextResponse.json(
          { error: "Acción no válida" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error en acción admin books:", error);
    return NextResponse.json(
      { error: "Error al procesar acción" },
      { status: 500 }
    );
  }
}
