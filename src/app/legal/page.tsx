import { Metadata } from "next";
import Link from "next/link";
import { Book, ArrowLeft, Mail, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Aviso Legal - LibrosIA",
  description:
    "Aviso legal e información del prestador de servicios de LibrosIA",
};

export default function LegalPage() {
  return (
    <div className='min-h-screen bg-bg text-text'>
      <header className='border-b border-border'>
        <div className='max-w-4xl mx-auto px-4 py-4 flex items-center gap-4'>
          <Link
            href='/'
            className='flex items-center gap-2 text-text-muted hover:text-text transition-colors'>
            <ArrowLeft className='w-4 h-4' />
            Volver
          </Link>
          <div className='flex items-center gap-2'>
            <div className='w-7 h-7 rounded-lg bg-primary flex items-center justify-center'>
              <Book className='w-4 h-4 text-white' />
            </div>
            <span className='font-bold'>
              <span className='text-primary'>Libros</span>
              <span className='text-secondary'>IA</span>
            </span>
          </div>
        </div>
      </header>

      <main className='max-w-4xl mx-auto px-4 py-12'>
        <h1 className='text-3xl font-bold mb-8'>Aviso Legal</h1>

        <div className='prose prose-lg max-w-none space-y-8 text-text'>
          <section>
            <h2 className='text-xl font-bold mb-3'>1. Datos del prestador</h2>
            <p>
              En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio,
              de Servicios de la Sociedad de la Información y de Comercio
              Electrónico (LSSI-CE), se facilitan los siguientes datos:
            </p>
            <div className='bg-surface rounded-xl p-6 border border-border space-y-3'>
              <div className='flex items-center gap-3'>
                <Globe className='w-5 h-5 text-primary shrink-0' />
                <div>
                  <span className='font-semibold'>Denominación:</span>{" "}
                  IconicoSpace
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <Mail className='w-5 h-5 text-primary shrink-0' />
                <div>
                  <span className='font-semibold'>Email de contacto:</span>{" "}
                  <a
                    href='mailto:hola@iconicospace.com'
                    className='text-primary hover:underline'>
                    hola@iconicospace.com
                  </a>
                </div>
              </div>
              <div>
                <span className='font-semibold'>Dominio:</span>{" "}
                libros.iconicospace.com
              </div>
              <div>
                <span className='font-semibold'>Actividad:</span> Prestación de
                servicios de generación de contenido digital mediante
                inteligencia artificial.
              </div>
            </div>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>2. Objeto</h2>
            <p>
              El presente Aviso Legal regula el acceso y uso del sitio web
              <strong> libros.iconicospace.com</strong> (en adelante, &quot;el
              sitio web&quot;), que IconicoSpace pone a disposición de los
              usuarios de Internet.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              3. Condiciones de acceso y uso
            </h2>
            <p>
              El acceso al sitio web es gratuito. La utilización del servicio de
              generación de libros requiere la compra de créditos según los{" "}
              <Link href='/terminos' className='text-primary hover:underline'>
                Términos de Servicio
              </Link>
              .
            </p>
            <p>
              El usuario se compromete a hacer un uso adecuado del sitio web y
              de los servicios, conforme a la legislación vigente, la buena fe,
              el orden público y las presentes condiciones.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              4. Propiedad intelectual e industrial
            </h2>
            <p>
              Todos los contenidos del sitio web (textos, imágenes, código
              fuente, diseño gráfico, logotipos, marcas) son propiedad de
              IconicoSpace o de sus licenciantes, y están protegidos por las
              leyes de propiedad intelectual e industrial.
            </p>
            <p>
              Los libros generados por los usuarios mediante la plataforma se
              rigen por las condiciones establecidas en los{" "}
              <Link href='/terminos' className='text-primary hover:underline'>
                Términos de Servicio
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              5. Limitación de responsabilidad
            </h2>
            <p>IconicoSpace no se hace responsable de:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Interrupciones o errores en el acceso al sitio web por causas
                ajenas.
              </li>
              <li>
                Daños causados por terceros mediante intrusiones ilegítimas.
              </li>
              <li>
                La exactitud o idoneidad del contenido generado por inteligencia
                artificial.
              </li>
              <li>El uso que los usuarios hagan del contenido generado.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              6. Resolución de litigios en línea
            </h2>
            <p>
              La Comisión Europea facilita una plataforma de resolución de
              litigios en línea disponible en:{" "}
              <a
                href='https://ec.europa.eu/consumers/odr'
                className='text-primary hover:underline'
                target='_blank'
                rel='noopener'>
                https://ec.europa.eu/consumers/odr
              </a>
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>7. Legislación aplicable</h2>
            <p>
              Este Aviso Legal se rige por la legislación española. Para la
              resolución de cualquier controversia, las partes se someterán a
              los Juzgados y Tribunales del domicilio del consumidor.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>8. Contacto</h2>
            <p>
              Para cualquier consulta relacionada con este aviso legal o con el
              sitio web, puedes ponerte en contacto con nosotros en:
            </p>
            <p className='mt-2'>
              📧{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline font-semibold'>
                hola@iconicospace.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className='border-t border-border py-8 px-4'>
        <div className='max-w-4xl mx-auto flex flex-wrap gap-4 text-sm text-text-muted'>
          <Link href='/privacidad' className='hover:text-text'>
            Privacidad
          </Link>
          <Link href='/terminos' className='hover:text-text'>
            Términos
          </Link>
          <Link href='/cookies' className='hover:text-text'>
            Cookies
          </Link>
          <Link href='/desistimiento' className='hover:text-text'>
            Desistimiento
          </Link>
        </div>
      </footer>
    </div>
  );
}
