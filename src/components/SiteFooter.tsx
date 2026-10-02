import Link from "next/link";
import { SEO_INDEX } from "@/lib/seo-pages";
import { BrandLogo } from "@/components/SiteHeader";

export const CONTACT_EMAIL = "hola@iconicospace.com";

const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/desistimiento", label: "Desistimiento y garantías" },
  { href: "/legal", label: "Aviso legal" },
];

/**
 * Pie público común. Incluye el enlace "Cookies" (solo usamos cookies
 * técnicas, así que no hay banner: basta con informar aquí).
 */
export function SiteFooter({ showIdeas = true }: { showIdeas?: boolean }) {
  return (
    <footer className='border-t border-border bg-bg-light'>
      <div className='max-w-6xl mx-auto px-4 py-10 sm:py-12'>
        <div className='grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]'>
          <div>
            <BrandLogo size='sm' />
            <p className='mt-3 text-text-muted max-w-xs'>
              Cuentos ilustrados donde el héroe lleva su nombre. Hecho en
              Málaga.
            </p>
            <p className='mt-3'>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className='font-semibold text-primary hover:text-primary-hover underline underline-offset-2'>
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>

          <nav aria-labelledby='footer-cuento'>
            <h2 id='footer-cuento' className='font-bold mb-3'>
              Tu cuento
            </h2>
            <ul className='space-y-1 text-text-muted'>
              <li>
                <Link href='/editor' className='inline-block py-1 hover:text-text transition-colors'>
                  Empezar su cuento gratis
                </Link>
              </li>
              <li>
                <Link href='/mis-libros' className='inline-block py-1 hover:text-text transition-colors'>
                  Mis cuentos (recuperar con mi email)
                </Link>
              </li>
              <li>
                <Link href='/#precios' className='inline-block py-1 hover:text-text transition-colors'>
                  Precios
                </Link>
              </li>
              <li>
                <Link href='/#preguntas' className='inline-block py-1 hover:text-text transition-colors'>
                  Preguntas frecuentes
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby='footer-legal'>
            <h2 id='footer-legal' className='font-bold mb-3'>
              Legal
            </h2>
            <ul className='space-y-1 text-text-muted'>
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className='inline-block py-1 hover:text-text transition-colors'>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {showIdeas && (
          <nav aria-labelledby='footer-ideas' className='mt-10 pt-8 border-t border-border'>
            <h2 id='footer-ideas' className='font-bold mb-3'>
              <Link href='/cuentos' className='hover:text-primary transition-colors'>
                Ideas de cuentos personalizados
              </Link>
            </h2>
            <ul className='flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted'>
              {SEO_INDEX.map((p) => (
                <li key={p.slug}>
                  <Link href={`/cuentos/${p.slug}`} className='inline-block py-1 hover:text-text transition-colors'>
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className='mt-10 pt-6 border-t border-border text-sm text-text-muted'>
          © {new Date().getFullYear()} IconicoSpace · Solo usamos cookies
          técnicas, sin publicidad ni rastreo.{" "}
          <Link href='/cookies' className='underline underline-offset-2 hover:text-text'>
            Más información
          </Link>
        </p>
      </div>
    </footer>
  );
}
