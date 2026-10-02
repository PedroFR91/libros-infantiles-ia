import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Book, Wand2, ChevronRight, Gift } from "lucide-react";
import { CREDIT_PACKS, PRINT_PRODUCT, formatEuros } from "@/lib/pricing";
import {
  SEO_INDEX,
  editorUrlForTheme,
  getSeoPage,
} from "@/lib/seo-pages";

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

  return (
    <div className='min-h-screen bg-bg'>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className='border-b border-border'>
        <div className='max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3'>
          <Link href='/' className='flex items-center gap-2'>
            <div className='w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center'>
              <Book className='w-5 h-5 sm:w-6 sm:h-6 text-white' aria-hidden />
            </div>
            <span className='text-lg sm:text-xl font-bold'>
              <span className='text-primary'>Libros</span>
              <span className='text-secondary'>IA</span>
            </span>
          </Link>
          <Link
            href={ctaHref}
            className='px-4 sm:px-6 py-2 sm:py-2.5 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-colors'>
            Crear gratis
          </Link>
        </div>
      </header>

      <main className='max-w-3xl mx-auto px-4 py-8 sm:py-12'>
        <nav aria-label='Ruta de navegación' className='mb-6 text-sm text-text-muted'>
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
          <h1 className='text-3xl sm:text-4xl font-bold leading-tight mb-4'>
            <span aria-hidden className='mr-2'>
              {page.emoji}
            </span>
            {page.h1}
          </h1>
          <p className='text-base sm:text-lg text-text-muted mb-6'>{page.intro}</p>

          <div className='flex flex-col sm:flex-row gap-3 mb-10'>
            <Link
              href={ctaHref}
              className='px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2'>
              <Wand2 className='w-5 h-5' aria-hidden />
              {page.ctaLabel}
            </Link>
          </div>

          {page.sections.map((section) => (
            <section key={section.heading} className='mb-8'>
              <h2 className='text-xl sm:text-2xl font-bold mb-3'>
                {section.heading}
              </h2>
              {section.paragraphs.map((p, i) => (
                <p key={i} className='text-text-muted mb-3 leading-relaxed'>
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className='list-disc pl-6 space-y-1.5 text-text-muted'>
                  {section.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {/* Cómo funciona y precio (datos reales de pricing.ts) */}
          <section
            aria-labelledby='como-funciona-precio'
            className='mb-10 p-5 sm:p-6 rounded-2xl bg-surface border border-border'>
            <h2 id='como-funciona-precio' className='text-xl font-bold mb-3'>
              Cómo funciona y cuánto cuesta
            </h2>
            <ol className='list-decimal pl-6 space-y-2 text-text-muted mb-4'>
              <li>
                Escribe su nombre y el tema. La historia completa y una portada
                de muestra se crean <strong className='text-text'>gratis</strong>{" "}
                en unos minutos.
              </li>
              <li>
                Si te gusta, desbloquea las ilustraciones (portada y 12 páginas)
                desde {formatEuros(CREDIT_PACKS.small.price)}.
              </li>
              <li>
                Descarga el PDF para pantalla y para imprimir o pide el libro
                impreso en tapa dura 20×20 cm por{" "}
                {formatEuros(PRINT_PRODUCT.price)}, envío incluido (
                {PRINT_PRODUCT.deliveryDays.min}-{PRINT_PRODUCT.deliveryDays.max}{" "}
                días).
              </li>
            </ol>
            <p className='text-sm text-text-muted flex items-start gap-2'>
              <Gift className='w-4 h-4 mt-0.5 text-primary shrink-0' aria-hidden />
              <span>
                Pago único con Stripe, sin suscripción. La foto del niño es
                opcional y no se guarda.
              </span>
            </p>
          </section>

          <section aria-labelledby='faq' className='mb-10'>
            <h2 id='faq' className='text-xl sm:text-2xl font-bold mb-4'>
              Preguntas frecuentes
            </h2>
            <div className='space-y-3'>
              {page.faq.map((f) => (
                <details
                  key={f.q}
                  className='group rounded-xl bg-surface border border-border p-4'>
                  <summary className='cursor-pointer font-semibold list-none flex items-center justify-between gap-3 focus-visible:outline-2 focus-visible:outline-primary rounded'>
                    {f.q}
                    <ChevronRight
                      className='w-5 h-5 shrink-0 transition-transform group-open:rotate-90'
                      aria-hidden
                    />
                  </summary>
                  <p className='mt-3 text-text-muted'>{f.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className='text-center mb-12'>
            <Link
              href={ctaHref}
              className='inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-lg rounded-xl transition-colors'>
              <Wand2 className='w-5 h-5' aria-hidden />
              {page.ctaLabel}
            </Link>
          </div>
        </article>

        <nav aria-labelledby='relacionados'>
          <h2 id='relacionados' className='text-lg font-bold mb-3'>
            También te puede interesar
          </h2>
          <ul className='grid sm:grid-cols-3 gap-3'>
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/cuentos/${r.slug}`}
                  className='flex items-center gap-2 p-4 rounded-xl bg-surface border border-border hover:border-primary transition-colors'>
                  <span aria-hidden className='text-2xl'>
                    {r.emoji}
                  </span>
                  <span className='font-medium'>{r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className='mt-4 text-sm'>
            <Link href='/cuentos' className='text-primary hover:underline'>
              Ver todos los temas y ocasiones
            </Link>
          </p>
        </nav>
      </main>

      <footer className='py-8 px-4 border-t border-border'>
        <div className='max-w-4xl mx-auto flex flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-text-muted'>
          <Link href='/' className='hover:text-text transition-colors'>
            Inicio
          </Link>
          <Link href='/privacidad' className='hover:text-text transition-colors'>
            Privacidad
          </Link>
          <Link href='/terminos' className='hover:text-text transition-colors'>
            Términos de Servicio
          </Link>
          <Link href='/cookies' className='hover:text-text transition-colors'>
            Cookies
          </Link>
          <Link href='/legal' className='hover:text-text transition-colors'>
            Aviso Legal
          </Link>
          <Link href='/desistimiento' className='hover:text-text transition-colors'>
            Desistimiento
          </Link>
        </div>
      </footer>
    </div>
  );
}
