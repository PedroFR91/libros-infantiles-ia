import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { EXTRA_COPY, PRINT_ENABLED, PRINT_PRODUCT } from "@/lib/pricing";
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
    if (!PRINT_ENABLED) {
      return NextResponse.json(
        { error: "El cuento impreso estará disponible muy pronto." },
        { status: 400 },
      );
    }
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    const { bookId, extraCopies } = validation.data;

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
      ],
      shipping_address_collection: {
        allowed_countries: [...PRINT_PRODUCT.shippingCountries],
      },
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
        amount: price(PRINT_PRODUCT.price) + extraCopies * price(EXTRA_COPY.price),
        status: "PENDING_PAYMENT",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    log.error({ err: error }, "Error creando checkout del impreso");
    return NextResponse.json({ error: "Error al crear el pago" }, { status: 500 });
  }
}
