import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Plantilla de las páginas legales: cabecera y pie comunes, texto a 16 px
 * (mínimo 14 px en tablas y notas) y fecha de actualización fija.
 */
export function LegalLayout({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  /** Fecha de la última revisión del texto, p. ej. "2 de octubre de 2026" */
  updated?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className='min-h-screen bg-bg text-text'>
      <SiteHeader ctaHref='/editor' ctaLabel='Empezar gratis' />
      <main className='max-w-3xl mx-auto px-4 py-10 sm:py-14'>
        <h1 className='font-display font-semibold text-[2.1rem] sm:text-5xl leading-[1.1] tracking-tight mb-3'>
          {title}
        </h1>
        {updated && (
          <p className='text-text-muted text-[0.95rem] mb-6'>
            Última actualización: {updated}
          </p>
        )}
        {intro && (
          <div className='mb-8 rounded-2xl bg-bg-light border border-border card-shadow p-5 sm:p-6 text-[1.0625rem]'>
            {intro}
          </div>
        )}
        <div className='prose-legal'>{children}</div>
      </main>
      <SiteFooter showIdeas={false} />
    </div>
  );
}
