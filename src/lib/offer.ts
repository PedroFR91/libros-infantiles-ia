import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { FOUNDER_OFFER } from "@/lib/pricing";
import { getActiveCampaign } from "@/lib/campaigns";
import { createLogger } from "@/lib/logger";

const log = createLogger("offer");

export type OfferProduct = "digital" | "repeat" | "bundle" | "print";

export interface FounderState {
  active: boolean;
  remaining: number;
  percent: number;
}

export interface Discount {
  percent: number;
  couponId: string;
  source: "founder" | "campaign";
  label: string;
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
      where: { kind: "upgrade", status: { notIn: ["PENDING_PAYMENT", "CANCELED"] } },
    }),
  ]);
  const remaining = Math.max(0, FOUNDER_OFFER.limit - digital - printUpgrades);
  return { active: remaining > 0, remaining, percent: FOUNDER_OFFER.percent };
}

/**
 * Descuento que se aplica a un producto ahora mismo: el mayor entre el precio
 * fundador y la campaña activa (solo uno por pedido).
 */
export async function resolveDiscount(
  product: OfferProduct,
  founder?: FounderState,
): Promise<Discount | null> {
  const f = founder ?? (await getFounderState());
  const candidates: Discount[] = [];
  if (f.active) {
    candidates.push({
      percent: f.percent,
      couponId: `FUNDADOR${f.percent}`,
      source: "founder",
      label: `Precio fundador −${f.percent} %`,
    });
  }
  const campaign = getActiveCampaign();
  if (campaign?.discountPercent && campaign.appliesTo.includes(product)) {
    candidates.push({
      percent: campaign.discountPercent,
      couponId: `${campaign.id.toUpperCase()}-${campaign.discountPercent}`,
      source: "campaign",
      label: `${campaign.name} −${campaign.discountPercent} %`,
    });
  }
  return candidates.sort((a, b) => b.percent - a.percent)[0] ?? null;
}

/** Cupón de Stripe del descuento (lo crea la primera vez); [] si no se puede */
export async function stripeDiscounts(discount: Discount | null): Promise<{ coupon: string }[]> {
  if (!discount) return [];
  const stripe = getStripe();
  try {
    await stripe.coupons.retrieve(discount.couponId);
  } catch {
    try {
      await stripe.coupons.create({
        id: discount.couponId,
        percent_off: discount.percent,
        duration: "once",
        name: discount.label,
      });
    } catch (error) {
      // Carrera: otro checkout lo acaba de crear
      try {
        await stripe.coupons.retrieve(discount.couponId);
      } catch {
        // Sin cupón se cobra el precio normal antes que fallar el pago
        log.error({ err: error, coupon: discount.couponId }, "No se pudo crear el cupón");
        return [];
      }
    }
  }
  return [{ coupon: discount.couponId }];
}

export function applyPercent(cents: number, percent: number): number {
  return percent > 0 ? Math.round((cents * (100 - percent)) / 100) : cents;
}
