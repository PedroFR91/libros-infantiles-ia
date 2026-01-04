import prisma from "./prisma";
import { CREDIT_COSTS } from "./stripe";

// Obtener o crear usuario por sessionId
export async function getOrCreateUser(sessionId: string) {
  let user = await prisma.user.findUnique({
    where: { sessionId },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        sessionId,
        credits: 0,
      },
    });
  }

  return user;
}

// Verificar si el usuario tiene suficientes créditos
export async function hasEnoughCredits(
  userId: string,
  operation: keyof typeof CREDIT_COSTS
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) return false;
  return user.credits >= CREDIT_COSTS[operation];
}

// Consumir créditos
export async function consumeCredits(
  userId: string,
  operation: keyof typeof CREDIT_COSTS,
  referenceId?: string
): Promise<boolean> {
  const cost = CREDIT_COSTS[operation];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user || user.credits < cost) {
    return false;
  }

  const newBalance = user.credits - cost;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    }),
    prisma.creditLedger.create({
      data: {
        userId,
        amount: -cost,
        reason:
          operation === "BOOK_GENERATION"
            ? "book_generation"
            : "page_regeneration",
        referenceId,
        balance: newBalance,
      },
    }),
  ]);

  return true;
}

// Añadir créditos (después de compra)
export async function addCredits(
  userId: string,
  amount: number,
  paymentId: string
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) {
    throw new Error("Usuario no encontrado");
  }

  const newBalance = user.credits + amount;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { credits: newBalance },
    }),
    prisma.creditLedger.create({
      data: {
        userId,
        amount,
        reason: "purchase",
        referenceId: paymentId,
        balance: newBalance,
      },
    }),
  ]);

  return newBalance;
}

// Obtener balance de créditos
export async function getCreditBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  return user?.credits ?? 0;
}

// Obtener historial de créditos
export async function getCreditHistory(userId: string, limit = 20) {
  return prisma.creditLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
