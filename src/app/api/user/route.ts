import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { getCreditBalance, getCreditHistory } from "@/lib/credits";
import { auth } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const log = createLogger("user");

// GET /api/user - Obtener información del usuario actual
export async function GET() {
  try {
    // PRIMERO: Verificar si hay usuario autenticado con NextAuth
    const session = await auth();

    log.debug(
      { userId: session?.user?.id, email: session?.user?.email },
      "Session check",
    );

    if (session?.user?.id) {
      // Usuario autenticado - buscar por ID
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          credits: true,
          role: true,
          createdAt: true,
        },
      });

      log.debug({ email: user?.email, credits: user?.credits }, "User found");

      if (user) {
        const history = await getCreditHistory(user.id, 10);

        return NextResponse.json({
          user,
          credits: user.credits,
          history: history.map(
            (h: {
              id: string;
              amount: number;
              reason: string;
              balance: number;
              createdAt: Date;
            }) => ({
              id: h.id,
              amount: h.amount,
              reason: h.reason,
              balance: h.balance,
              createdAt: h.createdAt,
            }),
          ),
        });
      }
    }

    // FALLBACK: Usuario anónimo por sessionId
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
      history: history.map(
        (h: {
          id: string;
          amount: number;
          reason: string;
          balance: number;
          createdAt: Date;
        }) => ({
          id: h.id,
          amount: h.amount,
          reason: h.reason,
          balance: h.balance,
          createdAt: h.createdAt,
        }),
      ),
    });
  } catch (error) {
    log.error({ err: error }, "Error obteniendo usuario");
    return NextResponse.json(
      { error: "Error al obtener usuario" },
      { status: 500 },
    );
  }
}
