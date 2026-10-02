import Stripe from "stripe";

// Lazy initialization para evitar errores en build time
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY no está configurada");
    }
    // Sin apiVersion: usa la versión fijada por el SDK (stripe@20 → 2025-12-15.clover)
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
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

export { CREDIT_PACKS, formatEuros } from "./pricing";
import { CREDIT_PACKS } from "./pricing";

// Costes en créditos
export const CREDIT_COSTS = {
  BOOK_GENERATION: 5, // Generar libro completo
  PAGE_REGENERATION: 1, // Regenerar una página
} as const;

export type CreditPackKey = keyof typeof CREDIT_PACKS;
