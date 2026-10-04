"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Download,
  Lock,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useOffer } from "@/components/landing/useOffer";
import {
  BUNDLE_PRODUCT,
  CREDIT_PACKS,
  EXTRA_COPY,
  FOUNDER_OFFER,
  GUARANTEE_TEXT,
  PRINT_COMING_SOON_TEXT,
  PRINT_ENABLED,
  PRINT_PRODUCT,
  formatEuros,
} from "@/lib/pricing";

// Precios con el descuento vigente (GET /api/stripe/checkout). Normativa: un
// precio "antes" tachado tendría que ser el más bajo de los 30 días previos,
// así que NO se tacha nada: se muestra el precio final y la etiqueta del
// descuento (p. ej. "Precio fundador −20 %").

interface PriceInfo {
  price: number;
  regular: number;
  formatted: string;
  regularFormatted: string;
  discountLabel: string | null;
}

type PriceKey = "digital" | "repeat" | "bundle" | "print" | "extraCopy";

interface PricesState {
  founder: { active: boolean; remaining: number; percent: number } | null;
  prices: Record<PriceKey, PriceInfo>;
}

function regular(cents: number): PriceInfo {
  return {
    price: cents,
    regular: cents,
    formatted: formatEuros(cents),
    regularFormatted: formatEuros(cents),
    discountLabel: null,
  };
}

/** Si la API falla: precios normales de pricing.ts, sin etiquetas */
const FALLBACK: PricesState = {
  founder: null,
  prices: {
    digital: regular(CREDIT_PACKS.digital.price),
    repeat: regular(CREDIT_PACKS.repeat.price),
    bundle: regular(BUNDLE_PRODUCT.price),
    print: regular(PRINT_PRODUCT.price),
    extraCopy: regular(EXTRA_COPY.price),
  },
};

function isPriceInfo(v: unknown): v is PriceInfo {
  const p = v as PriceInfo | null;
  return Boolean(p && typeof p.price === "number" && typeof p.formatted === "string");
}

