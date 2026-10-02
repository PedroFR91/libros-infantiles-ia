import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { sendPrintOrderAdminEmail, sendPrintOrderConfirmationEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("approve-print");

// POST /api/books/[id]/approve-print - El cliente aprueba su libro terminado
// para imprenta (pedidos del pack impreso + PDF). Entonces pasa a producción.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const book = await prisma.book.findFirst({
      where: { id, userId },
      select: {
        status: true,
        title: true,
        kidName: true,
        pages: { where: { imageUrl: null }, select: { pageNumber: true } },
      },
    });
    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }
    if (book.status !== "COMPLETED" || book.pages.length > 0) {
      return NextResponse.json(
        { error: "Antes de imprimir, termina las ilustraciones que faltan." },
        { status: 400 },
      );
    }

    const order = await prisma.printOrder.findFirst({
      where: { bookId: id, status: "AWAITING_APPROVAL" },
      orderBy: { createdAt: "desc" },
    });
    if (!order) {
      return NextResponse.json({ error: "No hay ningún pedido pendiente de aprobar" }, { status: 404 });
    }

    const { count } = await prisma.printOrder.updateMany({
      where: { id: order.id, status: "AWAITING_APPROVAL" },
      data: { status: "PAID", approvedAt: new Date() },
    });
    if (count === 1) {
      const title = book.title || `El libro de ${book.kidName}`;
      log.info({ orderId: order.id }, "Pedido impreso aprobado por el cliente");
      await sendPrintOrderAdminEmail({ orderId: order.id, title, shippingName: order.shippingName });
      if (order.email) {
        await sendPrintOrderConfirmationEmail({ to: order.email, kidName: book.kidName, title });
      }
    }
    return NextResponse.json({ approved: true });
  } catch (error) {
    log.error({ err: error }, "Error aprobando el pedido impreso");
    return NextResponse.json({ error: "No se pudo aprobar" }, { status: 500 });
  }
}
