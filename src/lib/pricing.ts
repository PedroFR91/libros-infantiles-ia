// Precios y oferta (REVISION-PRODUCTO-2026-10.md §6). Sin dependencias de
// servidor: se usan también en la landing y el editor (cliente).
// Todos los importes en céntimos, IVA incluido.

export interface PackConfig {
  credits: number;
  price: number;
  name: string;
  description: string;
}

// Compras de libro digital. Internamente se abonan créditos (5 = 1 libro) para
// que las regeneraciones funcionen igual; en la interfaz nunca se habla de créditos.
// - digital: primera compra (el libro que acaba de crear)
// - repeat: segundo cuento, solo para quien ya ha comprado alguno
export const CREDIT_PACKS: Record<"digital" | "repeat", PackConfig> = {
  digital: {
    credits: 5,
    price: 990,
    name: "Cuento digital",
    description: "Portada + 12 páginas ilustradas, en PDF",
  },
  repeat: {
    credits: 5,
    price: 590,
    name: "Otro cuento digital",
    description: "Para su hermano, su primo o su mejor amigo",
  },
};

/**
 * Libro impreso a la venta. Mientras sea false solo se vende el PDF: se
 * ocultan el pack y "pasar a papel", el checkout los rechaza y no salen los
 * emails de oferta del impreso. Para reactivarlo: true y desplegar.
 */
export const PRINT_ENABLED = false;

export const PRINT_COMING_SOON_TEXT =
  "Próximamente, también en papel: estamos preparando el cuento impreso con envío a casa.";

/**
 * Pack impreso + PDF en un solo pago. Desde oct. 2026 no se ofrece: primero se
 * compra el PDF y justo después se ofrece el libro físico por +20 € (Pedro y
 * Mario). Se deja el producto por si vuelve, apagado con BUNDLE_ENABLED.
 */
export const BUNDLE_ENABLED = false;
/** El pack se ofrece solo si hay impreso y el pack está activo */
export const OFFER_BUNDLE = PRINT_ENABLED && BUNDLE_ENABLED;

export const BUNDLE_PRODUCT = {
  price: 2990,
  name: "Cuento impreso + PDF",
  description: "19×19 cm · tapa blanda · envío a casa incluido · PDF al momento",
};

/**
 * Libro físico de un cuento que ya tiene el PDF (la mejora tras comprarlo):
 * +20 € con envío incluido a la Península. Coste con Bubok ≈ 7,25 € de
 * impresión + 5,93 € de envío (oct. 2026).
 */
export const PRINT_PRODUCT = {
  price: 2000,
  name: "Libro impreso",
  format: "19×19 cm en tapa blanda",
  description: "19×19 cm · tapa blanda · envío a domicilio incluido",
  shippingCountries: ["ES"] as const, // solo España
  deliveryDays: { min: 7, max: 10 }, // laborables (Bubok)
};

/** Suplementos de envío sobre la Península (céntimos). Canarias, Ceuta y Melilla: aún no */
export const SHIPPING_SURCHARGE = {
  baleares: 700,
};

export type ShippingZone = "peninsula" | "baleares";

/**
 * Zona de envío por código postal español: "invalid" si no es un código
 * postal, "unavailable" si de momento no se envía allí (Canarias, Ceuta y
 * Melilla: fuera del IVA y con aduana).
 */
export function shippingZone(postalCode: string): ShippingZone | "invalid" | "unavailable" {
  const cp = postalCode.trim();
  if (!/^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(cp)) return "invalid";
  const province = cp.slice(0, 2);
  if (province === "07") return "baleares";
  if (["35", "38", "51", "52"].includes(province)) return "unavailable";
  return "peninsula";
}

/** Copias extra del mismo libro al mismo envío (abuelos, tíos) */
export const EXTRA_COPY = {
  price: 1990,
  max: 3,
};

/**
 * Precio fundador: descuento automático en los primeros pedidos (sin códigos).
 * El contador es real: pedidos pagados de digital, pack o impreso.
 */
export const FOUNDER_OFFER = {
  // Retirado en oct. 2026: PDF a 9,90 € para todos, sin descuentos que explicar
  enabled: false,
  percent: 20,
  limit: 50,
};

/** Rehacer dibujos incluidos en cada libro (garantía) */
export const FREE_REDRAWS = 3;

export const GUARANTEE_TEXT =
  "Si una ilustración no te convence, la rehacemos gratis. Y si aun así el cuento no te gusta, te devolvemos el dinero del digital.";

export function formatEuros(cents: number): string {
  // Espacio de no separación: "34,90 €" no se parte en dos líneas
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

export function withFounderDiscount(cents: number): number {
  return Math.round((cents * (100 - FOUNDER_OFFER.percent)) / 100);
}
