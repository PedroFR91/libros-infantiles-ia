import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { addCredits } from "@/lib/credits";
import Stripe from "stripe";

// POST /api/stripe/webhook - Webhook de Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "No stripe-signature header" },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET no configurado");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Error verificando firma webhook:", err);
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
        console.log("Payment succeeded:", paymentIntent.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error procesando webhook:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { userId, credits } = session.metadata || {};

  if (!userId || !credits) {
    console.error("Metadata incompleta en checkout session");
    return;
  }

  const creditsToAdd = parseInt(credits, 10);

  // Actualizar payment
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: session.id },
  });

  if (!payment) {
    console.error("Payment no encontrado para session:", session.id);
    return;
  }

  if (payment.status === "COMPLETED") {
    console.log("Payment ya procesado:", session.id);
    return;
  }

  // Marcar como completado
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: "COMPLETED",
      stripePaymentId: session.payment_intent as string,
    },
  });

  // Añadir créditos
  await addCredits(userId, creditsToAdd, payment.id);

  console.log(`✅ Añadidos ${creditsToAdd} créditos al usuario ${userId}`);
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

  console.log("❌ Pago fallido:", paymentIntent.id);
}
