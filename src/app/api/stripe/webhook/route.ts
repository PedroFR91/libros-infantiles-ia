import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Stripe from "stripe";
import { createLogger } from "@/lib/logger";

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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        log.info({ paymentId: paymentIntent.id }, "Payment succeeded");
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
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
        data: { status: "COMPLETED", stripePaymentId: paymentIntentId },
      });

      if (claimed.count === 0) return null;

      const payment = await tx.payment.findUniqueOrThrow({
        where: { stripeSessionId: session.id },
        select: { id: true },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: creditsToAdd } },
        select: { credits: true },
      });

      await tx.creditLedger.create({
        data: {
          userId,
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

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Buscar payment por stripePaymentId
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: paymentIntent.id },
  });

  if (payment) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
  }

  log.warn({ paymentId: paymentIntent.id }, "Pago fallido");
}
