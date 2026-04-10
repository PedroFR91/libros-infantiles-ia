import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * Helper centralizado de autenticación para todas las API routes.
 * Verifica NextAuth primero, luego hace fallback a sessionId de cookie.
 * Retorna el userId o null si no se puede identificar al usuario.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  // 1. Verificar sesión de NextAuth (usuarios registrados)
  const session = await auth();
  if (session?.user?.id) {
    return session.user.id;
  }

  // 2. Fallback: usuario anónimo por sessionId en cookie
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;

  if (sessionId) {
    const anonymousUser = await prisma.user.findUnique({
      where: { sessionId },
      select: { id: true },
    });
    return anonymousUser?.id || null;
  }

  return null;
}

/**
 * Verifica que el usuario sea propietario de un libro.
 * Retorna el libro con las relaciones especificadas o null.
 */
export async function getBookForUser<T extends Record<string, unknown>>(
  bookId: string,
  userId: string,
  include?: T,
) {
  return prisma.book.findFirst({
    where: {
      id: bookId,
      userId,
    },
    ...(include ? { include } : {}),
  });
}
