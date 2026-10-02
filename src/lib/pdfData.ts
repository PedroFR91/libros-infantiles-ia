import type { Book, BookPage } from "@prisma/client";
import type { PdfBook } from "@/lib/pdf";
import { parseBible } from "@/lib/story/engine";

/** Datos de un libro de la BD listos para maquetar el PDF */
export function toPdfBook(book: Book & { pages: BookPage[] }): PdfBook {
  const bible = parseBible(book.bible);
  const protagonist = bible?.characters.find((c) => c.role === "protagonist");
  return {
    id: book.id,
    title: book.title || `La aventura de ${book.kidName}`,
    kidName: book.kidName,
    dedication: book.dedication,
    characterImageUrl: book.characterImageUrl,
    characterPersonality: protagonist?.personality ?? null,
    summary: bible?.summary ?? null,
    createdAt: book.createdAt,
    pages: book.pages.map((p) => ({
      pageNumber: p.pageNumber,
      text: p.text || "",
      // La portada limpia sustituye a la de muestra una vez pagado
      imageUrl:
        p.pageNumber === 1 && book.unlockedAt && book.coverImageUrl
          ? book.coverImageUrl
          : p.imageUrl,
      textPosition: p.textPosition,
      textBackground: p.textBackground,
      textStyle: p.textStyle,
      textColor: p.textColor,
    })),
  };
}