/** Precio final + etiqueta del descuento (sin precio tachado) */
function Price({ info, size = "lg" }: { info: PriceInfo; size?: "lg" | "sm" }) {
  if (size === "sm") {
    return (
      <>
        <strong className='whitespace-nowrap'>{info.formatted}</strong>
        {info.discountLabel && (
          <span className='ml-1.5 inline-block align-middle px-2 py-0.5 rounded-full bg-primary-soft text-primary-hover text-xs font-bold whitespace-nowrap'>
            {info.discountLabel}
          </span>
        )}
      </>
    );
  }
  return (
    <span className='flex flex-wrap items-center gap-x-3 gap-y-1.5'>
      <span className='font-display font-semibold text-4xl sm:text-5xl'>{info.formatted}</span>
      {info.discountLabel && (
        <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-soft text-primary-hover text-sm font-bold'>
          <Sparkles className='w-3.5 h-3.5' aria-hidden />
          {info.discountLabel}
        </span>
      )}
    </span>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className='flex items-start gap-2.5'>
      <Check className='w-5 h-5 text-success shrink-0 mt-0.5' aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export function OfferSection() {
  const [state, setState] = useState<PricesState>(FALLBACK);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/stripe/checkout", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Record<string, unknown> | null) => {
        if (!data) return;
        const keys: PriceKey[] = ["digital", "repeat", "bundle", "print", "extraCopy"];
        if (!keys.every((k) => isPriceInfo(data[k]))) return;
        const founder = data.founder as PricesState["founder"];
        setState({
          founder: founder && typeof founder.active === "boolean" ? founder : null,
          prices: Object.fromEntries(keys.map((k) => [k, data[k]])) as PricesState["prices"],
        });
      })
      .catch(() => {
        /* si falla, se quedan los precios normales sin etiqueta */
      });
    return () => controller.abort();
  }, []);

  const { prices, founder } = state;
  const bonus = useOffer()?.campaign?.bonus ?? null;
  // Descuento vigente (el mayor entre fundador y campaña lo decide la API)
  const discountLabel = prices.digital.discountLabel ?? prices.bundle.discountLabel;
  const isFounder = Boolean(
    discountLabel?.startsWith("Precio fundador") && founder?.active && founder.remaining > 0,
  );
  const days = `${PRINT_PRODUCT.deliveryDays.min}-${PRINT_PRODUCT.deliveryDays.max}`;

  return (
    <section
      id='precios'
      aria-labelledby='precios-titulo'
      className='px-4 py-14 sm:py-20 bg-bg-light border-y border-border scroll-mt-16'>
      <div className='max-w-5xl mx-auto'>
        <div className='text-center mb-8 sm:mb-10'>
          <h2
            id='precios-titulo'
            className='font-display font-semibold text-3xl sm:text-4xl mb-3'>
            Elige cómo lo quieres
          </h2>
          <p className='text-text-muted text-lg max-w-2xl mx-auto'>
            La historia y la portada son gratis. Solo pagas si quieres que lo
            ilustremos entero.
          </p>
        </div>

        {discountLabel && (
          <div
            role='note'
            className='mb-8 rounded-2xl bg-secondary text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4'>
            <Sparkles className='w-6 h-6 shrink-0 text-[#FFD9B8]' aria-hidden />
            <p className='text-lg'>
              {isFounder && founder ? (
                <>
                  <strong>
                    Precio fundador: −{founder.percent} % en los {FOUNDER_OFFER.limit}{" "}
                    primeros pedidos
                  </strong>{" "}
                  · quedan {founder.remaining}
                </>
              ) : (
                <strong>{discountLabel}</strong>
              )}
              <span className='block text-[0.95rem] text-white/85'>
                Ya está aplicado en los precios de abajo y se descuenta solo al
                pagar, sin códigos.
              </span>
            </p>
          </div>
        )}

        {!PRINT_ENABLED ? (
          <div className='grid md:grid-cols-[1.25fr_1fr] gap-5 sm:gap-6 items-stretch'>
            {/* Mientras no hay impreso: el PDF es el producto */}
            <article
              aria-labelledby='oferta-pdf'
              className='relative rounded-3xl border-2 border-primary bg-surface card-shadow p-6 sm:p-8 flex flex-col'>
              <p className='inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary-hover text-sm font-bold mb-4'>
                <Download className='w-4 h-4' aria-hidden />
                Listo en minutos
              </p>
              <h3 id='oferta-pdf' className='font-display font-semibold text-2xl sm:text-3xl mb-2'>
                Su cuento ilustrado en PDF
              </h3>
              <p className='mb-1'>
                <Price info={prices.digital} />
              </p>
              <p className='text-text-muted mb-5'>IVA incluido · pago único</p>
              {bonus?.onProduct === "pdf" && (
                <p className='-mt-3 mb-5 inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-white text-sm font-bold'>
                  🎁 {bonus.label}
                </p>
              )}
              <ul className='space-y-2.5 mb-6 flex-1'>
                <Bullet>Portada + 12 páginas ilustradas, con su nombre y tu dedicatoria</Bullet>
                <Bullet>Un PDF para leer en la tablet y otro para imprimir en casa o en una copistería</Bullet>
                <Bullet>Puedes cambiar frases y rehacer dibujos gratis</Bullet>
                <Bullet>
                  ¿Otro para su hermano o su primo? <Price info={prices.repeat} size='sm' />
                </Bullet>
              </ul>
              <Link
                href='/editor'
                className='min-h-13 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg px-6 transition-colors'>
                Empezar su cuento gratis
                <ArrowRight className='w-5 h-5' aria-hidden />
              </Link>
              <p className='mt-3 text-center text-[0.95rem] text-text-muted'>
                Primero lees su historia gratis; pagas al final, si te gusta.
              </p>
            </article>

            <article
              aria-labelledby='oferta-papel'
              className='rounded-3xl border border-dashed border-border-strong bg-surface/60 p-6 sm:p-8 flex flex-col'>
              <p className='inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-bg text-text-muted text-sm font-bold mb-4 border border-border'>
                <Printer className='w-4 h-4' aria-hidden />
                Próximamente
              </p>
              <h3 id='oferta-papel' className='font-display font-semibold text-2xl sm:text-3xl mb-2'>
                El cuento impreso
              </h3>
              <p className='text-text-muted text-lg'>{PRINT_COMING_SOON_TEXT}</p>
              <p className='text-text-muted mt-3'>
                Si compras ahora el PDF, podrás pasarlo a papel en cuanto esté
                disponible.
              </p>
            </article>
          </div>
        ) : (
        <div className='grid md:grid-cols-[1.25fr_1fr] gap-5 sm:gap-6 items-stretch'>
          {/* Producto estrella: impreso + PDF */}
          <article
            aria-labelledby='oferta-pack'
            className='relative rounded-3xl border-2 border-primary bg-surface card-shadow p-6 sm:p-8 flex flex-col'>
            <p className='inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft text-primary-hover text-sm font-bold mb-4'>
              <BookOpen className='w-4 h-4' aria-hidden />
              Para regalar
            </p>
            <h3 id='oferta-pack' className='font-display font-semibold text-2xl sm:text-3xl mb-2'>
              {BUNDLE_PRODUCT.name}
            </h3>
            <p className='mb-1'>
              <Price info={prices.bundle} />
            </p>
            <p className='text-text-muted mb-5'>IVA y envío a casa incluidos</p>
            {bonus?.onProduct === "bundle" && (
              <p className='-mt-3 mb-5 inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-white text-sm font-bold'>
                🎁 {bonus.label}
              </p>
            )}
            <ul className='space-y-2.5 mb-6 flex-1'>
              <Bullet>Libro de 21×21 cm, tapa blanda: portada + 12 páginas ilustradas</Bullet>
              <Bullet>El PDF al momento, para leerlo ya en pantalla</Bullet>
              <Bullet>
                <strong>Lo revisas y apruebas antes de imprimir</strong>: puedes
                cambiar frases y rehacer dibujos
              </Bullet>
              <Bullet>Envío incluido a toda España, en {days} días laborables</Bullet>
            </ul>
            <Link
              href='/editor'
              className='min-h-13 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg px-6 transition-colors'>
              Empezar su cuento gratis
              <ArrowRight className='w-5 h-5' aria-hidden />
            </Link>
            <p className='mt-3 text-center text-[0.95rem] text-text-muted'>
              Primero lees su historia gratis; pagas al final, si te gusta.
            </p>
          </article>

          {/* Solo PDF */}
          <article
            aria-labelledby='oferta-pdf'
            className='rounded-3xl border border-border bg-surface card-shadow p-6 sm:p-8 flex flex-col'>
            <p className='inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full bg-bg text-text-muted text-sm font-bold mb-4 border border-border'>
              <Download className='w-4 h-4' aria-hidden />
              Digital
            </p>
            <h3 id='oferta-pdf' className='font-display font-semibold text-2xl sm:text-3xl mb-2'>
              Solo PDF
            </h3>
            <p className='mb-1'>
              <Price info={prices.digital} />
            </p>
            <p className='text-text-muted mb-5'>IVA incluido</p>
            <ul className='space-y-2.5 mb-6 flex-1'>
              <Bullet>Portada + 12 páginas ilustradas</Bullet>
              <Bullet>PDF para leer en pantalla y otro para imprimir en casa</Bullet>
              <Bullet>Listo en unos minutos</Bullet>
              <Bullet>Puedes pasarlo a papel cuando quieras</Bullet>
            </ul>
            <Link
              href='/editor'
              className='min-h-13 inline-flex items-center justify-center gap-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold text-lg px-6 transition-colors'>
              Empezar gratis
            </Link>
          </article>
        </div>
        )}

        {/* Extras */}
        {PRINT_ENABLED && (
        <ul className='mt-6 grid sm:grid-cols-2 gap-4'>
          <li className='flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5'>
            <Printer className='w-6 h-6 text-primary shrink-0 mt-0.5' aria-hidden />
            <p>
              <strong>¿Ya tienes el PDF?</strong> Pásalo a papel por{" "}
              <Price info={prices.print} size='sm' />,
              envío incluido.
            </p>
          </li>
          <li className='flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5'>
            <Users className='w-6 h-6 text-primary shrink-0 mt-0.5' aria-hidden />
            <p>
              <strong>Copia extra para los abuelos:</strong>{" "}
              <Price info={prices.extraCopy} size='sm' />{" "}
              cada una, en el mismo envío (hasta {EXTRA_COPY.max}).
            </p>
          </li>
        </ul>
        )}

        {/* Garantía y pago */}
        <div className='mt-6 grid md:grid-cols-[1.4fr_1fr] gap-4'>
          <div className='rounded-2xl bg-[#EAF5EE] border border-[#BFE0CB] p-5 sm:p-6 flex gap-4'>
            <ShieldCheck className='w-8 h-8 text-success shrink-0' aria-hidden />
            <div>
              <h3 className='font-bold text-lg mb-1'>Nuestra garantía</h3>
              <p>{GUARANTEE_TEXT}</p>
              <p className='mt-2 text-text-muted'>
                {PRINT_ENABLED &&
                  "En el impreso, hasta que lo apruebas para imprenta puedes pedir la devolución completa. "}
                <Link href='/desistimiento' className='underline underline-offset-2 hover:text-text'>
                  Ver condiciones
                </Link>
              </p>
            </div>
          </div>
          <div className='rounded-2xl border border-border bg-surface p-5 sm:p-6 flex gap-4'>
            <Lock className='w-7 h-7 text-secondary shrink-0' aria-hidden />
            <div>
              <h3 className='font-bold text-lg mb-1'>Pago seguro con Stripe</h3>
              <p className='text-text-muted'>
                Tarjeta, Apple Pay o Google Pay. Pago único, sin suscripciones.
                No vemos ni guardamos los datos de tu tarjeta.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
