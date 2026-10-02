// Precios sin dependencias de servidor: se usan también en la landing (cliente).

// Packs a la venta. El cliente compra libros; por dentro se abonan créditos
// (5 por libro) para que las regeneraciones sigan funcionando igual.
// Precio de lanzamiento: código promocional en Stripe (allow_promotion_codes).
export interface PackConfig {
  credits: number;
  price: number; // céntimos, IVA incluido
  name: string;
  description: string;
  popular?: boolean;
}

export const CREDIT_PACKS: Record<"small" | "medium" | "large", PackConfig> = {
  small: {
    credits: 5,
    price: 990, // céntimos, IVA incluido
    name: "1 libro",
    description: "Libro ilustrado de 12 páginas en PDF",
  },
  medium: {
    credits: 10,
    price: 1690,
    name: "2 libros",
    description: "Ideal para hermanos o para regalar",
    popular: true,
  },
  large: {
    credits: 20,
    price: 2990,
    name: "4 libros",
    description: "Una colección de aventuras",
  },
};

export function formatEuros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

// Libro impreso en tapa dura (20×20 cm), envío a España incluido.
// Producción manual en la imprenta en la fase A (ver AUDITORIA-2026-10.md §5).
export const PRINT_PRODUCT = {
  price: 3990, // céntimos, IVA y envío incluidos
  name: "Libro impreso en tapa dura",
  description: "20×20 cm · tapa dura · envío a domicilio incluido",
  shippingCountries: ["ES"] as const, // solo España
  deliveryDays: { min: 5, max: 9 },
};
