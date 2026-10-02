import { isPreviewRunning, isRunning } from "@/lib/generation";

/**
 * Libro tal y como se devuelve al navegador: sin la biblia (prompts internos)
 * y sin la portada limpia hasta que se pagan las ilustraciones.
 */
export function toPublicBook<
  T extends {
    id: string;
    bible?: unknown;
    coverImageUrl?: string | null;
    characterImageUrl?: string | null;
    unlockedAt?: Date | null;
    pages?: { imagePrompt?: string | null }[];
  },
>(book: T) {
  const { bible: _bible, coverImageUrl, ...rest } = book;
  const unlocked = !!book.unlockedAt;
  return {
    ...rest,
    coverImageUrl: unlocked ? (coverImageUrl ?? null) : null,
    characterImageUrl: unlocked ? (book.characterImageUrl ?? null) : null,
    ...(book.pages && {
      pages: book.pages.map((p) => ({ ...p, imagePrompt: unlocked ? p.imagePrompt : null })),
    }),
    previewPending: isPreviewRunning(book.id),
    generating: isRunning(book.id),
  };
}
