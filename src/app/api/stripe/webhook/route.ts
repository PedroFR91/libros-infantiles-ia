import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { createLogger } from "@/lib/logger";
import {
  sendIllustratingEmail,
  sendPrintOrderAdminEmail,
  sendPrintOrderConfirmationEmail,
} from "@/lib/email";
import { unlockAndIllustrate } from "@/lib/unlock";
import { getActiveCampaign } from "@/lib/campaigns";

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
          // Importe real cobrado (con descuento puede ser menor). En el pack
          // impreso + PDF el reparto ya se guardó al crear el pago.
          ...(session.amount_total != null &&
            session.metadata?.type !== "bundle" && { amount: session.amount_total }),
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

      return { balance: user.credits, ownerId };
    },
  );

  if (newBalance === null) {
    const existing = await prisma.payment.findUnique({
      where: { stripeSessionId: session.id },
      select: { status: true, userId: true },
    });
    if (!existing) {
      log.error({ sessionId: session.id }, "Payment no encontrado");
    } else if (existing.status === "COMPLETED") {
      // Reintento de Stripe tras un fallo después de abonar: repetir el paso
      // posterior (idempotente: pedido, ilustración y emails no se duplican)
      log.warn({ sessionId: session.id }, "Pago ya abonado: se repite el paso posterior");
      await afterDigitalPayment(session, existing.userId);
    } else {
      log.warn(
        { sessionId: session.id, status: existing.status },
        "Payment ya procesado, evento ignorado",
      );
    }
    return;
  }

  log.info(
    { userId: newBalance.ownerId, credits: creditsToAdd, balance: newBalance.balance },
    "Créditos añadidos",
  );

  await afterDigitalPayment(session, newBalance.ownerId);
}

/**
 * Tras cobrar un cuento: ilustrarlo desde aquí (no depende de que el comprador
 * vuelva a la web), dejar el pedido impreso del pack pendiente de aprobación y
 * enviar el enlace privado al cuento.
 */
async function afterDigitalPayment(session: Stripe.Checkout.Session, ownerId: string) {
  const bookId = session.metadata?.bookId;
  const type = session.metadata?.type;
  if (!bookId) return;

  if (type === "bundle") {
    await updatePrintOrderFromSession(session, "AWAITING_APPROVAL");
    await grantCampaignBonus(session, ownerId);
  }

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { title: true, kidName: true, leadEmail: true },
  });
  if (!book) return;

  // Email del comprador para la secuencia; ya ha pagado, así que no le tocan
  // los emails de borrador (portada de muestra, recordatorio)
  const buyerEmail = session.customer_details?.email ?? null;
  await prisma.book.update({
    where: { id: bookId },
    data: {
      ...(buyerEmail && !book.leadEmail && { leadEmail: buyerEmail.toLowerCase() }),
      leadPreviewSentAt: new Date(),
      reminderSentAt: new Date(),
    },
  });

  const result = await unlockAndIllustrate(bookId, ownerId);
  if (!result.ok && result.reason !== "busy" && result.reason !== "done") {
    log.error({ bookId, reason: result.reason }, "No se pudo ilustrar tras el pago");
  }

  // Solo la primera vez que se lanza (en un reintento ya estaba en marcha)
  if (buyerEmail && result.ok) {
    await sendIllustratingEmail({
      to: buyerEmail,
      kidName: book.kidName,
      title: book.title || `El cuento de ${book.kidName}`,
      bookId,
      withPrint: type === "bundle",
    });
  }
}

/** Guarda destinatario y estado de un pedido impreso a partir del pago */
async function updatePrintOrderFromSession(
  session: Stripe.Checkout.Session,
  status: "PAID" | "AWAITING_APPROVAL",
) {
  const shipping = session.collected_information?.shipping_details;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Idempotente: solo desde PENDING_PAYMENT, una vez
  const { count } = await prisma.printOrder.updateMany({
    where: { stripeSessionId: session.id, status: "PENDING_PAYMENT" },
    data: {
      status,
      ...(status === "PAID" && { approvedAt: new Date() }),
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
  if (count === 0) return null;
  return prisma.printOrder.findUnique({
    where: { stripeSessionId: session.id },
    include: { book: { select: { title: true, kidName: true } } },
  });
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

  if (session.metadata?.type === "bundle") {
    await prisma.printOrder.updateMany({
      where: { stripeSessionId: session.id, status: "PENDING_PAYMENT" },
      data: { status: "CANCELED" },
    });
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

  // Los reembolsos parciales (una copia extra, solo el digital del pack…) se
  // gestionan a mano: no cancelan el pedido entero
  if (!charge.refunded) {
    log.warn(
      { paymentIntentId, refunded: charge.amount_refunded, amount: charge.amount },
      "Reembolso parcial: revisar el pedido a mano",
    );
    return;
  }

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
      status: { in: ["AWAITING_APPROVAL", "PAID", "IN_PRODUCTION"] },
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
  const order = await updatePrintOrderFromSession(session, "PAID");
  if (!order) {
    log.warn({ sessionId: session.id }, "Pedido impreso ya procesado o inexistente");
    return;
  }
  const title = order.book.title || `El libro de ${order.book.kidName}`;
  log.info({ orderId: order.id }, "Pedido impreso pagado");

  await sendPrintOrderAdminEmail({ orderId: order.id, title, shippingName: order.shippingName });
  if (order.email) {
    await sendPrintOrderConfirmationEmail({ to: order.email, kidName: order.book.kidName, title });
  }
}

/**
 * Regalo de campaña (p. ej. Black Friday: otro cuento en PDF al comprar el
 * pack). Una sola vez por pago, aunque Stripe reintente el evento.
 */
async function grantCampaignBonus(session: Stripe.Checkout.Session, ownerId: string) {
  const bonus = getActiveCampaign()?.bonus;
  if (!bonus || bonus.onProduct !== "bundle") return;
  const referenceId = `bonus-${session.id}`;
  const already = await prisma.creditLedger.findFirst({ where: { referenceId } });
  if (already) return;
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.update({
      where: { id: ownerId },
      data: { credits: { increment: bonus.credits } },
      select: { credits: true },
    });
    await tx.creditLedger.create({
      data: { userId: ownerId, amount: bonus.credits, reason: "campaign_bonus", referenceId, balance: user.credits },
    });
  });
  log.info({ ownerId, credits: bonus.credits }, "Regalo de campaña abonado");
}
