import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";

// GET /api/books - Listar libros del usuario
export async function GET() {
  try {
    // PRIMERO: Verificar sesión de NextAuth
    const session = await auth();

    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          books: {
            orderBy: { createdAt: "desc" },
            include: {
              pages: {
                orderBy: { pageNumber: "asc" },
              },
            },
          },
        },
      });
      return NextResponse.json({ books: user?.books ?? [] });
    }

    // FALLBACK: Usuario anónimo por sessionId
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({ books: [] });
    }

    const user = await prisma.user.findUnique({
      where: { sessionId },
      include: {
        books: {
          orderBy: { createdAt: "desc" },
          include: {
            pages: {
              orderBy: { pageNumber: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({ books: user?.books ?? [] });
  } catch (error) {
    console.error("Error listando libros:", error);
    return NextResponse.json(
      { error: "Error al obtener libros" },
      { status: 500 }
    );
  }
}

// POST /api/books - Crear nuevo libro (draft)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      kidName,
      theme,
      categories = [],
      style = "cartoon",
      characterDescription = null,
    } = body;

    if (!kidName || !theme) {
      return NextResponse.json(
        { error: "kidName y theme son requeridos" },
        { status: 400 }
      );
    }

    // PRIMERO: Verificar sesión de NextAuth
    const session = await auth();
    let user;
    let sessionId: string | null = null;

    if (session?.user?.id) {
      // Usuario autenticado con NextAuth
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });
    } else {
      // FALLBACK: Usuario anónimo
      const cookieStore = await cookies();
      sessionId = cookieStore.get("sessionId")?.value || uuidv4();
      user = await getOrCreateUser(sessionId);
    }

    if (!user) {
      return NextResponse.json(
        { error: "No se pudo obtener usuario" },
        { status: 500 }
      );
    }

    // Crear libro draft con descripción del personaje
    const book = await prisma.book.create({
      data: {
        userId: user.id,
        kidName,
        theme:
          Array.isArray(categories) && categories.length > 0
            ? `${theme} (${categories.join(", ")})`
            : theme,
        style,
        status: "DRAFT",
        characterDescription,
      },
    });

    const response = NextResponse.json({
      book,
      message:
        "Libro creado. Usa /api/books/:id/generate para generar el contenido.",
    });

    // Solo establecer cookie de sesión si es usuario anónimo
    if (sessionId) {
      response.cookies.set("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365, // 1 año
      });
    }

    return response;
  } catch (error) {
    console.error("Error creando libro:", error);
    return NextResponse.json(
      { error: "Error al crear libro" },
      { status: 500 }
    );
  }
}
