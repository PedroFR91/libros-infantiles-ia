import { createHmac, timingSafeEqual } from "crypto";
import { appUrl } from "@/lib/appUrl";

// Enlace para escuchar y leer el cuento narrado (/leer/[id]?s=firma). Solo de
// lectura: a diferencia del enlace privado (/libro/[id]?t=...), no da acceso
// al editor ni traspasa el libro, así que se puede compartir con la familia.

const SECRET = process.env.LISTEN_LINK_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

function sign(bookId: string): string {
  return createHmac("sha256", SECRET).update(`listen:${bookId}`).digest("base64url").slice(0, 24);
}

export function listenUrl(bookId: string): string {
  return appUrl(`/leer/${bookId}?s=${sign(bookId)}`);
}

export function verifyListenSignature(bookId: string, signature: string | null | undefined): boolean {
  if (!SECRET || !signature) return false;
  const expected = Buffer.from(sign(bookId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
