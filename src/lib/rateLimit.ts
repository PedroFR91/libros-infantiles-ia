import { NextResponse } from "next/server";

/**
 * Rate limiter en memoria para proteger endpoints costosos.
 * En producción con múltiples instancias, usar Redis (Upstash) en su lugar.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

interface RateLimitConfig {
  /** Número máximo de requests permitidas en la ventana */
  maxRequests: number;
  /** Ventana de tiempo en segundos */
  windowSeconds: number;
}

/**
 * Presets de rate limiting para distintos tipos de endpoints
 */
export const RATE_LIMIT_PRESETS = {
  /** Generación de libros/imágenes: costoso en API calls a OpenAI */
  generation: { maxRequests: 5, windowSeconds: 60 } as RateLimitConfig,
  /** Análisis de fotos: moderado */
  photoAnalysis: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
  /** Endpoints generales de lectura */
  general: { maxRequests: 60, windowSeconds: 60 } as RateLimitConfig,
  /** Checkout/pagos: proteger contra abuso */
  checkout: { maxRequests: 10, windowSeconds: 60 } as RateLimitConfig,
} as const;

/**
 * Verifica el rate limit para un identificador dado (userId o IP).
 * Retorna null si está dentro del límite, o un NextResponse 429 si se excedió.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): NextResponse | null {
  const now = Date.now();
  const key = `${identifier}`;
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    // Primera request o ventana expirada: crear nueva entrada
    store.set(key, {
      count: 1,
      resetTime: now + config.windowSeconds * 1000,
    });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: "Demasiadas solicitudes. Por favor, espera un momento.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": Math.ceil(entry.resetTime / 1000).toString(),
        },
      },
    );
  }

  // Dentro del límite: incrementar contador
  entry.count++;
  return null;
}
