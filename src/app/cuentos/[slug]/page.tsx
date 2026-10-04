import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ChevronDown, ChevronRight, Printer, ShieldCheck } from "lucide-react";
import {
  CREDIT_PACKS,
  GUARANTEE_TEXT,
  PRINT_COMING_SOON_TEXT,
  formatEuros,
} from "@/lib/pricing";
import {
  SEO_INDEX,
  editorUrlForTheme,
  getSeoPage,
} from "@/lib/seo-pages";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeIcon } from "@/components/ThemeIcon";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://libros.iconicospace.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEO_INDEX.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) return {};
  const url = `${siteUrl}/cuentos/${slug}`;
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      siteName: "LibrosIA by IconicoSpace",
      locale: "es_ES",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function SeoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getSeoPage(slug);
  if (!page) notFound();

  const ctaHref = editorUrlForTheme(page.ctaTheme);
  const related = page.related
    .map((s) => SEO_INDEX.find((p) => p.slug === s))
    .filter((p): p is (typeof SEO_INDEX)[number] => Boolean(p));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl },
        {
          "@type": "ListItem",
          position: 2,
          name: "Cuentos personalizados",
          item: `${siteUrl}/cuentos`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: page.label,
          item: `${siteUrl}/cuentos/${slug}`,
        },
      ],
    },
  ];

  const steps = [
    <>
      Escribe su nombre y lo que le gusta. La historia completa y su portada se
      crean <strong className='text-text'>gratis, sin tarjeta</strong>, en unos
      minutos.
    </>,
    <>
      Si te gusta, lo ilustramos entero:{" "}
      <strong className='text-text'>portada + 12 páginas ilustradas</strong>.
      Puedes cambiar frases y rehacer dibujos.
    </>,
    <>
      Lo descargas en PDF en unos minutos: para leerlo en una tableta o
      imprimirlo en casa o en una copistería.
    </>,
  ];

  return (
    <div className='min-h-screen bg-bg text-text'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <SiteHeader ctaHref={ctaHref} ctaLabel='Empezar gratis' offerBar />

      <main className='max-w-3xl mx-auto px-4 py-8 sm:py-12'>
        <nav aria-label='Ruta de navegación' className='mb-6 text-[0.95rem] text-text-muted'>
          <ol className='flex flex-wrap items-center gap-1'>
            <li>
              <Link href='/' className='hover:text-text underline-offset-2 hover:underline'>
                Inicio
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className='w-4 h-4' />
            </li>
            <li>
              <Link href='/cuentos' className='hover:text-text underline-offset-2 hover:underline'>
                Cuentos
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className='w-4 h-4' />
            </li>
            <li aria-current='page' className='text-text'>
              {page.label}
            </li>
          </ol>
        </nav>

        <article>
          <p className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-soft text-primary-hover font-bold text-sm mb-4'>
            <ThemeIcon slug={slug} className='w-4 h-4' />
            {page.label}
          </p>
          <h1 className='font-display font-semibold text-[2.1rem] sm:text-5xl leading-[1.1] tracking-tight mb-5'>
            {page.h1}
          </h1>
          <p className='text-lg sm:text-xl text-text-muted mb-7'>{page.intro}</p>

          <div className='flex flex-col sm:flex-row sm:items-center gap-3 mb-12'>
            <Link
              href={ctaHref}
              className='min-h-13 px-6 py-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg text-center transition-colors'>
              {page.ctaLabel}
              <ArrowRight className='w-5 h-5' aria-hidden />
            </Link>
            <p className='text-text-muted text-[0.95rem]'>
              Historia y portada gratis, sin tarjeta.
            </p>
          </div>

          {page.sections.map((section) => (
            <section key={section.heading} className='mb-9'>
              <h2 className='font-display font-semibold text-2xl sm:text-[1.7rem] mb-3'>
                {section.heading}
              </h2>
              {section.paragraphs.map((p, i) => (
                <p key={i} className='text-lg text-text-muted mb-3 leading-relaxed'>
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className='space-y-2 text-lg text-text-muted'>
                  {section.bullets.map((b) => (
                    <li key={b} className='flex items-start gap-2.5'>
                      <Check className='w-5 h-5 text-primary shrink-0 mt-1' aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* Cómo funciona y precio (datos reales de pricing.ts) */}
          <section
            aria-labelledby='como-funciona-precio'
            className='mb-12 rounded-3xl bg-bg-light border border-border card-shadow p-6 sm:p-8'>
            <h2
              id='como-funciona-precio'
              className='font-display font-semibold text-2xl sm:text-[1.7rem] mb-4'>
              Cómo funciona y cuánto cuesta
            </h2>
            <ol className='space-y-4 mb-6'>
              {steps.map((text, i) => (
                <li key={i} className='flex items-start gap-3 text-lg text-text-muted'>
                  <span
                    className='w-8 h-8 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0'
                    aria-hidden>
                    {i + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
            <div className='rounded-2xl border-2 border-primary bg-surface p-4 mb-3'>
              <p className='font-bold'>{CREDIT_PACKS.digital.name}</p>
              <p className='font-display font-semibold text-3xl'>
                {formatEuros(CREDIT_PACKS.digital.price)}
              </p>
              <p className='text-text-muted text-[0.95rem]'>
                {CREDIT_PACKS.digital.description} · listo en minutos · para
                leer en pantalla o imprimir en casa
              </p>
            </div>
            <p className='flex items-start gap-2.5 text-text-muted text-[0.95rem] mb-5'>
              <Printer className='w-5 h-5 mt-0.5 text-primary shrink-0' aria-hidden />
              <span>{PRINT_COMING_SOON_TEXT}</span>
            </p>
            <p className='flex items-start gap-2.5 text-text-muted'>
              <ShieldCheck className='w-5 h-5 mt-0.5 text-success shrink-0' aria-hidden />
              <span>
                {GUARANTEE_TEXT} Pago seguro con Stripe. La foto es opcional y
                no se guarda.{" "}
                <Link href='/#precios' className='text-primary underline underline-offset-2'>
                  Ver todos los precios
                </Link>
              </span>
            </p>
          </section>

          <section aria-labelledby='faq' className='mb-12'>
            <h2 id='faq' className='font-display font-semibold text-2xl sm:text-[1.7rem] mb-4'>
              Preguntas frecuentes
            </h2>
            <div className='space-y-3'>
              {page.faq.map((f) => (
                <details key={f.q} className='group rounded-2xl bg-surface border border-border'>
                  <summary className='cursor-pointer list-none flex items-center justify-between gap-3 p-4 font-bold text-lg rounded-2xl [&::-webkit-details-marker]:hidden'>
                    {f.q}
                    <ChevronDown
                      className='w-5 h-5 shrink-0 text-primary transition-transform group-open:rotate-180'
                      aria-hidden
                    />
                  </summary>
                  <p className='px-4 pb-4 -mt-1 text-text-muted'>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className='text-center mb-14 rounded-3xl bg-primary-soft border border-[#F5CDAE] px-5 py-8'>
            <p className='font-display font-semibold text-2xl mb-4'>
              ¿Le escribimos su cuento?
            </p>
            <Link
              href={ctaHref}
              className='min-h-13 px-6 py-2 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg text-center transition-colors'>
              {page.ctaLabel}
              <ArrowRight className='w-5 h-5' aria-hidden />
            </Link>
          </div>
        </article>

        <nav aria-labelledby='relacionados'>
          <h2 id='relacionados' className='font-display font-semibold text-xl mb-3'>
            También te puede interesar
          </h2>
          <ul className='grid sm:grid-cols-3 gap-3'>
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/cuentos/${r.slug}`}
                  className='flex items-center gap-3 p-4 h-full rounded-2xl bg-surface border border-border hover:border-primary transition-colors'>
                  <ThemeIcon slug={r.slug} className='w-5 h-5 text-primary shrink-0' />
                  <span className='font-semibold'>{r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className='mt-4'>
            <Link href='/cuentos' className='text-primary font-semibold underline underline-offset-2'>
              Ver todos los temas y ocasiones
            </Link>
          </p>
        </nav>
      </main>

      <SiteFooter />
    </div>
  );
}
