import { Metadata } from "next";
import Link from "next/link";
import { Book, ArrowLeft, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Derecho de Desistimiento - LibrosIA",
  description:
    "Información sobre el derecho de desistimiento para compras en LibrosIA",
};

export default function DesistimientoPage() {
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
        <h1 className='text-3xl font-bold mb-8'>Derecho de Desistimiento</h1>
        <p className='text-text-muted mb-6'>
          Última actualización:{" "}
          {new Date().toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <div className='prose prose-lg max-w-none space-y-8 text-text'>
          <div className='bg-amber-500/10 border border-amber-500/30 rounded-xl p-6'>
            <div className='flex gap-3'>
              <AlertCircle className='w-6 h-6 text-amber-500 shrink-0 mt-0.5' />
              <div>
                <h3 className='font-bold text-lg mb-2'>Resumen importante</h3>
                <p>
                  LibrosIA vende <strong>contenido digital</strong> (créditos
                  para generar libros con IA). La normativa europea permite una
                  excepción al derecho de desistimiento para contenido digital
                  suministrado de forma inmediata, siempre que el consumidor
                  haya dado su consentimiento expreso.
                </p>
              </div>
            </div>
          </div>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              1. Derecho de desistimiento general
            </h2>
            <p>
              Conforme al Real Decreto Legislativo 1/2007 y la Directiva
              2011/83/UE sobre derechos de los consumidores, tienes derecho a
              desistir de tu compra en un plazo de{" "}
              <strong>14 días naturales</strong> desde la fecha de compra, sin
              necesidad de indicar motivo alguno.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              2. Excepción para contenido digital
            </h2>
            <p>
              De acuerdo con el artículo 103.m) del Real Decreto Legislativo
              1/2007 (transposición del artículo 16.m de la Directiva
              2011/83/UE), el derecho de desistimiento{" "}
              <strong>no aplica</strong> al suministro de contenido digital que
              no se preste en un soporte material cuando:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                La ejecución ha comenzado con el{" "}
                <strong>consentimiento expreso</strong> del consumidor.
              </li>
              <li>
                El consumidor ha sido informado de que al dar su consentimiento{" "}
                <strong>pierde el derecho de desistimiento</strong>.
              </li>
            </ul>
            <p className='mt-3'>
              En LibrosIA, al completar la compra de créditos y{" "}
              <strong>utilizar cualquier crédito para generar contenido</strong>
              , aceptas que la prestación del servicio ha comenzado y que
              pierdes el derecho de desistimiento sobre los créditos consumidos.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              3. Casos en los que SÍ puedes desistir
            </h2>
            <div className='bg-green-500/10 border border-green-500/30 rounded-xl p-6'>
              <ul className='space-y-3'>
                <li className='flex items-start gap-2'>
                  <span className='text-green-500 font-bold'>✓</span>
                  <span>
                    <strong>Créditos no consumidos:</strong> si no has utilizado
                    ninguno de los créditos adquiridos, puedes solicitar el
                    reembolso completo dentro de los 14 días naturales
                    siguientes a la compra.
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-green-500 font-bold'>✓</span>
                  <span>
                    <strong>Fallo técnico:</strong> si un error del sistema
                    impidió la correcta generación de tu libro, te
                    reembolsaremos los créditos afectados independientemente del
                    plazo.
                  </span>
                </li>
                <li className='flex items-start gap-2'>
                  <span className='text-green-500 font-bold'>✓</span>
                  <span>
                    <strong>Cobro duplicado:</strong> si se te ha cobrado más de
                    una vez por la misma compra, procesaremos el reembolso
                    inmediatamente.
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              4. Cómo ejercer el desistimiento
            </h2>
            <p>
              Para ejercer tu derecho de desistimiento, envía un correo a{" "}
              <a
                href='mailto:hola@iconicospace.com'
                className='text-primary hover:underline'>
                hola@iconicospace.com
              </a>{" "}
              indicando:
            </p>
            <ul className='list-disc pl-6 space-y-2'>
              <li>
                Tu nombre y dirección de correo electrónico asociada a la
                cuenta.
              </li>
              <li>
                Fecha de la compra y referencia del pago (la encontrarás en tu
                email de confirmación).
              </li>
              <li>
                Motivo del desistimiento (opcional pero útil para mejorar
                nuestro servicio).
              </li>
            </ul>
            <p className='mt-3'>
              Procesaremos tu solicitud en un máximo de <strong>14 días</strong>{" "}
              desde la recepción. El reembolso se realizará por el mismo medio
              de pago utilizado en la compra original.
            </p>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>
              5. Formulario modelo de desistimiento
            </h2>
            <p className='mb-3'>
              Conforme al Anexo B de la Directiva 2011/83/UE, puedes usar el
              siguiente modelo:
            </p>
            <div className='bg-surface rounded-xl p-6 border border-border text-sm space-y-3'>
              <p>
                A la atención de IconicoSpace ({" "}
                <a href='mailto:hola@iconicospace.com' className='text-primary'>
                  hola@iconicospace.com
                </a>
                ):
              </p>
              <p>
                Por la presente le comunico que desisto del contrato de
                prestación del siguiente servicio:{" "}
                <em>[indicar pack de créditos adquirido]</em>
              </p>
              <p>
                Pedido realizado el: <em>[fecha]</em>
              </p>
              <p>
                Nombre del consumidor: <em>[nombre]</em>
              </p>
              <p>
                Correo del consumidor: <em>[email]</em>
              </p>
              <p>
                Fecha: <em>[fecha actual]</em>
              </p>
              <p>
                Firma (solo si se envía en papel): <em>[firma]</em>
              </p>
            </div>
          </section>

          <section>
            <h2 className='text-xl font-bold mb-3'>6. Legislación aplicable</h2>
            <p>
              Esta política se rige por el Real Decreto Legislativo 1/2007 (Ley
              General de Consumidores y Usuarios), la Directiva 2011/83/UE del
              Parlamento Europeo y del Consejo, y demás normativa aplicable.
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
          <Link href='/legal' className='hover:text-text'>
            Aviso Legal
          </Link>
        </div>
      </footer>
    </div>
  );
}
