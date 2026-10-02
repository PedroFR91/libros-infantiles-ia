import { randomBytes, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import { appUrl } from "@/lib/appUrl";

// Enlace privado de cada libro: /libro/{id}?t={token}. Permite abrir el libro
// sin cuenta desde cualquier navegador (emails, otro dispositivo).

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Token del libro (lo crea si es un libro anterior a los enlaces privados) */
export async function ensureAccessToken(bookId: string): Promise<string> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { accessToken: true },
  });
  if (book?.accessToken) return book.accessToken;
  await prisma.book.updateMany({
    where: { id: bookId, accessToken: null },
    data: { accessToken: newAccessToken() },
  });
  const saved = await prisma.book.findUnique({ where: { id: bookId }, select: { accessToken: true } });
  return saved!.accessToken!;
}

export async function bookLink(bookId: string): Promise<string> {
  return appUrl(`/libro/${bookId}?t=${await ensureAccessToken(bookId)}`);
}

export function tokensMatch(expected: string | null, given: string | null): boolean {
  if (!expected || !given) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}
