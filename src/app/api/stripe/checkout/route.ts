import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import type Stripe from "stripe";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  BUNDLE_PRODUCT,
  CREDIT_PACKS,
  EXTRA_COPY,
  PRINT_PRODUCT,
  formatEuros,
} from "@/lib/pricing";
import { getOrCreateUser } from "@/lib/credits";
import { auth } from "@/lib/auth";
import { checkoutSchema, validateBody } from "@/lib/validation";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { applyPercent, getFounderState, resolveDiscount, stripeDiscounts } from "@/lib/offer";
import { publicCampaign } from "@/lib/campaigns";
import { appUrl } from "@/lib/appUrl";
import { createLogger } from "@/lib/logger";

const log = createLogger("checkout");

// POST /api/stripe/checkout - Pago del cuento
//   digital: el libro que acaba de crear (9,90 €)
//   repeat:  otro cuento para quien ya compró alguno (5,90 €)
//   bundle:  impreso + PDF en un solo pago, con dirección de envío (34,90 €);
//            no se imprime hasta que el cliente aprueba el libro terminado
// El precio fundador se aplica solo (sin códigos). Tras pagar, el webhook
// ilustra el libro aunque el comprador no vuelva a la web.
export async function POST(request: NextRequest) {
  try {
    const validation = validateBody(checkoutSchema, await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Opción no válida" }, { status: 400 });
    }
    const { product, bookId, extraCopies } = validation.data;

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResponse = checkRateLimit(`checkout:${clientIp}`, RATE_LIMIT_PRESETS.checkout);
    if (rateLimitResponse) return rateLimitResponse;

    // Usuario: sesión de NextAuth o anónimo por cookie
    const session = await auth();
    let user;
    let sessionId: string | undefined;
    if (session?.user?.id) {
      user = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
    } else {
      const cookieStore = await cookies();
      sessionId = cookieStore.get("sessionId")?.value || uuidv4();
      user = await getOrCreateUser(sessionId);
    }

    const book = bookId
      ? await prisma.book.findFirst({
          where: { id: bookId, userId: user.id },
          select: { id: true, title: true, kidName: true, status: true },
        })
      : null;
    if (product === "bundle" && !book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }
    if (product === "repeat") {
      const bought = await prisma.payment.count({
        where: { userId: user.id, status: "COMPLETED" },
      });
      if (bought === 0) {
        return NextResponse.json({ error: "Opción no disponible" }, { status: 400 });
      }
    }

    const discount = await resolveDiscount(product);
    const discounts = await stripeDiscounts(discount);
    const percent = discounts.length > 0 && discount ? discount.percent : 0;
    const title = book ? book.title || `El cuento de ${book.kidName}` : null;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const pack = product === "repeat" ? CREDIT_PACKS.repeat : CREDIT_PACKS.digital;
    if (product === "bundle") {
      lineItems.push(priceLine(`${BUNDLE_PRODUCT.name} · «${title}»`, BUNDLE_PRODUCT.description, BUNDLE_PRODUCT.price, 1));
      if (extraCopies > 0) {
        lineItems.push(priceLine("Copia extra del mismo libro", "Para los abuelos, los tíos… al mismo envío", EXTRA_COPY.price, extraCopies));
      }
    } else {
      lineItems.push(priceLine(title ? `${pack.name} · «${title}»` : pack.name, pack.description, pack.price, 1));
    }

    const returnTo = book ? `/editor?bookId=${book.id}` : "/editor";
    const stripeSession = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(discounts.length > 0 && { discounts }),
      ...(product === "bundle" && {
        shipping_address_collection: { allowed_countries: [...PRINT_PRODUCT.shippingCountries] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: 0, currency: "eur" },
              display_name: "Envío a domicilio incluido",
              delivery_estimate: {
                minimum: { unit: "business_day", value: PRINT_PRODUCT.deliveryDays.min },
                maximum: { unit: "business_day", value: PRINT_PRODUCT.deliveryDays.max },
              },
            },
          },
        ],
        phone_number_collection: { enabled: true },
      }),
      custom_text: {
        submit: {
          message:
            product === "bundle"
              ? "Ilustramos tu cuento al momento y lo imprimimos cuando lo apruebes. Al ser personalizado no hay desistimiento, pero sí nuestra garantía: rehacemos lo que no te convenza."
              : "Ilustramos tu cuento al momento. Al ser contenido digital personalizado no hay desistimiento, pero sí nuestra garantía: rehacemos lo que no te convenza o te devolvemos el dinero.",
        },
      },
      ...(user.email && { customer_email: user.email }),
      success_url: appUrl(`${returnTo}${book ? "&" : "?"}paid=1`),
      cancel_url: appUrl(`${returnTo}${book ? "&" : "?"}canceled=1`),
      metadata: {
        type: product,
        userId: user.id,
        credits: pack.credits.toString(),
        ...(book && { bookId: book.id }),
        termsAcceptedAt: new Date().toISOString(),
      },
    });

    // La parte digital va a Payment (abona créditos) y la impresa a PrintOrder;
    // los importes se reparten con el descuento aplicado para no contar doble
    await prisma.payment.create({
      data: {
        userId: user.id,
        stripeSessionId: stripeSession.id,
        amount: applyPercent(pack.price, percent),
        currency: "eur",
        status: "PENDING",
        creditsGranted: pack.credits,
      },
    });
    if (product === "bundle" && book) {
      await prisma.printOrder.create({
        data: {
          userId: user.id,
          bookId: book.id,
          stripeSessionId: stripeSession.id,
          kind: "bundle",
          quantity: 1 + extraCopies,
          amount: applyPercent(BUNDLE_PRODUCT.price - pack.price + extraCopies * EXTRA_COPY.price, percent),
          status: "PENDING_PAYMENT",
        },
      });
    }

    log.info({ product, extraCopies, discount: discount?.label ?? null }, "Checkout creado");
    const response = NextResponse.json({ url: stripeSession.url });
    if (sessionId && !session?.user?.id) {
      response.cookies.set("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return response;
  } catch (error) {
    log.error({ err: error }, "Error creando checkout");
    return NextResponse.json({ error: "Error al crear el pago" }, { status: 500 });
  }
}

// GET /api/stripe/checkout - Precios para el editor con el descuento vigente
// (fundador o campaña, el mayor). No se envía precio "antes" para tachar: la
// interfaz muestra la etiqueta del descuento y el precio final.
export async function GET() {
  const founder = await getFounderState().catch(() => ({ active: false, remaining: 0, percent: 0 }));
  const price = async (cents: number, product: "digital" | "repeat" | "bundle" | "print") => {
    const discount = await resolveDiscount(product, founder);
    const final = applyPercent(cents, discount?.percent ?? 0);
    return {
      price: final,
      regular: cents,
      formatted: formatEuros(final),
      regularFormatted: formatEuros(cents),
      discountLabel: discount?.label ?? null,
    };
  };
  return NextResponse.json({
    founder,
    campaign: publicCampaign(),
    digital: await price(CREDIT_PACKS.digital.price, "digital"),
    repeat: await price(CREDIT_PACKS.repeat.price, "repeat"),
    bundle: await price(BUNDLE_PRODUCT.price, "bundle"),
    print: await price(PRINT_PRODUCT.price, "print"),
    extraCopy: await price(EXTRA_COPY.price, "bundle"),
  });
}

function priceLine(
  name: string,
  description: string,
  unitAmount: number,
  quantity: number,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    price_data: {
      currency: "eur",
      product_data: { name, description },
      unit_amount: unitAmount,
    },
    quantity,
  };
}
