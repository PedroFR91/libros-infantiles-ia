import prisma from "@/lib/prisma";
import { verifyListenSignature } from "@/lib/listenLink";

/** Libro terminado y pagado, solo con la firma del enlace para escuchar */
export async function loadListenBook(id: string, signature?: string) {
  if (!verifyListenSignature(id, signature)) return null;
  const book = await prisma.book.findUnique({
    where: { id },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book || book.status !== "COMPLETED" || !book.unlockedAt) return null;
  return book;
}
