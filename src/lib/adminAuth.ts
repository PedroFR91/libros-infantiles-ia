import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/** true si la sesión actual es de un administrador */
export async function isAdminSession(): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}
