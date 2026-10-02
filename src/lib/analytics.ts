// Eventos del embudo para Umami (analítica sin cookies).
// Si el script no está cargado (sin configurar, bloqueador...) no hace nada.

type EventData = Record<string, string | number | boolean>;

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

export type FunnelEvent =
  | "borrador_creado"
  | "checkout_iniciado"
  | "pago_completado"
  | "ilustraciones_generadas"
  | "pdf_descargado";

export function track(event: FunnelEvent, data?: EventData) {
  try {
    window.umami?.track(event, data);
  } catch {
    // La analítica nunca debe romper el flujo de compra
  }
}
