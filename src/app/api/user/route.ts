import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getCreditBalance, getCreditHistory } from "@/lib/credits";

// GET /api/user - Obtener información del usuario actual
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      return NextResponse.json({
        user: null,
        credits: 0,
        history: [],
      });
    }

    const user = await prisma.user.findUnique({
      where: { sessionId },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({
        user: null,
        credits: 0,
        history: [],
      });
    }

    const history = await getCreditHistory(user.id, 10);

    return NextResponse.json({
      user,
      credits: user.credits,
      history: history.map((h) => ({
        id: h.id,
        amount: h.amount,
        reason: h.reason,
        balance: h.balance,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 }
    );
  }
}
