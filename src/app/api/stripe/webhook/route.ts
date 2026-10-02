import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { createLogger } from "@/lib/logger";
import {
  sendPrintOrderAdminEmail,
  sendPrintOrderConfirmationEmail,
} from "@/lib/email";

const log = createLogger("stripe-webhook");

// POST /api/stripe/webhook - Webhook de Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No stripe-signature header" },
        { status: 400 },
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      log.error("STRIPE_WEBHOOK_SECRET no configurado");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      log.error({ err }, "Error verificando firma webhook");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Procesar eventos
    switch (event.type) {
      // Con métodos asíncronos (SEPA, etc.) la sesión se completa antes de
      // cobrar: solo abonamos si ya está pagada, o al llegar async_payment_succeeded.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status === "paid") {
          await handleCheckoutCompleted(session);
        } else {
          log.info(
            { sessionId: session.id, paymentStatus: session.payment_status },
            "Checkout completado, pago pendiente",
          );
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutFailed(session, event.type);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      default:
        log.debug({ eventType: event.type }, "Evento no manejado");
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    log.error({ err: error }, "Error procesando webhook");
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.metadata?.type === "print") {
    await handlePrintPaid(session);
    return;
  }

  const { userId, credits } = session.metadata || {};

  if (!userId || !credits) {
    log.error("Metadata incompleta en checkout session");
    return;
  }

  const creditsToAdd = parseInt(credits, 10);
  if (!Number.isInteger(creditsToAdd) || creditsToAdd <= 0) {
    log.error({ credits }, "Metadata de créditos inválida");
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Idempotente y atómico: el payment solo pasa de PENDING a COMPLETED una vez,
  // aunque Stripe reenvíe el evento en paralelo. Créditos y ledger van en la
  // misma transacción, así nunca queda un pago COMPLETED sin créditos abonados.
  const newBalance = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const claimed = await tx.payment.updateMany({
        where: { stripeSessionId: session.id, status: "PENDING" },
        data: {
          status: "COMPLETED",
          stripePaymentId: paymentIntentId,
          customerEmail: session.customer_details?.email ?? null,
          // Importe real cobrado (con código promocional puede ser menor)
          ...(session.amount_total != null && { amount: session.amount_total }),
        },
      });

      if (claimed.count === 0) return null;

      // El dueño es el de la fila Payment: si el comprador anónimo inició
      // sesión antes del webhook, la fusión ya la movió a su cuenta
      const payment = await tx.payment.findUniqueOrThrow({
        where: { stripeSessionId: session.id },
        select: { id: true, userId: true },
      });
      const ownerId = payment.userId;

      const user = await tx.user.update({
        where: { id: ownerId },
        data: { credits: { increment: creditsToAdd } },
        select: { credits: true },
      });

      await tx.creditLedger.create({
        data: {
          userId: ownerId,
          amount: creditsToAdd,
          reason: "purchase",
          referenceId: payment.id,
          balance: user.credits,
        },
      });

      return user.credits;
    },
  );

  if (newBalance === null) {
    const existing = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
      select: { status: true },
    });
    if (!existing) {
      log.error({ sessionId: session.id }, "Payment no encontrado");
    } else {
      log.warn(
        { sessionId: session.id, status: existing.status },
        "Payment ya procesado, evento ignorado",
      );
    }
    return;
  }

  log.info(
    { userId, credits: creditsToAdd, balance: newBalance },
    "Créditos añadidos",
  );
}

async function handleCheckoutFailed(
  session: Stripe.Checkout.Session,
  eventType: string,
) {
  if (session.metadata?.type === "print") {
    const { count } = await prisma.printOrder.updateMany({
      where: { stripeSessionId: session.id, status: "PENDING_PAYMENT" },
      data: { status: "CANCELED" },
    });
    log.warn({ sessionId: session.id, eventType, updated: count }, "Pedido impreso no pagado");
    return;
  }

  // Solo los PENDING: un pago ya COMPLETED no se toca
  const { count } = await prisma.payment.updateMany({
    where: { stripeSessionId: session.id, status: "PENDING" },
    data: { status: "FAILED" },
  });

  log.warn({ sessionId: session.id, eventType, updated: count }, "Pago no completado");
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
  if (!paymentIntentId) return;

  // Los créditos no se retiran automáticamente (pueden estar ya gastados);
  // se marca el pago para revisarlo desde el admin.
  const { count } = await prisma.payment.updateMany({
    where: { stripePaymentId: paymentIntentId, status: "COMPLETED" },
    data: { status: "REFUNDED" },
  });

  // Pedido impreso reembolsado: queda cancelado (si no ha salido aún, no imprimir)
  const printCanceled = await prisma.printOrder.updateMany({
    where: {
      stripePaymentId: paymentIntentId,
      status: { in: ["PAID", "IN_PRODUCTION"] },
    },
    data: { status: "CANCELED", notes: "Reembolsado en Stripe" },
  });
  if (printCanceled.count > 0) {
    log.warn({ paymentIntentId }, "Pedido impreso cancelado por reembolso");
  }

  log.warn(
    { paymentIntentId, refunded: charge.amount_refunded, updated: count },
    "Pago reembolsado",
  );
}

// Pedido impreso pagado: guardar destinatario y avisar (producción manual, fase A)
async function handlePrintPaid(session: Stripe.Checkout.Session) {
  const shipping = session.collected_information?.shipping_details;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Idempotente: solo PENDING_PAYMENT → PAID una vez
  const { count } = await prisma.printOrder.updateMany({
    where: { stripeSessionId: session.id, status: "PENDING_PAYMENT" },
    data: {
      status: "PAID",
      stripePaymentId: paymentIntentId,
      email: session.customer_details?.email ?? null,
      shippingName: shipping?.name ?? session.customer_details?.name ?? null,
      shippingPhone: session.customer_details?.phone ?? null,
      shippingAddress: shipping?.address
        ? {
            line1: shipping.address.line1,
            line2: shipping.address.line2,
            city: shipping.address.city,
            postal_code: shipping.address.postal_code,
            state: shipping.address.state,
            country: shipping.address.country,
          }
        : undefined,
    },
  });
  if (count === 0) {
    log.warn({ sessionId: session.id }, "Pedido impreso ya procesado o inexistente");
    return;
  }

  const order = await prisma.printOrder.findUnique({
    where: { stripeSessionId: session.id },
    include: { book: { select: { title: true, kidName: true } } },
  });
  if (!order) return;
  const title = order.book.title || `El libro de ${order.book.kidName}`;
  log.info({ orderId: order.id }, "Pedido impreso pagado");

  await sendPrintOrderAdminEmail({ orderId: order.id, title, shippingName: order.shippingName });
  if (order.email) {
    await sendPrintOrderConfirmationEmail({ to: order.email, kidName: order.book.kidName, title });
  }
}
