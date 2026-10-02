import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { SEO_INDEX } from "@/lib/seo-pages";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeIcon } from "@/components/ThemeIcon";

const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://libros.iconicospace.com";

const title = "Cuentos personalizados por tema y ocasión";
const description =
  "Ideas para crear un cuento personalizado donde tu hijo es el protagonista: dinosaurios, espacio, princesas, piratas… y regalos de cumpleaños, Navidad o Reyes.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteUrl}/cuentos` },
  openGraph: {
    title,
    description,
    url: `${siteUrl}/cuentos`,
    siteName: "LibrosIA by IconicoSpace",
    locale: "es_ES",
    type: "website",
  },
};

const GROUPS = [
  { kind: "tema", heading: "Por tema" },
  { kind: "ocasion", heading: "Por ocasión" },
] as const;

export default function CuentosIndexPage() {
  return (
    <div className='min-h-screen bg-bg text-text'>
      <SiteHeader ctaHref='/editor' ctaLabel='Empezar gratis' />

      <main className='max-w-4xl mx-auto px-4 py-8 sm:py-12'>
        <h1 className='font-display font-semibold text-[2.1rem] sm:text-5xl leading-[1.1] tracking-tight mb-4'>
          Cuentos personalizados por tema y ocasión
        </h1>
        <p className='text-lg sm:text-xl text-text-muted mb-10 max-w-2xl'>
          Cada cuento se escribe para un niño concreto: su nombre, su edad (de 3
          a 8 años) y lo que le apasiona. Aquí tienes ideas para elegir la
          historia. La historia y su portada son gratis.
        </p>

        {GROUPS.map((group) => (
          <section key={group.kind} className='mb-10' aria-labelledby={`g-${group.kind}`}>
            <h2
              id={`g-${group.kind}`}
              className='font-display font-semibold text-2xl sm:text-3xl mb-4'>
              {group.heading}
            </h2>
            <ul className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
              {SEO_INDEX.filter((p) => p.kind === group.kind).map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/cuentos/${p.slug}`}
                    className='group flex items-center gap-3 p-4 h-full min-h-14 rounded-2xl bg-surface border border-border hover:border-primary transition-colors'>
                    <span className='w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center shrink-0'>
                      <ThemeIcon slug={p.slug} className='w-5 h-5 text-primary' />
                    </span>
                    <span className='font-semibold flex-1'>{p.label}</span>
                    <ChevronRight
                      className='w-5 h-5 text-text-muted group-hover:text-primary transition-colors'
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className='text-center mt-12 rounded-3xl bg-primary-soft border border-[#F5CDAE] px-5 py-8'>
          <p className='font-display font-semibold text-2xl mb-4'>
            ¿Tienes otra idea? Escríbela tú.
          </p>
          <Link
            href='/#empezar'
            className='min-h-13 px-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg transition-colors'>
            Empezar su cuento gratis
            <ArrowRight className='w-5 h-5' aria-hidden />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
