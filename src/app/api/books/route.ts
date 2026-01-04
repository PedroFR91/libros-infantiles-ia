import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

// GET /api/books - Listar libros del usuario
export async function GET() {
  try {
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
    const { kidName, theme, categories = [], style = "cartoon" } = body;

    if (!kidName || !theme) {
      return NextResponse.json(
        { error: "kidName y theme son requeridos" },
        { status: 400 }
      );
    }

    // Obtener o crear sessionId
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Obtener o crear usuario
    const user = await getOrCreateUser(sessionId);

    // Crear libro draft
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
      },
    });

    const response = NextResponse.json({
      book,
      message:
        "Libro creado. Usa /api/books/:id/generate para generar el contenido.",
    });

    // Establecer cookie de sesión
    response.cookies.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 año
    });

    return response;
  } catch (error) {
    console.error("Error creando libro:", error);
    return NextResponse.json(
      { error: "Error al crear libro" },
      { status: 500 }
    );
  }
}
