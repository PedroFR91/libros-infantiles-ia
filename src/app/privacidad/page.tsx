import { Metadata } from "next";
import Link from "next/link";
import { Book, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad - LibrosIA",
  description: "Política de privacidad y protección de datos de LibrosIA",
};

export default function PrivacidadPage() {
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
        <h1 className='text-3xl font-bold mb-8'>Política de Privacidad</h1>
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
              1. Responsable del tratamiento
            </h2>
            <p>
              El responsable del tratamiento de tus datos personales es{" "}
              <strong>IconicoSpace</strong>
              (en adelante, &quot;nosotros&quot;), con domicilio en España.
            </p>
            <p>
              Contacto:{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline'>
                hola@iconicospace.com
              </a>
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>2. Datos que recopilamos</h2>
            <p>Recopilamos los siguientes datos personales:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Datos de registro:</strong> nombre, dirección de correo
                electrónico (a través de Google OAuth o magic link).
              </li>
              <li>
                <strong>Datos de pago:</strong> procesados directamente por
                Stripe. No almacenamos datos de tarjetas de crédito en nuestros
                servidores.
              </li>
              <li>
                <strong>Datos de uso:</strong> libros creados, créditos
                consumidos, historial de transacciones.
              </li>
              <li>
                <strong>Datos técnicos:</strong> dirección IP, tipo de
                navegador, sistema operativo (para seguridad y rate limiting).
              </li>
              <li>
                <strong>Contenido generado:</strong> los textos e imágenes de
                los libros que creas usando nuestro servicio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              3. Finalidad del tratamiento
            </h2>
            <p>Utilizamos tus datos para:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>Crear y gestionar tu cuenta de usuario.</li>
              <li>Procesar pagos y asignar créditos.</li>
              <li>
                Generar libros infantiles personalizados mediante inteligencia
                artificial.
              </li>
              <li>
                Enviarte comunicaciones relacionadas con tu cuenta
                (confirmaciones de pago, libros listos).
              </li>
              <li>Mejorar nuestro servicio y prevenir fraude.</li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>4. Base legal</h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Ejecución del contrato</strong> (art. 6.1.b RGPD): para
                prestarte el servicio contratado.
              </li>
              <li>
                <strong>Consentimiento</strong> (art. 6.1.a RGPD): para cookies
                no esenciales y comunicaciones comerciales.
              </li>
              <li>
                <strong>Interés legítimo</strong> (art. 6.1.f RGPD): para
                prevención de fraude y mejora del servicio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              5. Terceros que acceden a tus datos
            </h2>
            <p>
              Compartimos datos con los siguientes proveedores, todos con
              acuerdos de procesamiento de datos:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Stripe</strong> (pagos): procesa transacciones de pago.{" "}
                <a
                  href='https://stripe.com/privacy'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Política de Stripe
                </a>
              </li>
              <li>
                <strong>OpenAI</strong> (generación de contenido): genera textos
                e imágenes para los libros.{" "}
                <a
                  href='https://openai.com/privacy'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Política de OpenAI
                </a>
              </li>
              <li>
                <strong>Google</strong> (autenticación): si usas Google para
                iniciar sesión.{" "}
                <a
                  href='https://policies.google.com/privacy'
                  className='text-primary hover:underline'
                  target='_blank'
                  rel='noopener'>
                  Política de Google
                </a>
              </li>
              <li>
                <strong>Resend</strong> (emails transaccionales): envío de
                correos de verificación y confirmación.
              </li>
              <li>
                <strong>Hetzner/AWS</strong> (almacenamiento): almacenamiento de
                archivos PDF generados.
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              6. Transferencias internacionales
            </h2>
            <p>
              Algunos de nuestros proveedores (OpenAI, Stripe, Google) pueden
              procesar datos fuera del Espacio Económico Europeo. En todos los
              casos, existen garantías adecuadas conforme al RGPD (Cláusulas
              Contractuales Tipo, Data Privacy Framework).
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>7. Conservación de datos</h2>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Datos de cuenta:</strong> mientras mantengas tu cuenta
                activa.
              </li>
              <li>
                <strong>Datos de pago:</strong> según las obligaciones fiscales
                españolas (mínimo 4 años).
              </li>
              <li>
                <strong>Libros generados:</strong> mientras mantengas tu cuenta
                activa o hasta que solicites su eliminación.
              </li>
              <li>
                <strong>Logs técnicos:</strong> máximo 90 días.
              </li>
            </ul>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>8. Tus derechos (ARCO+)</h2>
            <p>Conforme al RGPD, puedes ejercer los siguientes derechos:</p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                <strong>Acceso:</strong> solicitar una copia de tus datos
                personales.
              </li>
              <li>
                <strong>Rectificación:</strong> corregir datos inexactos.
              </li>
              <li>
                <strong>Supresión:</strong> solicitar la eliminación de tus
                datos (&quot;derecho al olvido&quot;).
              </li>
              <li>
                <strong>Oposición:</strong> oponerte al tratamiento de tus
                datos.
              </li>
              <li>
                <strong>Portabilidad:</strong> recibir tus datos en formato
                estructurado.
              </li>
              <li>
                <strong>Limitación:</strong> solicitar la restricción del
                tratamiento.
              </li>
            </ul>
            <p className='mt-3'>
              Para ejercer cualquier derecho, escríbenos a{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline'>
                hola@iconicospace.com
              </a>
              . Responderemos en un máximo de 30 días.
            </p>
            <p>
              También puedes presentar una reclamación ante la{" "}
              <a
                href='https://www.aepd.es'
                className='text-primary hover:underline'
                target='_blank'
                rel='noopener'>
                Agencia Española de Protección de Datos (AEPD)
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>9. Seguridad</h2>
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus
              datos: cifrado en tránsito (HTTPS/TLS), acceso restringido,
              cabeceras de seguridad (HSTS, CSP), y rate limiting para prevenir
              abusos.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>10. Menores de edad</h2>
            <p>
              LibrosIA es un servicio dirigido a adultos que desean crear libros
              para niños. No recopilamos conscientemente datos de menores de 16
              años. Si eres menor de 16 años, no uses este servicio sin el
              consentimiento de tu padre, madre o tutor legal.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              11. Cambios en esta política
            </h2>
            <p>
              Podemos actualizar esta política periódicamente. Te notificaremos
              cualquier cambio significativo por correo electrónico o mediante
              un aviso en la aplicación.
            </p>
          </section>
        </div>
      </main>

      <footer className='border-t border-border py-8 px-4'>
        <div className='max-w-4xl mx-auto flex flex-wrap gap-4 text-sm text-text-muted'>
          <Link href='/terminos' className='hover:text-text'>
            Términos de Servicio
          </Link>
          <Link href='/cookies' className='hover:text-text'>
            Política de Cookies
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
