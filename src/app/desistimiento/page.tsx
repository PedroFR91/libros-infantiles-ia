import type { Metadata } from "next";
import Link from "next/link";
import { getLegalOwner } from "@/lib/legal";
import { FREE_REDRAWS, GUARANTEE_TEXT, PRINT_ENABLED } from "@/lib/pricing";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Desistimiento y garantías",
  description:
    "Derecho de desistimiento, garantía de satisfacción y garantía legal de los cuentos personalizados de LibrosIA.",
};

export default async function DesistimientoPage() {
  const owner = await getLegalOwner();

  return (
    <LegalLayout
      title='Desistimiento y garantías'
      updated='4 de octubre de 2026'
      intro={
        <>
          <p className='font-bold mb-2'>Resumen</p>
          <p className='mb-2'>
            Cada cuento se hace a medida, así que no tiene derecho de
            desistimiento. Pero no te quedas sin protección:
          </p>
          <ul className='list-disc pl-5 space-y-1.5'>
            <li>
              <strong>Nuestra garantía:</strong> {GUARANTEE_TEXT}
            </li>
            <li>
              <strong>Impreso{!PRINT_ENABLED && " (próximamente)"}:</strong>{" "}
              hasta que lo apruebas para imprenta, puedes pedir la devolución
              completa.
            </li>
            <li>
              <strong>Garantía legal:</strong> 3 años para el libro impreso y 2
              años para el contenido digital, como marca la ley.
            </li>
          </ul>
        </>
      }>
      <h2>1. Por qué no hay derecho de desistimiento</h2>
      <p>
        Normalmente, en las compras a distancia tienes 14 días naturales para
        desistir sin dar explicaciones. La ley (art. 103 del Real Decreto
        Legislativo 1/2007, que transpone la Directiva 2011/83/UE) excluye de
        ese derecho:
      </p>
      <ul>
        <li>
          <strong>Los bienes hechos según las especificaciones del cliente</strong>{" "}
          o claramente personalizados (art. 103.c): el libro impreso lleva el
          nombre, la historia y las ilustraciones de tu hijo.
        </li>
        <li>
          <strong>El contenido digital sin soporte material</strong> cuya
          ejecución empieza con tu consentimiento expreso y tu conocimiento de
          que pierdes el derecho de desistimiento (art. 103.m): al pagar
          aceptas que empecemos a ilustrar tu cuento de inmediato.
        </li>
      </ul>

      <h2>2. Cuándo sí te devolvemos el dinero</h2>
      <ul>
        <li>
          <strong>Garantía de satisfacción (digital):</strong> si una
          ilustración no te convence, la rehacemos gratis (hasta{" "}
          {FREE_REDRAWS} veces desde el propio cuento; si necesitas más,
          escríbenos). Si aun así el cuento no te gusta, escríbenos en los 14
          días siguientes a la compra y te devolvemos lo que pagaste por el
          cuento digital.
        </li>
        <li>
          <strong>Impreso + PDF antes de aprobarlo:</strong> mientras no hayas
          aprobado el libro para imprenta, puedes pedir la devolución completa
          del pedido.
          {!PRINT_ENABLED &&
            " El libro impreso aún no está a la venta: esto se aplicará cuando esté disponible."}
        </li>
        <li>
          <strong>Libro dañado o con defecto de impresión:</strong> te enviamos
          otro sin coste o, si lo prefieres, te devolvemos su importe.
        </li>
        <li>
          <strong>Fallo técnico:</strong> si un error nuestro impide generar tu
          cuento, te lo volvemos a generar o te devolvemos el dinero.
        </li>
        <li>
          <strong>Cobro duplicado:</strong> devolvemos el cobro de más en
          cuanto nos avisas.
        </li>
      </ul>
      <p>
        La garantía de satisfacción es una garantía comercial adicional,
        válida para compras hechas en España, y no sustituye ni limita tus
        derechos legales.
      </p>

      <h2>3. Garantía legal</h2>
      <p>
        Si el producto no es conforme con lo que compraste, tienes derecho a
        que lo reparemos, lo sustituyamos, te rebajemos el precio o resolvamos
        el contrato, sin coste para ti. El plazo es de{" "}
        <strong>3 años para el libro impreso</strong> y de{" "}
        <strong>2 años para el contenido digital</strong> (arts. 114 y
        siguientes del Real Decreto Legislativo 1/2007).
      </p>

      <h2>4. Cómo pedir una devolución</h2>
      <p>
        Escríbenos a <a href={`mailto:${owner.email}`}>{owner.email}</a>{" "}
        indicando:
      </p>
      <ul>
        <li>El email con el que hiciste la compra.</li>
        <li>El título del cuento o el enlace a tu cuento.</li>
        <li>
          Qué ha pasado (si es un defecto del libro impreso, adjunta una foto).
        </li>
      </ul>
      <p>
        Te contestamos lo antes posible y, si corresponde, hacemos la
        devolución en un máximo de <strong>14 días</strong>, en el mismo medio
        de pago que usaste.
      </p>

      <h2>5. Formulario de solicitud</h2>
      <p>Si te resulta más cómodo, puedes copiar este modelo en tu email:</p>
      <div className='rounded-2xl bg-bg-light border border-border p-5 space-y-2 mb-4'>
        <p>
          A la atención de {owner.name}
          {owner.name !== "IconicoSpace" && " (IconicoSpace)"}, {owner.email}:
        </p>
        <p>
          Solicito la devolución del siguiente pedido:{" "}
          <em>[cuento impreso + PDF / solo PDF / pasar a papel / copia extra]</em>
        </p>
        <p>
          Título del cuento: <em>[título]</em>
        </p>
        <p>
          Fecha del pedido: <em>[fecha]</em>
        </p>
        <p>
          Nombre y email: <em>[nombre, email]</em>
        </p>
        <p>
          Motivo: <em>[garantía de satisfacción / defecto / otro]</em>
        </p>
        <p>
          Fecha: <em>[fecha de hoy]</em>
        </p>
      </div>

      <h2>6. Normativa</h2>
      <p>
        Real Decreto Legislativo 1/2007, Ley General para la Defensa de los
        Consumidores y Usuarios; Directiva 2011/83/UE sobre los derechos de los
        consumidores y Directivas (UE) 2019/770 y 2019/771 sobre contenidos
        digitales y compraventa de bienes. Consulta también los{" "}
        <Link href='/terminos'>términos y condiciones</Link>.
      </p>
    </LegalLayout>
  );
}
