import Stripe from "stripe";

// Lazy initialization para evitar errores en build time
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY no está configurada");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return stripeInstance;
}

// Alias para compatibilidad
export const stripe = {
  get checkout() {
    return getStripe().checkout;
  },
  get webhooks() {
    return getStripe().webhooks;
  },
};

// Configuración de precios de créditos
export const CREDIT_PACKS = {
  small: {
    credits: 5,
    price: 499, // centimos
    priceId: process.env.STRIPE_PRICE_5_CREDITS || "",
    name: "5 Créditos",
    description: "Genera 1 libro completo",
  },
  medium: {
    credits: 15,
    price: 1299,
    priceId: process.env.STRIPE_PRICE_15_CREDITS || "",
    name: "15 Créditos",
    description: "Genera 3 libros completos",
    popular: true,
  },
  large: {
    credits: 30,
    price: 2299,
    priceId: process.env.STRIPE_PRICE_30_CREDITS || "",
    name: "30 Créditos",
    description: "Genera 6 libros completos",
  },
} as const;

// Costes en créditos
export const CREDIT_COSTS = {
  BOOK_GENERATION: 5, // Generar libro completo
  PAGE_REGENERATION: 1, // Regenerar una página
} as const;

export type CreditPackKey = keyof typeof CREDIT_PACKS;
