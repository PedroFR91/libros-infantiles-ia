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

/** Producto estrella: libro impreso + PDF en un solo pago, envío incluido */
export const BUNDLE_PRODUCT = {
  price: 3490,
  name: "Cuento impreso + PDF",
  description: "21×21 cm · tapa blanda · envío a casa incluido · PDF al momento",
};

/** Pasar a papel un libro que ya tiene el PDF */
export const PRINT_PRODUCT = {
  price: 2500,
  name: "Libro impreso",
  description: "21×21 cm · tapa blanda · envío a domicilio incluido",
  shippingCountries: ["ES"] as const, // solo España
  deliveryDays: { min: 7, max: 10 }, // laborables (Bubok)
};

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
