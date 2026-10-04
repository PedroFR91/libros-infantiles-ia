// Campañas de temporada (sin dependencias de servidor: las usan la landing,
// el asistente y el checkout). Para cambiar fechas, descuentos o textos se
// edita solo esta lista.
//
// Descuentos y normativa (art. 20 Ley de Comercio Minorista, Directiva
// Omnibus): si se muestra un precio "antes", tiene que ser el más bajo de los
// 30 días anteriores. Por eso las campañas NO tachan precios: anuncian el
// descuento y el precio final. Solo se aplica un descuento por pedido (el
// mayor entre el precio fundador y la campaña activa).

import { PRINT_ENABLED } from "@/lib/pricing";

export interface Campaign {
  id: string;
  name: string;
  /** Inicio y fin, fecha y hora de Madrid (inclusive) */
  start: string;
  end: string;
  /** Franja superior de la landing y el editor (válida aunque no haya impreso) */
  banner: string;
  /** Franja alternativa cuando el impreso está a la venta (PRINT_ENABLED) */
  printBanner?: string;
  /** Descuento automático en el pago (porcentaje) o null si solo es temática */
  discountPercent: number | null;
  /** Productos a los que se aplica el descuento */
  appliesTo: ("digital" | "repeat" | "bundle" | "print")[];
  /** Temas sugeridos en el asistente durante la campaña */
  themes: { id: string; label: string; emoji: string }[];
  /** Página de la campaña (SEO) */
  landingPath?: string;
  /** Fecha límite honesta para recibir el impreso (texto) */
  printDeadline?: string;
  /**
   * Regalo en vez de rebaja: libros digitales extra al pagar el pack
   * ("bundle") o un cuento en PDF ("pdf": digital u otro cuento)
   */
  bonus?: { onProduct: "bundle" | "pdf"; credits: number; label: string };
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "halloween-2026",
    name: "Halloween",
    start: "2026-10-04T00:00:00+02:00",
    end: "2026-10-31T23:59:59+01:00",
    banner: "🎃 Cuentos de Halloween que no dan miedo · el PDF llega al momento",
    // Sin rebaja extra: ya está el precio fundador (−20 %)
    discountPercent: null,
    appliesTo: [],
    themes: [
      { id: "una noche de Halloween divertida y nada terrorífica", label: "Halloween", emoji: "🎃" },
      { id: "un monstruo simpático que tiene miedo a la oscuridad", label: "Monstruo simpático", emoji: "👻" },
    ],
    landingPath: "/cuentos/halloween",
    printDeadline: "Este año, para Halloween, el cuento en PDF: llega al momento.",
  },
  {
    id: "black-friday-2026",
    name: "Black Friday",
    start: "2026-11-23T00:00:00+01:00",
    end: "2026-11-30T23:59:59+01:00",
    banner: "Black Friday: con tu cuento en PDF, te regalamos otro cuento (hasta el lunes 30)",
    printBanner: "Black Friday: con el cuento impreso + PDF, te regalamos otro cuento en PDF (hasta el lunes 30)",
    // Regalo en vez de rebaja (precio de referencia, art. 20 LCM)
    discountPercent: null,
    appliesTo: [],
    bonus: PRINT_ENABLED
      ? { onProduct: "bundle", credits: 5, label: "Otro cuento en PDF de regalo" }
      : { onProduct: "pdf", credits: 5, label: "Otro cuento en PDF de regalo" },
    themes: [],
    landingPath: "/cuentos/black-friday",
    printDeadline: "Con tiempo de sobra para Navidad.",
  },
  {
    id: "navidad-2026",
    name: "Navidad",
    start: "2026-12-01T00:00:00+01:00",
    end: "2026-12-24T23:59:59+01:00",
    banner: "🎄 Regala su cuento esta Navidad · el PDF llega al momento",
    printBanner: "🎄 Regala su cuento esta Navidad · impreso: pídelo antes del 7 de diciembre",
    discountPercent: null,
    appliesTo: [],
    themes: [
      { id: "una Nochebuena mágica ayudando a Papá Noel", label: "Navidad", emoji: "🎄" },
      { id: "un muñeco de nieve que quiere conocer el verano", label: "Muñeco de nieve", emoji: "⛄" },
    ],
    landingPath: "/cuentos/regalo-navidad",
    printDeadline: "Impreso para Navidad: pídelo antes del 7 de diciembre. Después, el PDF llega al momento.",
  },
  {
    id: "reyes-2027",
    name: "Reyes",
    start: "2026-12-25T00:00:00+01:00",
    end: "2027-01-06T12:00:00+01:00",
    banner: "👑 Para Reyes: el cuento en PDF llega al momento, con dedicatoria de Sus Majestades",
    discountPercent: null,
    appliesTo: [],
    themes: [
      { id: "la noche de Reyes ayudando a los Reyes Magos a repartir regalos", label: "Reyes Magos", emoji: "👑" },
    ],
    landingPath: "/cuentos/reyes-magos",
    printDeadline: "Impreso para Reyes: pídelo antes del 18 de diciembre. Después, regala el PDF y pásalo a papel en enero.",
  },
];

export function getActiveCampaign(now: Date = new Date()): Campaign | null {
  const t = now.getTime();
  return (
    CAMPAIGNS.find((c) => new Date(c.start).getTime() <= t && t <= new Date(c.end).getTime()) ?? null
  );
}

/** Datos públicos de la campaña activa (para /api/offer) */
export function publicCampaign(now?: Date) {
  const c = getActiveCampaign(now);
  if (!c) return null;
  const printLive = PRINT_ENABLED;
  return {
    id: c.id,
    name: c.name,
    banner: printLive && c.printBanner ? c.printBanner : c.banner,
    discountPercent: c.discountPercent,
    appliesTo: c.appliesTo,
    themes: c.themes,
    landingPath: c.landingPath ?? null,
    printDeadline: printLive ? (c.printDeadline ?? null) : null,
    bonus: c.bonus && (printLive || c.bonus.onProduct !== "bundle") ? c.bonus : null,
    endsAt: c.end,
  };
}
