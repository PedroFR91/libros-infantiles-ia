import Link from "next/link";

/** Marca de LibrosIA: libro abierto dibujado en SVG + nombre. */
export function BrandLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box =
    size === "lg" ? "w-12 h-12" : size === "sm" ? "w-8 h-8" : "w-9 h-9 sm:w-10 sm:h-10";
  const text =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-lg" : "text-xl sm:text-2xl";
  return (
    <span className='inline-flex items-center gap-2'>
      <span
        className={`${box} rounded-xl bg-primary flex items-center justify-center shrink-0`}
        aria-hidden>
        <svg viewBox='0 0 32 32' className='w-[62%] h-[62%]' fill='none'>
          <path
            d='M16 8.5C13 6.5 8.5 6 4 6.8v17c4.5-.8 9-.3 12 1.7 3-2 7.5-2.5 12-1.7v-17C23.5 6 19 6.5 16 8.5Z'
            fill='#FFF8EE'
          />
          <path d='M16 8.5v17' stroke='#C2410C' strokeWidth='1.6' />
          <path
            d='M7.5 11.5c2.2-.3 4.4 0 6 .8M7.5 15c2.2-.3 4.4 0 6 .8M18.5 12.3c1.6-.8 3.8-1.1 6-.8'
            stroke='#E8A87C'
            strokeWidth='1.4'
            strokeLinecap='round'
          />
        </svg>
      </span>
      <span className={`font-display font-semibold tracking-tight ${text}`}>
        <span className='text-primary'>Libros</span>
        <span className='text-secondary'>IA</span>
      </span>
    </span>
  );
}

export interface HeaderLink {
  href: string;
  label: string;
}

/**
 * Cabecera pública (landing, páginas SEO, legales). Fija arriba, fondo
 * translúcido claro. En móvil solo marca + botón; los enlaces van en el pie.
 */
export function SiteHeader({
  links = [],
  ctaHref = "/editor",
  ctaLabel = "Empezar gratis",
}: {
  links?: HeaderLink[];
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <header className='sticky top-0 z-40 glass'>
      <div className='max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4'>
        <Link href='/' aria-label='LibrosIA, inicio' className='rounded-lg'>
          <BrandLogo />
        </Link>

        {links.length > 0 && (
          <nav aria-label='Principal' className='hidden md:flex items-center gap-7'>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className='text-text-muted hover:text-text font-semibold transition-colors'>
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <Link
          href={ctaHref}
          className='inline-flex items-center justify-center min-h-11 px-4 sm:px-5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors'>
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
