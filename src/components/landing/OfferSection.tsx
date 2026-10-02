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
import {
  BUNDLE_PRODUCT,
  CREDIT_PACKS,
  EXTRA_COPY,
  FOUNDER_OFFER,
  GUARANTEE_TEXT,
  PRINT_PRODUCT,
  formatEuros,
  withFounderDiscount,
} from "@/lib/pricing";

interface FounderState {
  active: boolean;
  remaining: number;
  percent: number;
}

/** Precio con el normal tachado SOLO si el precio fundador está activo. */
function Price({
  cents,
  founder,
  size = "lg",
}: {
  cents: number;
  founder: boolean;
  size?: "lg" | "sm";
}) {
  const big = size === "lg" ? "text-4xl sm:text-5xl" : "text-lg";
  if (!founder) {
    return <span className={`font-display font-semibold ${big}`}>{formatEuros(cents)}</span>;
  }
  return (
    <span className='inline-flex items-baseline gap-2 flex-wrap'>
      <span className={`font-display font-semibold ${big}`}>
        {formatEuros(withFounderDiscount(cents))}
      </span>
      <del className={`text-text-muted ${size === "lg" ? "text-xl" : "text-base"}`}>
        <span className='sr-only'>Antes </span>
        {formatEuros(cents)}
      </del>
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
  const [founder, setFounder] = useState<FounderState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/offer", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { founder?: FounderState } | null) => {
        const f = data?.founder;
        if (f && typeof f.active === "boolean") setFounder(f);
      })
      .catch(() => {
        /* si falla, no se muestra la banda y se enseñan los precios normales */
      });
    return () => controller.abort();
  }, []);

  const founderOn = Boolean(founder?.active && founder.remaining > 0);
  const percent = founder?.percent || FOUNDER_OFFER.percent;
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

        {founderOn && founder && (
          <div
            role='note'
            className='mb-8 rounded-2xl bg-secondary text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4'>
            <Sparkles className='w-6 h-6 shrink-0 text-[#FFD9B8]' aria-hidden />
            <p className='text-lg'>
              <strong>
                Precio fundador: −{percent} % en los {FOUNDER_OFFER.limit} primeros
                pedidos
              </strong>{" "}
              · quedan {founder.remaining}
              <span className='block text-[0.95rem] text-white/85'>
                Se aplica solo al pagar, sin códigos.
              </span>
            </p>
          </div>
        )}

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
              <Price cents={BUNDLE_PRODUCT.price} founder={founderOn} />
            </p>
            <p className='text-text-muted mb-5'>IVA y envío a casa incluidos</p>
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
              <Price cents={CREDIT_PACKS.digital.price} founder={founderOn} />
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

        {/* Extras */}
        <ul className='mt-6 grid sm:grid-cols-2 gap-4'>
          <li className='flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5'>
            <Printer className='w-6 h-6 text-primary shrink-0 mt-0.5' aria-hidden />
            <p>
              <strong>¿Ya tienes el PDF?</strong> Pásalo a papel por{" "}
              <Price cents={PRINT_PRODUCT.price} founder={founderOn} size='sm' />,
              envío incluido.
            </p>
          </li>
          <li className='flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5'>
            <Users className='w-6 h-6 text-primary shrink-0 mt-0.5' aria-hidden />
            <p>
              <strong>Copia extra para los abuelos:</strong>{" "}
              <Price cents={EXTRA_COPY.price} founder={founderOn} size='sm' />{" "}
              cada una, en el mismo envío (hasta {EXTRA_COPY.max}).
            </p>
          </li>
        </ul>

        {/* Garantía y pago */}
        <div className='mt-6 grid md:grid-cols-[1.4fr_1fr] gap-4'>
          <div className='rounded-2xl bg-[#EAF5EE] border border-[#BFE0CB] p-5 sm:p-6 flex gap-4'>
            <ShieldCheck className='w-8 h-8 text-success shrink-0' aria-hidden />
            <div>
              <h3 className='font-bold text-lg mb-1'>Nuestra garantía</h3>
              <p>{GUARANTEE_TEXT}</p>
              <p className='mt-2 text-text-muted'>
                En el impreso, hasta que lo apruebas para imprenta puedes pedir
                la devolución completa.{" "}
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
