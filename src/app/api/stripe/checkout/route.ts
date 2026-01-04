import { NextRequest, NextResponse } from "next/server";
import { getStripe, CREDIT_PACKS, CreditPackKey } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

// POST /api/stripe/checkout - Crear sesión de checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packId } = body as { packId: CreditPackKey };

    if (!packId || !CREDIT_PACKS[packId]) {
      return NextResponse.json({ error: "Pack no válido" }, { status: 400 });
    }

    const pack = CREDIT_PACKS[packId];
    const stripe = getStripe();

    // Obtener o crear sessionId
    const cookieStore = await cookies();
    let sessionId = cookieStore.get("sessionId")?.value;

    if (!sessionId) {
      sessionId = uuidv4();
    }

    // Obtener o crear usuario
    const user = await getOrCreateUser(sessionId);

    // Crear sesión de Stripe
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: pack.name,
              description: pack.description,
            },
            unit_amount: pack.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/editor?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/editor?canceled=true`,
      metadata: {
        userId: user.id,
        packId,
        credits: pack.credits.toString(),
      },
    });

    // Guardar payment pendiente
    await prisma.payment.create({
      data: {
        userId: user.id,
        stripeSessionId: checkoutSession.id,
        amount: pack.price,
        currency: "eur",
        status: "PENDING",
        creditsGranted: pack.credits,
      },
    });

    const response = NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

    // Establecer cookie
    response.cookies.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error("Error creando checkout:", error);
    return NextResponse.json(
      { error: "Error al crear checkout" },
      { status: 500 }
    );
  }
}

// GET /api/stripe/checkout - Obtener packs disponibles
export async function GET() {
  const packs = Object.entries(CREDIT_PACKS).map(([id, pack]) => ({
    id,
    ...pack,
    priceFormatted: `€${(pack.price / 100).toFixed(2)}`,
  }));

  return NextResponse.json({ packs });
}
