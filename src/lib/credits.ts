import prisma from "./prisma";
import { Prisma } from "@prisma/client";
import { CREDIT_COSTS } from "./stripe";

// Tipo del cliente de transacción Prisma
type TransactionClient = Prisma.TransactionClient;

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
  operation: keyof typeof CREDIT_COSTS,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  });

  if (!user) return false;
  return user.credits >= CREDIT_COSTS[operation];
}

// Consumir créditos - Operación atómica para evitar race conditions
export async function consumeCredits(
  userId: string,
  operation: keyof typeof CREDIT_COSTS,
  referenceId?: string,
): Promise<boolean> {
  const cost = CREDIT_COSTS[operation];

  try {
    // Usamos una transacción interactiva con updateMany + WHERE atómico
    // para evitar race conditions (double-spend)
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      // Intento atómico: solo actualiza si credits >= cost
      const updateResult = await tx.user.updateMany({
        where: {
          id: userId,
          credits: { gte: cost },
        },
        data: {
          credits: { decrement: cost },
        },
      });

      // Si no se actualizó ningún registro, no tenía suficientes créditos
      if (updateResult.count === 0) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      // Obtener el balance actualizado
      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      // Registrar en el ledger
      await tx.creditLedger.create({
        data: {
          userId,
          amount: -cost,
          reason:
            operation === "BOOK_GENERATION"
              ? "book_generation"
              : "page_regeneration",
          referenceId,
          balance: updatedUser?.credits ?? 0,
        },
      });

      return true;
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return false;
    }
    throw error;
  }
}

// Añadir créditos (después de compra) - Operación atómica
export async function addCredits(
  userId: string,
  amount: number,
  paymentId: string,
): Promise<number> {
  const result = await prisma.$transaction(async (tx: TransactionClient) => {
    // Incremento atómico: evita race conditions si llegan 2 webhooks
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    await tx.creditLedger.create({
      data: {
        userId,
        amount,
        reason: "purchase",
        referenceId: paymentId,
        balance: updatedUser.credits,
      },
    });

    return updatedUser.credits;
  });

  return result;
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
