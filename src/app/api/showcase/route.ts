import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { ShowcaseBook } from "@/components/landing/showcase-types";

// Ejemplos públicos para la landing: libros COMPLETED marcados como `showcase`
// por un admin, con todas sus páginas para poder hojearlos enteros.
// No devuelve kidName, userId, emails, dedicatoria ni la biblia, pero el
// título y el texto de las páginas SÍ incluyen el nombre del protagonista:
// marcar como ejemplo solo libros de demostración (nombres ficticios) o con
// consentimiento de la familia (privacidad de menores).
// Dinámica (no se prerenderiza en build, así no depende de la BD al compilar);
// la caché la da Cache-Control en el CDN/proxy (5 min).
export const dynamic = "force-dynamic";

const MAX_BOOKS = 8;

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
        ageRange: true,
        gender: true,
        coverImageUrl: true,
        pages: {
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
        ageRange: book.ageRange,
        gender: book.gender,
        coverUrl: book.coverImageUrl ?? firstPage?.imageUrl ?? null,
        // La página 1 es la portada: el resto es la historia
        pages: book.pages
          .filter((p) => p.pageNumber > 1)
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
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
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
