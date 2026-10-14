import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  EXTRA_COPY,
  PRINT_ENABLED,
  PRINT_PRODUCT,
  SHIPPING_SURCHARGE,
  shippingZone,
} from "@/lib/pricing";
import { isAdminUser } from "@/lib/adminAuth";
import { offerPrice, resolveDiscount } from "@/lib/offer";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { printCheckoutSchema, validateBody } from "@/lib/validation";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { appUrl } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("checkout-print");

// POST /api/stripe/checkout-print - Pedido del libro impreso (tapa blanda con Bubok, envío incluido)
// No crea filas en Payment (son solo del producto digital): el pedido vive en PrintOrder.
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    // Antes de abrirlo al público, solo los administradores (piloto con Bubok)
    if (!PRINT_ENABLED && !(await isAdminUser(userId))) {
      return NextResponse.json(
        { error: "El cuento impreso estará disponible muy pronto." },
        { status: 400 },
      );
    }

    const rateLimitResponse = checkRateLimit(
      `checkout-print:${userId}`,
      RATE_LIMIT_PRESETS.checkout,
    );
    if (rateLimitResponse) return rateLimitResponse;

    const validation = validateBody(printCheckoutSchema, await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
    }
    const { bookId, extraCopies, shipping } = validation.data;
    const zone = shippingZone(shipping.postalCode);
    if (zone === "invalid" || zone === "unavailable") {
      return NextResponse.json(
        {
          error:
            zone === "unavailable"
              ? "De momento enviamos a la Península y Baleares."
              : "El código postal no es válido.",
        },
        { status: 400 },
      );
    }
    const surcharge = zone === "baleares" ? SHIPPING_SURCHARGE.baleares : 0;

    const book = await prisma.book.findFirst({
      where: { id: bookId, userId },
      include: { user: { select: { email: true } } },
    });
    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }
    if (book.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "El libro tiene que estar terminado para imprimirlo" },
        { status: 400 },
      );
    }

    const title = book.title || `El libro de ${book.kidName}`;
    const discount = await resolveDiscount("print");
    const price = (cents: number) => offerPrice(cents, discount);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${PRINT_PRODUCT.name} · «${title}»`,
              description: PRINT_PRODUCT.description,
            },
            unit_amount: price(PRINT_PRODUCT.price),
          },
          quantity: 1,
        },
        ...(extraCopies > 0
          ? [
              {
                price_data: {
                  currency: "eur",
                  product_data: {
                    name: "Copia extra del mismo libro",
                    description: "Para los abuelos, los tíos… al mismo envío",
                  },
                  unit_amount: price(EXTRA_COPY.price),
                },
                quantity: extraCopies,
              },
            ]
          : []),
        ...(surcharge > 0
          ? [
              {
                price_data: {
                  currency: "eur",
                  product_data: {
                    name: "Suplemento de envío a Baleares",
                    description: `Envío a ${shipping.city} (${shipping.postalCode})`,
                  },
                  unit_amount: surcharge,
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      // Sin códigos promocionales: solo el precio fundador automático
      custom_text: {
        submit: {
          message:
            "Imprimimos tu libro personalizado en cuanto recibimos el pago. Al ser un producto personalizado no admite desistimiento; si llega con un defecto de impresión, lo reponemos.",
        },
      },
      ...(book.user.email && { customer_email: book.user.email }),
      success_url: appUrl(`/editor?bookId=${book.id}&print=ok`),
      cancel_url: appUrl(`/editor?bookId=${book.id}&print=canceled`),
      metadata: {
        type: "print",
        bookId: book.id,
        userId,
        termsAcceptedAt: new Date().toISOString(),
      },
    });

    await prisma.printOrder.create({
      data: {
        userId,
        bookId: book.id,
        stripeSessionId: session.id,
        kind: "upgrade",
        quantity: 1 + extraCopies,
        amount: price(PRINT_PRODUCT.price) + extraCopies * price(EXTRA_COPY.price) + surcharge,
        status: "PENDING_PAYMENT",
        email: book.user.email,
        shippingName: shipping.name,
        shippingPhone: shipping.phone,
        shippingAddress: {
          line1: shipping.line1,
          line2: null,
          city: shipping.city,
          postal_code: shipping.postalCode,
          state: null,
          country: "ES",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    log.error({ err: error }, "Error creando checkout del impreso");
    return NextResponse.json({ error: "Error al crear el pago" }, { status: 500 });
  }
}
