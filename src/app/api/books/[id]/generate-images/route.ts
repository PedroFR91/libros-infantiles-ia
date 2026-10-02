import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hasEnoughCredits, consumeCredits } from "@/lib/credits";
import { startIllustrations, isRunning } from "@/lib/generation";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { createLogger } from "@/lib/logger";

const log = createLogger("generate-images");

// POST /api/books/[id]/generate-images - Desbloquea y genera las ilustraciones.
// CUESTA CRÉDITOS. Responde al momento (202) y genera en segundo plano: el
// editor consulta GET /api/books/[id] y muestra cada página según termina.
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

    const book = await prisma.book.findFirst({
      where: { id, userId },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }

    if (book.pages.length === 0) {
      return NextResponse.json(
        { error: "El libro no tiene historia. Genera la historia primero." },
        { status: 400 },
      );
    }

    if (book.status === "GENERATING" || isRunning(id)) {
      return NextResponse.json(
        { error: "El libro ya está siendo generado", status: "GENERATING" },
        { status: 409 },
      );
    }

    // La portada de muestra no cuenta como ilustración terminada
    const pending = book.pages.filter(
      (p) =>
        !p.imageUrl || (p.pageNumber === 1 && !book.unlockedAt && !!book.bible),
    );
    if (pending.length === 0) {
      return NextResponse.json(
        { error: "Todas las páginas ya tienen imágenes." },
        { status: 400 },
      );
    }

    if (!(await hasEnoughCredits(userId, "BOOK_GENERATION"))) {
      return NextResponse.json(
        {
          error: "No tienes suficientes créditos. Compra un pack para continuar.",
          needsCredits: true,
        },
        { status: 402 },
      );
    }

    // Reclamar el libro de forma atómica ANTES de cobrar: dos peticiones
    // simultáneas (dos pestañas, doble clic) no pueden cobrar dos veces
    const claimed = await prisma.book.updateMany({
      where: { id, userId, status: { in: ["DRAFT", "ERROR", "COMPLETED"] } },
      data: { status: "GENERATING" },
    });
    if (claimed.count === 0) {
      return NextResponse.json(
        { error: "El libro ya está siendo generado", status: "GENERATING" },
        { status: 409 },
      );
    }

    // Atómico: falla si otro proceso gastó los créditos antes
    const consumed = await consumeCredits(userId, "BOOK_GENERATION", id);
    if (!consumed) {
      await prisma.book.update({ where: { id }, data: { status: book.status } });
      return NextResponse.json(
        {
          error: "No tienes suficientes créditos. Compra un pack para continuar.",
          needsCredits: true,
        },
        { status: 402 },
      );
    }

    if (!book.unlockedAt) {
      await prisma.book.update({ where: { id }, data: { unlockedAt: new Date() } });
    }

    startIllustrations(id, userId);
    log.info({ bookId: id, pending: pending.length }, "Ilustraciones en marcha");

    return NextResponse.json(
      { status: "GENERATING", pending: pending.length },
      { status: 202 },
    );
  } catch (error) {
    log.error({ err: error }, "Error iniciando ilustraciones");
    return NextResponse.json(
      { error: "Error al iniciar las ilustraciones" },
      { status: 500 },
    );
  }
}
