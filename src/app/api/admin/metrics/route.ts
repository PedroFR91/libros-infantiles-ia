import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin-metrics");

// --- Supuestos de costes (ESTIMACIONES, no datos contables) ---
// Coste OpenAI estimado por libro desbloqueado (ilustraciones de todas las
// páginas + portada limpia + reintentos medios). Revisar con la factura real.
const OPENAI_COST_PER_UNLOCKED_BOOK_EUR = 1.1;
// Coste OpenAI estimado por borrador (historia + portada de muestra).
const OPENAI_COST_PER_DRAFT_EUR = 0.12;
// IVA incluido en los precios (España).
const VAT_RATE = 0.21;
// Comisión Stripe estimada (tarjetas EEE estándar): 1,5 % + 0,25 € por pago.
const STRIPE_FEE_PCT = 0.015;
const STRIPE_FEE_FIXED_EUR = 0.25;
// Un libro en GENERATING más tiempo que esto se considera atascado.
const STUCK_GENERATING_MS = 15 * 60 * 1000;

const ALLOWED_DAYS = [7, 30, 90] as const;
const TIME_ZONE = "Europe/Madrid";

const PRINT_PAID_STATUSES = [
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
] as const;

function dayKey(date: Date): string {
  // en-CA formatea como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function ratio(num: number, den: number): number | null {
  return den > 0 ? num / den : null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// GET /api/admin/metrics?days=7|30|90 - Embudo de conversión y economía unitaria
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que es admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requested = Number(searchParams.get("days"));
    const days = (ALLOWED_DAYS as readonly number[]).includes(requested)
      ? requested
      : 30;

    const now = new Date();
    const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const stuckBefore = new Date(now.getTime() - STUCK_GENERATING_MS);
    const inRange = { gte: since };

    const [
      draftsCreated,
      draftsWithLeadEmail,
      checkoutsStarted,
      paymentsAgg,
      booksUnlocked,
      booksCompleted,
      booksError,
      booksStuckGenerating,
      printByStatus,
      printRevenueAgg,
      draftDates,
      paymentDates,
    ] = await Promise.all([
      // Todo libro nace como borrador: los creados en el rango son los borradores
      prisma.book.count({ where: { createdAt: inRange } }),
      prisma.book.count({
        where: { createdAt: inRange, leadEmail: { not: null } },
      }),
      // Checkout iniciado = Payment creado (cualquier estado)
      prisma.payment.count({ where: { createdAt: inRange } }),
      prisma.payment.aggregate({
        where: { createdAt: inRange, status: "COMPLETED" },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.book.count({ where: { unlockedAt: inRange } }),
      // Cohorte: desbloqueados en el rango que han terminado bien
      prisma.book.count({
        where: { unlockedAt: inRange, status: "COMPLETED" },
      }),
      // Libros en ERROR cuya última actualización cae en el rango
      prisma.book.count({ where: { status: "ERROR", updatedAt: inRange } }),
      // Estado actual (no depende del rango): GENERATING sin moverse >15 min
      prisma.book.count({
        where: { status: "GENERATING", updatedAt: { lt: stuckBefore } },
      }),
      prisma.printOrder.groupBy({
        by: ["status"],
        where: { createdAt: inRange },
        _count: { _all: true },
      }),
      prisma.printOrder.aggregate({
        where: {
          createdAt: inRange,
          status: { in: [...PRINT_PAID_STATUSES] },
        },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.book.findMany({
        where: { createdAt: inRange },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: { createdAt: inRange, status: "COMPLETED" },
        select: { createdAt: true, amount: true },
      }),
    ]);

    const paymentsCompleted = paymentsAgg._count._all;
    const revenueCents = paymentsAgg._sum.amount ?? 0;
    const revenueEur = revenueCents / 100;

    // --- Economía unitaria ESTIMADA (solo producto digital) ---
    const openAiCostEur =
      booksUnlocked * OPENAI_COST_PER_UNLOCKED_BOOK_EUR +
      draftsCreated * OPENAI_COST_PER_DRAFT_EUR;
    const revenueNetOfVatEur = revenueEur / (1 + VAT_RATE);
    const stripeFeesEur =
      revenueEur * STRIPE_FEE_PCT + paymentsCompleted * STRIPE_FEE_FIXED_EUR;
    const grossMarginEur = revenueNetOfVatEur - stripeFeesEur - openAiCostEur;

    // --- Pedidos impresos ---
    const printOrdersByStatus: Record<string, number> = {
      PENDING_PAYMENT: 0,
      PAID: 0,
      IN_PRODUCTION: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELED: 0,
    };
    for (const row of printByStatus) {
      printOrdersByStatus[row.status] = row._count._all;
    }

    // --- Serie diaria (zona horaria de Madrid) ---
    const series = new Map<
      string,
      { date: string; drafts: number; payments: number; revenueCents: number }
    >();
    for (let i = days; i >= 0; i--) {
      const key = dayKey(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      if (!series.has(key)) {
        series.set(key, { date: key, drafts: 0, payments: 0, revenueCents: 0 });
      }
    }
    for (const b of draftDates) {
      const entry = series.get(dayKey(b.createdAt));
      if (entry) entry.drafts++;
    }
    for (const p of paymentDates) {
      const entry = series.get(dayKey(p.createdAt));
      if (entry) {
        entry.payments++;
        entry.revenueCents += p.amount;
      }
    }

    return NextResponse.json({
      days,
      since: since.toISOString(),
      until: now.toISOString(),
      funnel: {
        draftsCreated,
        draftsWithLeadEmail,
        checkoutsStarted,
        paymentsCompleted,
        revenueCents,
        booksUnlocked,
        booksCompleted,
        booksError,
        booksStuckGenerating,
      },
      conversion: {
        // pagos completados / borradores creados
        draftToPayment: ratio(paymentsCompleted, draftsCreated),
        // libros COMPLETED / libros desbloqueados (misma cohorte)
        paymentToCompleted: ratio(booksCompleted, booksUnlocked),
        // borradores con email / borradores
        draftToLead: ratio(draftsWithLeadEmail, draftsCreated),
        // pagos completados / checkouts iniciados
        checkoutToPayment: ratio(paymentsCompleted, checkoutsStarted),
      },
      print: {
        byStatus: printOrdersByStatus,
        paidOrders: printRevenueAgg._count._all,
        revenueCents: printRevenueAgg._sum.amount ?? 0,
      },
      economics: {
        estimated: true,
        note:
          "Estimación del producto digital: ingresos sin IVA (÷1,21) − comisión Stripe (1,5 % + 0,25 € por pago) − coste OpenAI estimado (1,10 € por libro desbloqueado + 0,12 € por borrador). No incluye impresos, hosting ni devoluciones.",
        revenueEur: round2(revenueEur),
        revenueNetOfVatEur: round2(revenueNetOfVatEur),
        stripeFeesEur: round2(stripeFeesEur),
        openAiCostEur: round2(openAiCostEur),
        grossMarginEur: round2(grossMarginEur),
        grossMarginPct: ratio(grossMarginEur, revenueNetOfVatEur),
        assumptions: {
          openAiCostPerUnlockedBookEur: OPENAI_COST_PER_UNLOCKED_BOOK_EUR,
          openAiCostPerDraftEur: OPENAI_COST_PER_DRAFT_EUR,
          vatRate: VAT_RATE,
          stripeFeePct: STRIPE_FEE_PCT,
          stripeFeeFixedEur: STRIPE_FEE_FIXED_EUR,
        },
      },
      daily: Array.from(series.values()),
    });
  } catch (error) {
    log.error({ err: error }, "Error calculando métricas admin");
    return NextResponse.json(
      { error: "Error al calcular métricas" },
      { status: 500 },
    );
  }
}
