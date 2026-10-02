import type { Metadata } from "next";
import Link from "next/link";
import { getLegalOwner } from "@/lib/legal";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description:
    "Cómo trata LibrosIA tus datos: el email para enviarte tu cuento, la foto opcional que no se guarda, los datos de envío y tus derechos.",
};

export default async function PrivacidadPage() {
  const owner = await getLegalOwner();

  return (
    <LegalLayout
      title='Política de privacidad'
      updated='2 de octubre de 2026'
      intro={
        <>
          <p className='font-bold mb-2'>En pocas palabras</p>
          <ul className='list-disc pl-5 space-y-1.5'>
            <li>
              La <strong>foto</strong> del niño es opcional, solo sirve para
              describir sus rasgos y <strong>no se guarda</strong>.
            </li>
            <li>
              Tu <strong>email</strong> lo usamos para enviarte tu cuento y los
              avisos sobre él. No lo vendemos ni lo cedemos.
            </li>
            <li>
              Tu <strong>dirección</strong> solo la recibe la imprenta que envía
              el libro.
            </li>
            <li>Puedes pedirnos que borremos tus datos cuando quieras.</li>
          </ul>
        </>
      }>
      <h2>1. Responsable del tratamiento</h2>
      <p>
        <strong>{owner.name}</strong>
        {owner.name !== "IconicoSpace" && <> (marca IconicoSpace)</>}
        {owner.taxId && <>, con NIF {owner.taxId}</>}
        {owner.address ? <>, con domicilio en {owner.address}</> : <>, con domicilio en España</>}
        . Contacto: <a href={`mailto:${owner.email}`}>{owner.email}</a>.
      </p>

      <h2>2. Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Datos del cuento:</strong> el nombre del niño o niña
          protagonista, su franja de edad, el tema, el compañero y la
          dedicatoria que escribas, y el texto y las ilustraciones que
          generamos. Sirven para crear el cuento.
        </li>
        <li>
          <strong>Foto del protagonista (opcional):</strong> si la subes, se
          envía a OpenAI (nuestro encargado del tratamiento) únicamente para
          describir sus rasgos visibles (pelo, ojos, tono de piel) y dibujar a
          partir de ella un personaje ilustrado. La foto{" "}
          <strong>no se guarda</strong> en nuestros servidores: se usa en
          memoria mientras se crea el personaje y se descarta. Conservamos la
          descripción en texto y la ilustración del personaje dentro de tu
          cuento. Solo puede subirla su madre, padre o tutor legal.
        </li>
        <li>
          <strong>Tu email:</strong> si nos lo dejas mientras se crea el
          borrador, te enviamos la portada y el enlace privado a tu cuento para
          que no lo pierdas. Al pagar, Stripe nos lo facilita para enviarte la
          confirmación y el cuento. También lo usamos para que puedas{" "}
          <Link href='/mis-libros'>recuperar tus cuentos</Link>.
        </li>
        <li>
          <strong>Datos de envío (solo en pedidos impresos):</strong> nombre,
          dirección y teléfono de contacto, que recogemos a través de Stripe
          para entregar el libro.
        </li>
        <li>
          <strong>Datos de pago:</strong> los procesa directamente Stripe.
          Nosotros no vemos ni guardamos el número de tu tarjeta; solo el
          importe, la fecha y el estado del pago.
        </li>
        <li>
          <strong>Cuenta (opcional):</strong> si decides crear una cuenta con
          Google o con tu email, tu nombre, email y, en su caso, foto de perfil
          de Google.
        </li>
        <li>
          <strong>Datos técnicos:</strong> una cookie técnica que recuerda tus
          cuentos en este navegador, y la dirección IP de forma temporal para
          seguridad y para evitar abusos. Ver la{" "}
          <Link href='/cookies'>política de cookies</Link>.
        </li>
        <li>
          <strong>Analítica:</strong> medimos visitas y pasos del proceso de
          compra con Umami, sin cookies y sin identificarte.
        </li>
      </ul>

      <h2>3. Los emails que te enviamos</h2>
      <p>
        Si nos dejas tu email, solo te escribimos sobre tu cuento y tu pedido:
      </p>
      <ul>
        <li>La portada y el enlace a tu cuento cuando lo dejas guardado.</li>
        <li>
          Un recordatorio si tu cuento se queda sin terminar, con la garantía
          y, en temporada, la fecha límite para recibirlo en Navidad.
        </li>
        <li>
          Al comprar: la confirmación, el aviso de que lo estamos ilustrando y
          el de que ya está listo.
        </li>
        <li>
          Si compraste solo el PDF, la opción de pasarlo a papel; y unos días
          después, una petición de opinión.
        </li>
        <li>
          En pedidos impresos: la confirmación, el aviso de envío y el
          seguimiento.
        </li>
        <li>Los enlaces de acceso que pidas para recuperar tus cuentos.</li>
      </ul>
      <p>
        No enviamos newsletters ni publicidad de terceros. Si no quieres
        recibir los recordatorios, responde a cualquiera de ellos o escríbenos
        y dejaremos de enviártelos.
      </p>

      <h2>4. Base legal</h2>
      <ul>
        <li>
          <strong>Ejecución del contrato o de medidas precontractuales</strong>{" "}
          (art. 6.1.b RGPD): crear tu cuento, enviarte el borrador que pides,
          cobrar, ilustrar, imprimir y entregar.
        </li>
        <li>
          <strong>Consentimiento</strong> (art. 6.1.a RGPD): la foto opcional,
          que tú decides subir, y el email que nos dejas durante el borrador.
          Puedes retirarlo cuando quieras.
        </li>
        <li>
          <strong>Interés legítimo</strong> (art. 6.1.f RGPD y art. 21.2 LSSI):
          recordatorios sobre tu propio cuento y ofertas de productos
          similares a los que ya compraste, prevención del fraude y mejora del
          servicio. Puedes oponerte en cualquier momento.
        </li>
        <li>
          <strong>Obligación legal</strong> (art. 6.1.c RGPD): conservar las
          facturas y los datos de pago que exige la normativa fiscal.
        </li>
      </ul>

      <h2>5. Con quién compartimos datos</h2>
      <p>
        Solo con los proveedores necesarios para prestar el servicio, con
        contrato de encargo del tratamiento:
      </p>
      <ul>
        <li>
          <strong>Stripe</strong> (pagos y recogida de la dirección de envío).{" "}
          <a href='https://stripe.com/es/privacy' target='_blank' rel='noopener noreferrer'>
            Privacidad de Stripe
          </a>
        </li>
        <li>
          <strong>OpenAI</strong> (generación de textos e ilustraciones y
          descripción de la foto).{" "}
          <a href='https://openai.com/es-ES/policies/privacy-policy/' target='_blank' rel='noopener noreferrer'>
            Privacidad de OpenAI
          </a>
        </li>
        <li>
          <strong>Imprenta colaboradora</strong> (Bubok, en España): recibe el
          PDF del libro y los datos de envío para imprimirlo y entregarlo.
        </li>
        <li>
          <strong>Resend</strong> (envío de emails).
        </li>
        <li>
          <strong>Google</strong> (solo si inicias sesión con Google).
        </li>
        <li>
          <strong>Proveedores de alojamiento</strong> (servidores y
          almacenamiento de los cuentos e ilustraciones).
        </li>
      </ul>
      <p>No vendemos tus datos ni los cedemos para publicidad.</p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos proveedores (OpenAI, Stripe, Resend, Google) pueden tratar
        datos fuera del Espacio Económico Europeo. En todos los casos hay
        garantías adecuadas según el RGPD (Marco de Privacidad de Datos
        UE-EE. UU. o cláusulas contractuales tipo).
      </p>

      <h2>7. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>
          <strong>Foto:</strong> no se guarda; se descarta en cuanto se crea el
          personaje.
        </li>
        <li>
          <strong>Cuentos comprados:</strong> mientras quieras tener acceso a
          ellos o hasta que nos pidas borrarlos.
        </li>
        <li>
          <strong>Borradores sin comprar y email del borrador:</strong> hasta
          que nos pidas borrarlos y, en todo caso, un máximo de 12 meses sin
          actividad.
        </li>
        <li>
          <strong>Datos de pago y de envío:</strong> el tiempo que exige la
          normativa fiscal y mercantil (en general, entre 4 y 6 años).
        </li>
        <li>
          <strong>Registros técnicos:</strong> como máximo 90 días.
        </li>
      </ul>

      <h2>8. Tus derechos</h2>
      <p>
        Puedes pedir acceso a tus datos, su rectificación, su supresión, la
        limitación del tratamiento, la portabilidad u oponerte a él, así como
        retirar tu consentimiento, escribiendo a{" "}
        <a href={`mailto:${owner.email}`}>{owner.email}</a>. Te respondemos en
        un máximo de 30 días. Si no estás conforme, puedes reclamar ante la{" "}
        <a href='https://www.aepd.es' target='_blank' rel='noopener noreferrer'>
          Agencia Española de Protección de Datos
        </a>
        .
      </p>

      <h2>9. Menores</h2>
      <p>
        LibrosIA está dirigido a personas adultas que crean cuentos para niños.
        Los cuentos contienen el nombre de un menor y, si se sube una foto, la
        descripción de su aspecto. Estos datos los facilita y controla su
        madre, padre o tutor, que puede pedir que se borren en cualquier
        momento.
      </p>

      <h2>10. Seguridad</h2>
      <p>
        Usamos conexión cifrada (HTTPS), enlaces privados difíciles de adivinar
        para cada cuento, acceso restringido a los datos y límites contra el
        uso abusivo.
      </p>

      <h2>11. Cambios</h2>
      <p>
        Si cambiamos algo importante de esta política, lo indicaremos en esta
        página y, si tenemos tu email, te lo comunicaremos.
      </p>
    </LegalLayout>
  );
}
