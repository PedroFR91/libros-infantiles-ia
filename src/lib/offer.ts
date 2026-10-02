import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { FOUNDER_OFFER } from "@/lib/pricing";
import { createLogger } from "@/lib/logger";

const log = createLogger("offer");

// Cupón de Stripe con id fijo: se crea solo la primera vez (en test y en live)
const FOUNDER_COUPON_ID = "FUNDADOR20";

export interface FounderState {
  active: boolean;
  remaining: number;
  percent: number;
}

/**
 * Precio fundador: −20 % automático en los primeros pedidos pagados.
 * Cuenta pagos digitales completados (incluye los packs impreso + PDF) y los
 * pedidos de "pasar a papel" pagados.
 */
export async function getFounderState(): Promise<FounderState> {
  const [digital, printUpgrades] = await Promise.all([
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.printOrder.count({
      where: {
        kind: "upgrade",
        status: { notIn: ["PENDING_PAYMENT", "CANCELED"] },
      },
    }),
  ]);
  const remaining = Math.max(0, FOUNDER_OFFER.limit - digital - printUpgrades);
  return { active: remaining > 0, remaining, percent: FOUNDER_OFFER.percent };
}

/** Descuento a aplicar en el checkout (vacío si la oferta ha terminado) */
export async function founderDiscounts(): Promise<{ coupon: string }[]> {
  const state = await getFounderState();
  if (!state.active) return [];
  const stripe = getStripe();
  try {
    await stripe.coupons.retrieve(FOUNDER_COUPON_ID);
  } catch {
    try {
      await stripe.coupons.create({
        id: FOUNDER_COUPON_ID,
        percent_off: FOUNDER_OFFER.percent,
        duration: "once",
        name: `Precio fundador −${FOUNDER_OFFER.percent} %`,
      });
    } catch (error) {
      // Carrera: otro checkout lo acaba de crear
      try {
        await stripe.coupons.retrieve(FOUNDER_COUPON_ID);
      } catch {
        // Sin cupón se cobra el precio normal antes que fallar el pago
        log.error({ err: error }, "No se pudo crear el cupón fundador");
        return [];
      }
    }
  }
  return [{ coupon: FOUNDER_COUPON_ID }];
}

export function applyDiscount(cents: number, discounted: boolean): number {
  return discounted ? Math.round((cents * (100 - FOUNDER_OFFER.percent)) / 100) : cents;
}
