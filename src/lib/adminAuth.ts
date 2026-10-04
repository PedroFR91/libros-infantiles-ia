import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export { isAdminEmail } from "@/lib/adminEmails";

/** true si la sesión actual es de un administrador */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  return isAdminUser(session.user.id);
}

/**
 * Los administradores generan sin pagar (ejemplos, pruebas, regalos): no se
 * les cobran créditos ni cuentan para el tope de portadas gratis.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}
