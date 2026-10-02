import prisma from "@/lib/prisma";
import { consumeCredits, hasEnoughCredits } from "@/lib/credits";
import { startIllustrations } from "@/lib/generation";
import { createLogger } from "@/lib/logger";

const log = createLogger("unlock");

export type UnlockResult =
  | { ok: true; pending: number }
  | { ok: false; reason: "not_found" | "no_story" | "busy" | "done" | "no_credits" };

/**
 * Cobra 5 créditos y lanza las ilustraciones de un libro. Lo usan el botón del
 * editor y el webhook de Stripe (así el libro se ilustra aunque el comprador
 * no vuelva a la web tras pagar). Reclama el libro de forma atómica antes de
 * cobrar para que dos llamadas simultáneas no cobren dos veces.
 */
export async function unlockAndIllustrate(
  bookId: string,
  userId: string,
): Promise<UnlockResult> {
  const book = await prisma.book.findFirst({
    where: { id: bookId, userId },
    include: { pages: { select: { pageNumber: true, imageUrl: true } } },
  });
  if (!book) return { ok: false, reason: "not_found" };
  if (book.pages.length === 0) return { ok: false, reason: "no_story" };
  if (book.status === "GENERATING") return { ok: false, reason: "busy" };

  // La portada de muestra no cuenta como ilustración terminada
  const pending = book.pages.filter(
    (p) => !p.imageUrl || (p.pageNumber === 1 && !book.unlockedAt && !!book.bible),
  ).length;
  if (pending === 0) return { ok: false, reason: "done" };

  // Terminado con páginas sueltas sin dibujo: ya se pagó, el reintento es gratis.
  // ERROR sí cobra: ahí se devolvió el libro entero.
  const charge = book.status !== "COMPLETED";
  if (charge && !(await hasEnoughCredits(userId, "BOOK_GENERATION"))) {
    return { ok: false, reason: "no_credits" };
  }

  const claimed = await prisma.book.updateMany({
    where: { id: bookId, userId, status: { in: ["DRAFT", "ERROR", "COMPLETED"] } },
    data: { status: "GENERATING" },
  });
  if (claimed.count === 0) return { ok: false, reason: "busy" };

  if (charge && !(await consumeCredits(userId, "BOOK_GENERATION", bookId))) {
    await prisma.book.update({ where: { id: bookId }, data: { status: book.status } });
    return { ok: false, reason: "no_credits" };
  }

  if (!book.unlockedAt) {
    await prisma.book.update({ where: { id: bookId }, data: { unlockedAt: new Date() } });
  }

  startIllustrations(bookId, userId);
  log.info({ bookId, pending }, "Ilustraciones en marcha");
  return { ok: true, pending };
}
