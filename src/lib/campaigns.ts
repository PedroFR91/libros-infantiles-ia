// Campañas de temporada (sin dependencias de servidor: las usan la landing,
// el asistente y el checkout). Para cambiar fechas, descuentos o textos se
// edita solo esta lista.
//
// Descuentos y normativa (art. 20 Ley de Comercio Minorista, Directiva
// Omnibus): si se muestra un precio "antes", tiene que ser el más bajo de los
// 30 días anteriores. Por eso las campañas NO tachan precios: anuncian el
// descuento y el precio final. Solo se aplica un descuento por pedido (el
// mayor entre el precio fundador y la campaña activa).

export interface Campaign {
  id: string;
  name: string;
  /** Inicio y fin, fecha y hora de Madrid (inclusive) */
  start: string;
  end: string;
  /** Franja superior de la landing y el editor */
  banner: string;
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
}

export const CAMPAIGNS: Campaign[] = [
  {
    id: "halloween-2026",
    name: "Halloween",
    start: "2026-10-15T00:00:00+02:00",
    end: "2026-10-31T23:59:59+01:00",
    banner: "🎃 Cuentos de Halloween que no dan miedo: −15 % hasta el 31 de octubre",
    discountPercent: 15,
    appliesTo: ["digital", "repeat", "bundle", "print"],
    themes: [
      { id: "una noche de Halloween divertida y nada terrorífica", label: "Halloween", emoji: "🎃" },
      { id: "un monstruo simpático que tiene miedo a la oscuridad", label: "Monstruo simpático", emoji: "👻" },
    ],
    landingPath: "/cuentos/halloween",
    printDeadline: "Para tenerlo en papel antes del 31, pídelo antes del 20 de octubre.",
  },
  {
    id: "black-friday-2026",
    name: "Black Friday",
    start: "2026-11-23T00:00:00+01:00",
    end: "2026-11-30T23:59:59+01:00",
    banner: "Black Friday: −25 % en todos los cuentos, también impresos, hasta el lunes 30",
    discountPercent: 25,
    appliesTo: ["digital", "repeat", "bundle", "print"],
    themes: [],
    landingPath: "/cuentos/black-friday",
    printDeadline: "Con tiempo de sobra para Navidad.",
  },
  {
    id: "navidad-2026",
    name: "Navidad",
    start: "2026-12-01T00:00:00+01:00",
    end: "2026-12-24T23:59:59+01:00",
    banner: "🎄 Regala su cuento esta Navidad · impreso: pídelo antes del 5 de diciembre",
    discountPercent: null,
    appliesTo: [],
    themes: [
      { id: "una Nochebuena mágica ayudando a Papá Noel", label: "Navidad", emoji: "🎄" },
      { id: "un muñeco de nieve que quiere conocer el verano", label: "Muñeco de nieve", emoji: "⛄" },
    ],
    landingPath: "/cuentos/regalo-navidad",
    printDeadline: "Impreso para Navidad: pídelo antes del 5 de diciembre. Después, el PDF llega al momento.",
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
    printDeadline: "Para Reyes el impreso ya no llega a tiempo: regala el PDF y pide el impreso después.",
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
  return {
    id: c.id,
    name: c.name,
    banner: c.banner,
    discountPercent: c.discountPercent,
    appliesTo: c.appliesTo,
    themes: c.themes,
    landingPath: c.landingPath ?? null,
    printDeadline: c.printDeadline ?? null,
    endsAt: c.end,
  };
}
