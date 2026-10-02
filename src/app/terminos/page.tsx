import type { Metadata } from "next";
import Link from "next/link";
import { getLegalOwner } from "@/lib/legal";
import {
  BUNDLE_PRODUCT,
  CREDIT_PACKS,
  EXTRA_COPY,
  FOUNDER_OFFER,
  FREE_REDRAWS,
  GUARANTEE_TEXT,
  PRINT_PRODUCT,
  formatEuros,
} from "@/lib/pricing";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de compra y uso de LibrosIA: cuento impreso + PDF, solo PDF, aprobación antes de imprimir, garantía, envíos y precio fundador.",
};

export default async function TerminosPage() {
  const owner = await getLegalOwner();
  const days = `${PRINT_PRODUCT.deliveryDays.min} y ${PRINT_PRODUCT.deliveryDays.max}`;

  return (
    <LegalLayout
      title='Términos y condiciones'
      updated='2 de octubre de 2026'
      intro={
        <>
          <p className='font-bold mb-2'>En pocas palabras</p>
          <ul className='list-disc pl-5 space-y-1.5'>
            <li>Crear la historia y ver su portada es gratis y sin tarjeta.</li>
            <li>
              Pagas una sola vez por cuento:{" "}
              <span className='whitespace-nowrap'>{formatEuros(BUNDLE_PRODUCT.price)}</span>{" "}
              impreso + PDF (envío incluido) o{" "}
              <span className='whitespace-nowrap'>{formatEuros(CREDIT_PACKS.digital.price)}</span>{" "}
              solo PDF.
            </li>
            <li>El libro impreso no se imprime hasta que tú lo apruebas.</li>
            <li>
              Si una ilustración no te convence, la rehacemos gratis; si aun así
              no te gusta, te devolvemos el dinero del digital.
            </li>
            <li>Enviamos el libro impreso solo a España.</li>
          </ul>
        </>
      }>
      <h2>1. Quién presta el servicio</h2>
      <p>
        LibrosIA es un servicio de <strong>{owner.name}</strong>
        {owner.name !== "IconicoSpace" && <> (marca comercial IconicoSpace)</>}
        {owner.taxId && <>, con NIF {owner.taxId}</>}
        {owner.address ? <>, con domicilio en {owner.address}</> : <>, con domicilio en España</>}
        . Contacto: <a href={`mailto:${owner.email}`}>{owner.email}</a>. Más
        datos en el <Link href='/legal'>aviso legal</Link>.
      </p>
      <p>
        Para comprar debes ser mayor de edad. Si compras para un niño, eres su
        madre, padre, tutor o cuentas con su permiso para usar su nombre y, en
        su caso, su foto.
      </p>

      <h2>2. Qué ofrecemos</h2>
      <p>
        LibrosIA crea cuentos infantiles personalizados (de 3 a 8 años) con la
        ayuda de inteligencia artificial: escribes el nombre del niño y lo que
        le gusta, y generamos una historia y una portada. Esa primera parte es{" "}
        <strong>gratuita</strong>. Si quieres el cuento completo, puedes
        comprar:
      </p>
      <div className='overflow-x-auto mb-4 rounded-xl border border-border'>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Qué incluye</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{BUNDLE_PRODUCT.name}</strong>
              </td>
              <td>
                Portada + 12 páginas ilustradas; libro impreso de 21×21 cm en
                tapa blanda con envío a domicilio en España; PDF para pantalla
                y para imprimir.
              </td>
              <td>{formatEuros(BUNDLE_PRODUCT.price)}</td>
            </tr>
            <tr>
              <td>
                <strong>Solo PDF</strong>
              </td>
              <td>Portada + 12 páginas ilustradas, en PDF para pantalla y para imprimir en casa.</td>
              <td>{formatEuros(CREDIT_PACKS.digital.price)}</td>
            </tr>
            <tr>
              <td>
                <strong>Pasar a papel</strong>
              </td>
              <td>Libro impreso de un cuento del que ya tienes el PDF, con envío incluido.</td>
              <td>{formatEuros(PRINT_PRODUCT.price)}</td>
            </tr>
            <tr>
              <td>
                <strong>Copia extra</strong>
              </td>
              <td>
                Otro ejemplar impreso del mismo libro, en el mismo envío
                (hasta {EXTRA_COPY.max} por pedido).
              </td>
              <td>{formatEuros(EXTRA_COPY.price)} cada una</td>
            </tr>
            <tr>
              <td>
                <strong>{CREDIT_PACKS.repeat.name}</strong>
              </td>
              <td>Un cuento digital más, para quien ya ha comprado alguno.</td>
              <td>{formatEuros(CREDIT_PACKS.repeat.price)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Los textos y las ilustraciones se generan con inteligencia artificial.
        El protagonista es un <strong>personaje dibujado inspirado</strong> en
        los rasgos que nos indicas (pelo, ojos, piel), no un retrato exacto ni
        una foto.
      </p>

      <h2>3. Sin cuenta obligatoria</h2>
      <ul>
        <li>
          No necesitas crear una cuenta. Tu cuento queda asociado a tu
          navegador y al email que nos dejes, y te enviamos un enlace privado
          para abrirlo desde cualquier dispositivo. Puedes recuperar tus
          cuentos desde <Link href='/mis-libros'>Mis cuentos</Link> con ese
          email.
        </li>
        <li>
          Si prefieres, puedes crear una cuenta con Google o con tu email. Eres
          responsable de mantener seguro el acceso a tu email y a tu cuenta, y
          de no compartir los enlaces privados de tus cuentos.
        </li>
      </ul>

      <h2>4. Precios y pago</h2>
      <ul>
        <li>
          Los precios están en euros e <strong>incluyen el IVA</strong>. En los
          productos impresos, el envío a España también está incluido.
        </li>
        <li>
          El pago es único (sin suscripciones) y se hace en la página segura de
          Stripe, con tarjeta, Apple Pay o Google Pay. No vemos ni guardamos los
          datos de tu tarjeta.
        </li>
        <li>
          El importe final, con los descuentos que correspondan, se muestra
          antes de confirmar el pago. Recibirás la confirmación por email.
        </li>
        <li>
          <strong>Precio fundador.</strong> Los {FOUNDER_OFFER.limit} primeros
          pedidos pagados de LibrosIA tienen un descuento del{" "}
          {FOUNDER_OFFER.percent} % que se aplica automáticamente, sin códigos.
          El contador es real y la web muestra cuántos quedan. Si el descuento
          está activo cuando pagas, se aplica a todo el pedido; cuando se agota,
          no se aplica a pedidos posteriores ni se devuelve la diferencia de los
          anteriores.
        </li>
      </ul>

      <h2>5. Revisión y aprobación del libro</h2>
      <ul>
        <li>
          Tras el pago ilustramos la portada y las 12 páginas, normalmente en
          unos minutos. Te avisamos por email cuando está listo.
        </li>
        <li>
          Puedes cambiar el texto de cualquier página y{" "}
          <strong>rehacer dibujos gratis hasta {FREE_REDRAWS} veces</strong> por
          cuento.
        </li>
        <li>
          En los productos impresos,{" "}
          <strong>el libro no se envía a imprenta hasta que lo apruebas</strong>{" "}
          expresamente desde la web. Revisa con calma nombres, textos e
          ilustraciones: una vez aprobado, el libro se imprime tal cual y ya no
          se puede modificar.
        </li>
      </ul>

      <h2>6. Envío del libro impreso</h2>
      <ul>
        <li>Solo enviamos a direcciones de España.</li>
        <li>
          El libro lo imprime y lo envía nuestra imprenta colaboradora. Suele
          llegar entre {days} días laborables después de que lo apruebes. En
          fechas de mucha demanda (por ejemplo, diciembre) la mensajería puede
          tardar algo más; te recomendamos pedir con margen.
        </li>
        <li>
          Revisa que la dirección de envío sea correcta al pagar. Si un envío
          vuelve por una dirección incorrecta o por no recogerlo, te
          contactaremos para reenviarlo.
        </li>
        <li>
          Si el libro llega dañado o con un defecto de impresión, escríbenos a{" "}
          <a href={`mailto:${owner.email}`}>{owner.email}</a> con una foto y te
          enviamos otro sin coste.
        </li>
      </ul>

      <h2>7. Garantía de satisfacción</h2>
      <p>
        Además de tus derechos legales, te damos esta garantía comercial:{" "}
        <strong>{GUARANTEE_TEXT}</strong>
      </p>
      <ul>
        <li>
          <strong>Rehacer ilustraciones:</strong> puedes pedir que rehagamos los
          dibujos que no te convenzan (hasta {FREE_REDRAWS} veces gratis desde
          el propio cuento; si necesitas más, escríbenos).
        </li>
        <li>
          <strong>Devolución del digital:</strong> si aun así el cuento no te
          gusta, escríbenos en los 14 días siguientes a la compra y te
          devolvemos lo que pagaste por el cuento digital.
        </li>
        <li>
          <strong>Impreso + PDF:</strong> mientras no hayas aprobado el libro
          para imprenta, puedes pedir la devolución completa. Una vez aprobado
          e impreso, al ser un producto personalizado, solo se repone o devuelve
          si llega dañado o con un defecto (apartado 6) o si no es conforme con
          lo que compraste.
        </li>
        <li>
          La devolución se hace en el mismo medio de pago, en un plazo máximo
          de 14 días desde que nos lo pides.
        </li>
      </ul>
      <p>
        Esta garantía es válida para compras hechas en España y no afecta a tu
        garantía legal (3 años para el libro impreso y 2 años para el
        contenido digital) ni al resto de derechos que te da la ley. Más
        detalles en <Link href='/desistimiento'>desistimiento y garantías</Link>.
      </p>

      <h2>8. Derecho de desistimiento</h2>
      <p>
        Los cuentos se hacen a medida con los datos que nos das, por lo que no
        tienen derecho de desistimiento (art. 103 de la Ley General para la
        Defensa de los Consumidores y Usuarios): el libro impreso es un bien
        personalizado y el PDF es contenido digital que empezamos a preparar
        en cuanto pagas, con tu consentimiento. Esto no limita la garantía de
        satisfacción del apartado 7. Lo explicamos en{" "}
        <Link href='/desistimiento'>desistimiento y garantías</Link>.
      </p>

      <h2>9. Uso de los cuentos</h2>
      <ul>
        <li>
          Los cuentos que creas son para uso personal y familiar: puedes
          leerlos, imprimirlos, regalarlos y compartirlos con quien quieras.
        </li>
        <li>No puedes revenderlos como producto comercial sin nuestro permiso.</li>
        <li>
          La web, su diseño, su código y la marca LibrosIA pertenecen a
          IconicoSpace.
        </li>
      </ul>

      <h2>10. Uso aceptable</h2>
      <p>No está permitido:</p>
      <ul>
        <li>Pedir contenido violento, sexual, ofensivo o inadecuado para niños.</li>
        <li>
          Usar fotos o datos de un menor sin ser su madre, padre o tutor, o sin
          su permiso.
        </li>
        <li>Pedir personajes, marcas u obras protegidas de terceros.</li>
        <li>Usar bots o automatismos, o intentar eludir el pago.</li>
      </ul>
      <p>
        Podemos rechazar o retirar contenido que incumpla estas normas y, si
        hubiera un pago, lo devolveríamos.
      </p>

      <h2>11. Contenido generado por IA</h2>
      <p>
        Revisamos el contenido con filtros automáticos, pero la IA puede
        cometer errores (una frase rara, un detalle del dibujo). Por eso puedes
        leer y editar todo el texto, rehacer dibujos y aprobar el libro antes
        de imprimirlo.
      </p>

      <h2>12. Responsabilidad</h2>
      <p>
        Respondemos de que el servicio y los productos sean conformes con lo
        contratado, según la ley. No respondemos de interrupciones puntuales
        de la web por causas ajenas a nosotros. Nada de lo anterior limita los
        derechos que te reconoce la normativa de consumidores.
      </p>

      <h2>13. Cambios en el servicio y en estos términos</h2>
      <p>
        Podemos actualizar estos términos; se aplican los vigentes en la fecha
        de tu compra. Si algún día cerrásemos el servicio, te avisaríamos con al
        menos 30 días para que puedas descargar tus cuentos.
      </p>

      <h2>14. Ley aplicable y reclamaciones</h2>
      <p>
        Estos términos se rigen por la ley española. Si tienes cualquier
        problema, escríbenos primero a{" "}
        <a href={`mailto:${owner.email}`}>{owner.email}</a> y lo resolveremos.
        También puedes acudir a los servicios de consumo de tu comunidad
        autónoma o a la Junta Arbitral de Consumo, y en caso de conflicto son
        competentes los juzgados de tu domicilio.
      </p>
    </LegalLayout>
  );
}
