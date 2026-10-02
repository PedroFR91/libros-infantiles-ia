import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Ejemplos públicos para la landing: libros marcados como `showcase` por un
// admin. No devuelve kidName, userId, emails ni descripciones, pero el título y
// el texto de las páginas SÍ pueden incluir el nombre del niño: marcar como
// ejemplo solo libros de demostración o con consentimiento de la familia.
// Solo datos públicos:
// del personaje (privacidad de menores).
// Dinámica (no se prerenderiza en build, así no depende de la BD al compilar);
// la caché la da Cache-Control en el CDN/proxy (5 min).
export const dynamic = "force-dynamic";

const MAX_BOOKS = 6;
const SAMPLE_PAGES = [2, 3, 4];

export interface ShowcaseBook {
  id: string;
  title: string | null;
  theme: string;
  style: string;
  coverUrl: string | null;
  pages: { pageNumber: number; imageUrl: string | null; text: string | null }[];
}

export async function GET() {
  try {
    const books = await prisma.book.findMany({
      where: { showcase: true, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      take: MAX_BOOKS,
      select: {
        id: true,
        title: true,
        theme: true,
        style: true,
        coverImageUrl: true,
        pages: {
          where: { pageNumber: { in: [1, ...SAMPLE_PAGES] } },
          orderBy: { pageNumber: "asc" },
          select: { pageNumber: true, text: true, imageUrl: true },
        },
      },
    });

    const result: ShowcaseBook[] = books.map((book) => {
      const firstPage = book.pages.find((p) => p.pageNumber === 1);
      return {
        id: book.id,
        title: book.title,
        theme: book.theme,
        style: book.style,
        coverUrl: book.coverImageUrl ?? firstPage?.imageUrl ?? null,
        pages: book.pages
          .filter((p) => SAMPLE_PAGES.includes(p.pageNumber))
          .map((p) => ({
            pageNumber: p.pageNumber,
            imageUrl: p.imageUrl,
            text: p.text,
          })),
      };
    });

    return NextResponse.json(
      { books: result },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch {
    // La landing simplemente no muestra la sección si esto falla.
    return NextResponse.json(
      { books: [] },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
