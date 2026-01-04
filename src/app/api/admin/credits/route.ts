import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// POST /api/admin/credits - Add/remove credits from user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verify admin role
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, amount } = body;

    if (!userId || typeof amount !== "number") {
      return NextResponse.json({ error: "userId y amount son requeridos" }, { status: 400 });
    }

    // Get current user credits
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const newBalance = Math.max(0, targetUser.credits + amount);

    // Update credits and log
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      }),
      prisma.creditLedger.create({
        data: {
          userId,
          amount,
          reason: amount > 0 ? "admin_grant" : "admin_deduct",
          referenceId: session.user.id,
          balance: newBalance,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      newBalance,
    });
  } catch (error) {
    console.error("Error updating credits:", error);
    return NextResponse.json({ error: "Error al actualizar créditos" }, { status: 500 });
  }
}
