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
 * Precio fundador: precio de lanzamiento automático (redondeado a x,90) en los
 * primeros pedidos pagados.
 * Cuenta pagos digitales completados (incluye los packs impreso + PDF) y los
 * pedidos de "pasar a papel" pagados.
 */
export async function getFounderState(): Promise<FounderState> {
  const [digital, printUpgrades] = await Promise.all([
    // Solo pagos reales (modo live): las pruebas no gastan plazas fundador
    prisma.payment.count({
      where: { status: "COMPLETED", stripeSessionId: { startsWith: "cs_live_" } },
    }),
    prisma.printOrder.count({
      where: {
        kind: "upgrade",
        status: { notIn: ["PENDING_PAYMENT", "CANCELED"] },
        stripeSessionId: { startsWith: "cs_live_" },
      },
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
      label: "Precio fundador",
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

/** Al x,90 más cercano: 7,92 → 7,90 · 4,72 → 4,90 · 20,00 → 19,90 */
function roundToNinety(cents: number): number {
  return Math.max(90, Math.round((cents - 90) / 100) * 100 + 90);
}

/**
 * Precio final de un producto con el descuento vigente. El fundador se
 * redondea a un precio "de verdad" (7,90 €, no 7,92 €); una campaña con
 * porcentaje se aplica exacto porque se anuncia con ese porcentaje.
 * Se cobra este importe directamente en Stripe (sin cupones).
 */
export function offerPrice(cents: number, discount: Discount | null): number {
  if (!discount) return cents;
  const exact = applyPercent(cents, discount.percent);
  return discount.source === "founder" ? roundToNinety(exact) : exact;
}
