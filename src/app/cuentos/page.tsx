import type { Metadata } from "next";
import Link from "next/link";
import { Book, Wand2 } from "lucide-react";
import { SEO_INDEX } from "@/lib/seo-pages";

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
    <div className='min-h-screen bg-bg'>
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
            href='/editor'
            className='px-4 sm:px-6 py-2 sm:py-2.5 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl transition-colors'>
            Crear gratis
          </Link>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 py-8 sm:py-12'>
        <h1 className='text-3xl sm:text-4xl font-bold mb-4'>
          Cuentos personalizados por tema y ocasión
        </h1>
        <p className='text-base sm:text-lg text-text-muted mb-10 max-w-2xl'>
          Cada cuento se escribe para un niño concreto: su nombre, su edad (de 3
          a 8 años) y el tema que le apasiona. Aquí tienes ideas y consejos para
          elegir la historia; la historia y la portada de muestra son gratis.
        </p>

        {GROUPS.map((group) => (
          <section key={group.kind} className='mb-10' aria-labelledby={`g-${group.kind}`}>
            <h2 id={`g-${group.kind}`} className='text-xl sm:text-2xl font-bold mb-4'>
              {group.heading}
            </h2>
            <ul className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
              {SEO_INDEX.filter((p) => p.kind === group.kind).map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/cuentos/${p.slug}`}
                    className='flex items-center gap-3 p-4 rounded-xl bg-surface border border-border hover:border-primary transition-colors h-full'>
                    <span aria-hidden className='text-2xl'>
                      {p.emoji}
                    </span>
                    <span className='font-medium'>{p.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className='text-center mt-12'>
          <Link
            href='/editor'
            className='inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-primary hover:bg-primary-hover text-white font-bold text-base sm:text-lg rounded-xl transition-colors'>
            <Wand2 className='w-5 h-5' aria-hidden />
            Crear su libro gratis
          </Link>
        </div>
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
