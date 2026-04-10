import { Metadata } from "next";
import Link from "next/link";
import { Book, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos de Servicio - LibrosIA",
  description: "Términos y condiciones de uso de LibrosIA",
};

export default function TerminosPage() {
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
        <h1 className='text-3xl font-bold mb-8'>Términos de Servicio</h1>
        <p className='text-text-muted mb-6'>
          Última actualización:{" "}
          {new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className='prose prose-lg max-w-none space-y-8 text-text'>
          <section>
            <h2 className='text-xl font-bold mb-3'>
              1. Identificación del prestador
            </h2>
            <p>
              El presente sitio web y servicio es operado por{" "}
              <strong>IconicoSpace</strong>, con domicilio en España. Contacto:{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline'>
                hola@iconicospace.com
              </a>
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              2. Descripción del servicio
            </h2>
            <p>
              LibrosIA es una plataforma que permite a los usuarios crear libros
              infantiles personalizados mediante inteligencia artificial. El
              servicio incluye:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Generación de historias personalizadas con texto e
                ilustraciones.
              </li>
              <li>Descarga de libros en formato PDF.</li>
              <li>Sistema de créditos para la generación de contenido.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>3. Registro y cuenta</h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Para usar el servicio debes crear una cuenta usando Google o
                correo electrónico.
              </li>
              <li>Eres responsable de mantener la seguridad de tu cuenta.</li>
              <li>
                Debes ser mayor de 18 años o contar con autorización de un tutor
                legal.
              </li>
              <li>Cada persona puede tener una sola cuenta.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>4. Créditos y pagos</h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Los créditos se compran a través de Stripe en packs
                predefinidos.
              </li>
              <li>
                Los precios se muestran en euros (€) e incluyen IVA cuando
                aplique.
              </li>
              <li>
                Cada libro generado consume créditos según su complejidad
                (aproximadamente 5 créditos por libro).
              </li>
              <li>
                Los créditos comprados <strong>no caducan</strong> mientras tu
                cuenta esté activa.
              </li>
              <li>
                Los créditos <strong>no son transferibles</strong> entre
                cuentas.
              </li>
              <li>
                Los créditos <strong>no son reembolsables</strong> una vez
                consumidos (ver sección de devoluciones).
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              5. Política de devoluciones
            </h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Créditos no consumidos:</strong> si no has utilizado
                ningún crédito de un pack comprado, puedes solicitar un
                reembolso completo dentro de los 14 días siguientes a la compra,
                conforme al derecho de desistimiento de la UE.
              </li>
              <li>
                <strong>Créditos consumidos:</strong> una vez que has generado
                contenido con tus créditos, no es posible solicitar un reembolso
                por dichos créditos, ya que el contenido digital ha sido
                entregado y consumido.
              </li>
              <li>
                <strong>Fallos técnicos:</strong> si un fallo técnico impide la
                generación correcta de un libro, te reembolsaremos los créditos
                consumidos en esa generación.
              </li>
            </ul>
            <p className='mt-3'>
              Para solicitar un reembolso, contacta con{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline'>
                hola@iconicospace.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>6. Propiedad intelectual</h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Tu contenido:</strong> los libros generados con tus
                datos e instrucciones son para tu uso personal y privado. Puedes
                imprimirlos, compartirlos y regalarlos.
              </li>
              <li>
                <strong>Licencia limitada:</strong> te otorgamos una licencia
                personal, no exclusiva y no transferible para usar los libros
                generados. No puedes revender los libros generados como
                productos comerciales sin autorización.
              </li>
              <li>
                <strong>Nuestra plataforma:</strong> el código, diseño, marca y
                tecnología de LibrosIA son propiedad de IconicoSpace.
              </li>
              <li>
                <strong>IA generativa:</strong> los textos e imágenes son
                generados por inteligencia artificial (OpenAI). Entiendes que
                son contenido generado algorítmicamente.
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>7. Uso aceptable</h2>
            <p>No está permitido:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Generar contenido ofensivo, violento, sexual o inapropiado para
                menores.
              </li>
              <li>Intentar eludir los sistemas de pago o créditos.</li>
              <li>
                Usar bots o scripts automatizados para generar contenido
                masivamente.
              </li>
              <li>Compartir tu cuenta con terceros o revender créditos.</li>
              <li>Usar el servicio para cualquier actividad ilegal.</li>
            </ul>
            <p className='mt-3'>
              Nos reservamos el derecho de suspender cuentas que violen estas
              condiciones.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              8. Limitación de responsabilidad
            </h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                El servicio se proporciona &quot;tal cual&quot;. No garantizamos
                que el servicio esté disponible de forma ininterrumpida.
              </li>
              <li>
                El contenido es generado por IA y puede contener imprecisiones.
                No nos hacemos responsables de la exactitud del contenido
                generado.
              </li>
              <li>
                Nuestra responsabilidad total se limita al importe pagado por el
                usuario en los últimos 12 meses.
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              9. Disponibilidad y modificaciones
            </h2>
            <p>
              Nos reservamos el derecho de modificar, suspender o discontinuar
              el servicio en cualquier momento. En caso de cierre del servicio,
              los usuarios con créditos no consumidos recibirán un reembolso
              proporcional.
            </p>
            <p>
              Podemos modificar estos términos. Te notificaremos cambios
              significativos con al menos 30 días de antelación.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              10. Legislación aplicable
            </h2>
            <p>
              Estos términos se rigen por la legislación española y la normativa
              de la Unión Europea aplicable. Para cualquier controversia, serán
              competentes los Juzgados y Tribunales del domicilio del
              consumidor, conforme a la normativa de protección de consumidores
              de la UE.
            </p>
            <p className='mt-3'>
              También puedes recurrir a la{" "}
              <a
                href='https://ec.europa.eu/consumers/odr'
                className='text-primary hover:underline'
                target='_blank'
                rel='noopener'>
                Plataforma de Resolución de Litigios en Línea de la UE
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className='border-t border-border py-8 px-4'>
        <div className='max-w-4xl mx-auto flex flex-wrap gap-4 text-sm text-text-muted'>
          <Link href='/privacidad' className='hover:text-text'>
            Privacidad
          </Link>
          <Link href='/cookies' className='hover:text-text'>
            Cookies
          </Link>
          <Link href='/legal' className='hover:text-text'>
            Aviso Legal
          </Link>
          <Link href='/desistimiento' className='hover:text-text'>
            Desistimiento
          </Link>
        </div>
      </footer>
    </div>
  );
}
