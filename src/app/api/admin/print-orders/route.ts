import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { sendPrintShippedEmail } from "@/lib/email";

const log = createLogger("admin-print-orders");

const PRINT_ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "AWAITING_APPROVAL",
  "PAID",
  "IN_PRODUCTION",
  "SHIPPED",
  "DELIVERED",
  "CANCELED",
] as const;

// "" o null borran el campo; undefined lo deja como está
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v));

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(PRINT_ORDER_STATUSES).optional(),
  trackingUrl: z
    .union([z.url({ protocol: /^https?$/ }), z.literal("")])
    .nullable()
    .optional()
    .transform((v) => (v === "" ? null : v)),
  provider: optionalText(50),
  providerOrderId: optionalText(200),
  notes: optionalText(2000),
});

const orderInclude = {
  book: { select: { id: true, title: true, kidName: true } },
  user: { select: { id: true, email: true } },
} as const;

async function requireAdmin() {
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

  return null;
}

// GET /api/admin/print-orders?status=PAID - Listado de pedidos impresos
export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    if (
      status &&
      !(PRINT_ORDER_STATUSES as readonly string[]).includes(status)
    ) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }

    const orders = await prisma.printOrder.findMany({
      where: status
        ? { status: status as (typeof PRINT_ORDER_STATUSES)[number] }
        : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: orderInclude,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    log.error({ err: error }, "Error listando pedidos impresos");
    return NextResponse.json(
      { error: "Error al obtener pedidos impresos" },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/print-orders - Actualizar estado/seguimiento de un pedido
export async function PATCH(request: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos no válidos", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { id, ...changes } = parsed.data;

    const existing = await prisma.printOrder.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 },
      );
    }

    const data: {
      status?: (typeof PRINT_ORDER_STATUSES)[number];
      trackingUrl?: string | null;
      provider?: string | null;
      providerOrderId?: string | null;
      notes?: string | null;
    } = {};
    if (changes.status !== undefined) data.status = changes.status;
    if (changes.trackingUrl !== undefined) data.trackingUrl = changes.trackingUrl;
    if (changes.provider !== undefined) data.provider = changes.provider;
    if (changes.providerOrderId !== undefined)
      data.providerOrderId = changes.providerOrderId;
    if (changes.notes !== undefined) data.notes = changes.notes;

    const becomesShipped =
      data.status === "SHIPPED" && existing.status !== "SHIPPED";

    // Actualización condicionada al estado leído: si dos peticiones marcan
    // SHIPPED a la vez, solo una gana y solo esa envía el email.
    const { count } = await prisma.printOrder.updateMany({
      where: { id, status: existing.status },
      data,
    });

    if (count === 0) {
      return NextResponse.json(
        { error: "El pedido ha cambiado mientras lo editabas. Recarga." },
        { status: 409 },
      );
    }

    const order = await prisma.printOrder.findUniqueOrThrow({
      where: { id },
      include: orderInclude,
    });

    let emailSent = false;
    let emailSkippedReason: string | null = null;

    if (becomesShipped) {
      const to = order.email || order.user.email;
      if (!order.trackingUrl) {
        emailSkippedReason = "Sin trackingUrl: no se ha avisado al cliente";
      } else if (!to) {
        emailSkippedReason = "Pedido sin email: no se ha avisado al cliente";
      } else {
        emailSent = await sendPrintShippedEmail({
          to,
          kidName: order.book.kidName,
          trackingUrl: order.trackingUrl,
        });
        if (!emailSent) emailSkippedReason = "Fallo al enviar el email";
      }
      log.info(
        { orderId: id, emailSent, emailSkippedReason },
        "Pedido impreso marcado como enviado",
      );
    }

    return NextResponse.json({ order, emailSent, emailSkippedReason });
  } catch (error) {
    log.error({ err: error }, "Error actualizando pedido impreso");
    return NextResponse.json(
      { error: "Error al actualizar el pedido" },
      { status: 500 },
    );
  }
}
