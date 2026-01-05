import { NextRequest, NextResponse } from "next/server";
import { getStripe, CREDIT_PACKS, CreditPackKey } from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/credits";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import { auth } from "@/lib/auth";

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

    // PRIMERO: Verificar si hay usuario autenticado con NextAuth
    const session = await auth();
    let user;
    let sessionId: string | undefined;

    if (session?.user?.id) {
      // Usuario autenticado - usar su ID directamente
      user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Usuario no encontrado" },
          { status: 404 }
        );
      }

      console.log("Checkout para usuario autenticado:", user.email);
    } else {
      // Usuario anónimo - usar cookie sessionId
      const cookieStore = await cookies();
      sessionId = cookieStore.get("sessionId")?.value;

      if (!sessionId) {
        sessionId = uuidv4();
      }

      // Obtener o crear usuario anónimo
      user = await getOrCreateUser(sessionId);
      console.log("Checkout para usuario anónimo:", sessionId);
    }

    // Crear sesión de Stripe
    const baseUrl =
      process.env.AUTH_URL || process.env.BASE_URL || "http://localhost:3000";

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
        isAuthenticated: session?.user?.id ? "true" : "false",
      },
      // Pre-rellenar email si el usuario está autenticado
      ...(user.email && { customer_email: user.email }),
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

    // Solo establecer cookie si es usuario anónimo
    if (sessionId) {
      response.cookies.set("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

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
