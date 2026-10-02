import { NextRequest, NextResponse } from "next/server";
import { unlockAndIllustrate } from "@/lib/unlock";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger("generate-images");

// POST /api/books/[id]/generate-images - Ilustra el libro (cuesta 1 libro).
// Responde al momento (202) y genera en segundo plano: el editor consulta
// GET /api/books/[id] y muestra cada página según termina. Tras un pago, el
// webhook de Stripe ya lo lanza solo (esta ruta queda para "reintentar" y
// para quien ya tenía libros disponibles).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const rateLimitResponse = checkRateLimit(
      `genimg:${userId}`,
      RATE_LIMIT_PRESETS.generation,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const result = await unlockAndIllustrate(id, userId);
    if (result.ok) {
      return NextResponse.json(
        { status: "GENERATING", pending: result.pending },
        { status: 202 },
      );
    }

    switch (result.reason) {
      case "not_found":
        return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
      case "no_story":
        return NextResponse.json({ error: "El libro no tiene historia todavía." }, { status: 400 });
      case "busy":
        return NextResponse.json(
          { error: "El libro ya se está ilustrando", status: "GENERATING" },
          { status: 409 },
        );
      case "done":
        return NextResponse.json({ error: "El libro ya está ilustrado." }, { status: 400 });
      case "no_credits":
        return NextResponse.json(
          { error: "Elige cómo quieres tu cuento para ilustrarlo.", needsCredits: true },
          { status: 402 },
        );
    }
  } catch (error) {
    log.error({ err: error }, "Error iniciando ilustraciones");
    return NextResponse.json({ error: "Error al iniciar las ilustraciones" }, { status: 500 });
  }
}
