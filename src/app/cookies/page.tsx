import { Metadata } from "next";
import Link from "next/link";
import { Book, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Cookies - LibrosIA",
  description: "Información sobre las cookies utilizadas en LibrosIA",
};

export default function CookiesPage() {
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
        <h1 className='text-3xl font-bold mb-8'>Política de Cookies</h1>
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
            <h2 className='text-xl font-bold mb-3'>1. ¿Qué son las cookies?</h2>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web
              almacenan en tu dispositivo cuando los visitas. Se utilizan para
              recordar tus preferencias, mantener tu sesión activa y mejorar tu
              experiencia de navegación.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              2. Cookies que utilizamos
            </h2>

            <h3 className='text-lg font-semibold mt-6 mb-3'>
              🟢 Cookies estrictamente necesarias
            </h3>
            <p className='mb-3'>
              Estas cookies son esenciales para el funcionamiento del sitio. No
              requieren consentimiento y no se pueden desactivar.
            </p>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm border border-border rounded-lg'>
                <thead className='bg-surface'>
                  <tr>
                    <th className='px-4 py-2 text-left'>Cookie</th>
                    <th className='px-4 py-2 text-left'>Proveedor</th>
                    <th className='px-4 py-2 text-left'>Finalidad</th>
                    <th className='px-4 py-2 text-left'>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-t border-border'>
                    <td className='px-4 py-2 font-mono'>
                      next-auth.session-token
                    </td>
                    <td className='px-4 py-2'>NextAuth</td>
                    <td className='px-4 py-2'>
                      Mantener tu sesión de usuario activa
                    </td>
                    <td className='px-4 py-2'>30 días</td>
                  </tr>
                  <tr className='border-t border-border'>
                    <td className='px-4 py-2 font-mono'>
                      next-auth.csrf-token
                    </td>
                    <td className='px-4 py-2'>NextAuth</td>
                    <td className='px-4 py-2'>
                      Protección contra ataques CSRF
                    </td>
                    <td className='px-4 py-2'>Sesión</td>
                  </tr>
                  <tr className='border-t border-border'>
                    <td className='px-4 py-2 font-mono'>
                      next-auth.callback-url
                    </td>
                    <td className='px-4 py-2'>NextAuth</td>
                    <td className='px-4 py-2'>
                      Redirección tras inicio de sesión
                    </td>
                    <td className='px-4 py-2'>Sesión</td>
                  </tr>
                  <tr className='border-t border-border'>
                    <td className='px-4 py-2 font-mono'>cookie-consent</td>
                    <td className='px-4 py-2'>LibrosIA</td>
                    <td className='px-4 py-2'>
                      Recordar tu elección de cookies
                    </td>
                    <td className='px-4 py-2'>365 días</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className='text-lg font-semibold mt-6 mb-3'>
              🟡 Cookies de terceros (pagos)
            </h3>
            <p className='mb-3'>
              Estas cookies son establecidas por Stripe durante el proceso de
              pago para prevenir fraude y procesar transacciones.
            </p>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm border border-border rounded-lg'>
                <thead className='bg-surface'>
                  <tr>
                    <th className='px-4 py-2 text-left'>Cookie</th>
                    <th className='px-4 py-2 text-left'>Proveedor</th>
                    <th className='px-4 py-2 text-left'>Finalidad</th>
                    <th className='px-4 py-2 text-left'>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className='border-t border-border'>
                    <td className='px-4 py-2 font-mono'>__stripe_mid</td>
                    <td className='px-4 py-2'>Stripe</td>
                    <td className='px-4 py-2'>Detección de fraude en pagos</td>
                    <td className='px-4 py-2'>1 año</td>
                  </tr>
                  <tr className='border-t border-border'>
                    <td className='px-4 py-2 font-mono'>__stripe_sid</td>
                    <td className='px-4 py-2'>Stripe</td>
                    <td className='px-4 py-2'>Sesión de pago</td>
                    <td className='px-4 py-2'>30 min</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              3. Cookies que NO utilizamos
            </h2>
            <p>
              Actualmente <strong>no utilizamos</strong> cookies de analítica
              (Google Analytics, Plausible, etc.), cookies publicitarias ni
              cookies de redes sociales. Si esto cambia en el futuro,
              actualizaremos esta política y te pediremos consentimiento.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              4. Cómo gestionar las cookies
            </h2>
            <p>Puedes gestionar las cookies de las siguientes formas:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Banner de consentimiento:</strong> al visitar la web por
                primera vez, puedes aceptar o rechazar las cookies no
                esenciales.
              </li>
              <li>
                <strong>Configuración del navegador:</strong> puedes configurar
                tu navegador para bloquear o eliminar cookies. Ten en cuenta que
                esto puede afectar al funcionamiento del sitio.
              </li>
            </ul>
            <p className='mt-3'>
              Enlaces útiles para gestionar cookies en tu navegador:
            </p>
            <ul className='list-disc pl-6 space-y-1'>
              <li>
                <a
                  href='https://support.google.com/chrome/answer/95647'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href='https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href='https://support.apple.com/es-es/guide/safari/sfri11471/mac'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Safari
                </a>
              </li>
              <li>
                <a
                  href='https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>5. Más información</h2>
            <p>
              Para cualquier duda sobre nuestra política de cookies, contacta
              con nosotros en{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline'>
                hola@iconicospace.com
              </a>
              .
            </p>
            <p>
              También puedes consultar nuestra{" "}
              <Link href='/privacidad' className='text-primary hover:underline'>
                Política de Privacidad
              </Link>{" "}
              para más información sobre cómo tratamos tus datos.
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
