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
      updated='4 de octubre de 2026'
      intro={
        <>
          <p className='font-bold mb-2'>En pocas palabras</p>
          <ul className='list-disc pl-5 space-y-1.5'>
            <li>
              La <strong>foto</strong> del niño es opcional, solo sirve para
              describir y dibujar sus rasgos y <strong>no se guarda</strong>.
            </li>
            <li>
              Para escribir y dibujar el cuento usamos servicios de IA de{" "}
              <strong>Anthropic</strong> (Claude) y <strong>Google</strong>{" "}
              (Gemini), y <strong>OpenAI</strong> para revisar que el texto que
              escribes sea apropiado.
            </li>
            <li>
              Tu <strong>email</strong> lo usamos para enviarte tu cuento y los
              avisos sobre él. No lo vendemos ni lo cedemos.
            </li>
            <li>
              De momento solo vendemos el cuento en PDF. Cuando el libro impreso
              esté disponible, tu <strong>dirección</strong> solo la recibirá la
              imprenta que lo envíe.
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
          generamos. Sirven para crear el cuento. El texto lo escribe y revisa
          Claude (Anthropic) y las ilustraciones las dibuja Gemini (Google).
          El nombre, el tema, la dedicatoria y las instrucciones que escribas
          para rehacer un dibujo pasan antes por el filtro de moderación de
          OpenAI, para evitar contenido inadecuado para niños.
        </li>
        <li>
          <strong>Foto del protagonista (opcional):</strong> si la subes, se
          envía a Anthropic (Claude), que describe sus rasgos visibles (pelo,
          ojos, tono de piel, gafas…), y a Google (Gemini), que dibuja a partir
          de ella la hoja del personaje ilustrado. Ambos actúan como encargados
          del tratamiento. La foto solo se usa para describir y dibujar sus
          rasgos, nunca para identificar a nadie, y{" "}
          <strong>no se guarda</strong> en nuestros servidores: se procesa en
          memoria mientras se crea el personaje y se descarta. Conservamos la
          descripción en texto y la ilustración del personaje dentro de tu
          cuento. Solo puede subirla quien tenga la patria potestad o la tutela
          del menor, o una persona adulta con el permiso de quien la tenga (ver
          el apartado 9).
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
          dirección y teléfono de contacto, que recogeremos a través de Stripe
          para entregar el libro. Ahora mismo solo vendemos el PDF, así que no
          los pedimos; los pediremos cuando el libro impreso esté disponible.
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
          compra con Umami, sin cookies y sin identificarte (solo vemos datos
          agregados).
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
          Unos días después de la compra, una petición de opinión y, cuando el
          libro impreso esté disponible, la opción de pasar tu PDF a papel.
        </li>
        <li>
          En pedidos impresos (cuando estén disponibles): la confirmación, el
          aviso de envío y el seguimiento.
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
          cobrar, ilustrar y entregarte el cuento (y, en pedidos impresos,
          imprimirlo y enviarlo).
        </li>
        <li>
          <strong>Consentimiento</strong> (art. 6.1.a RGPD): la foto opcional,
          que tú decides subir, y el email que nos dejas durante el borrador.
          Puedes retirarlo cuando quieras.
        </li>
        <li>
          <strong>Interés legítimo</strong> (art. 6.1.f RGPD y art. 21.2 LSSI):
          recordatorios sobre tu propio cuento y ofertas de productos
          similares a los que ya compraste, moderación del contenido para que
          sea apropiado para niños, prevención del fraude y mejora del
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
          <strong>Stripe</strong> (pagos y, en pedidos impresos, recogida de la
          dirección de envío).{" "}
          <a href='https://stripe.com/es/privacy' target='_blank' rel='noopener noreferrer'>
            Privacidad de Stripe
          </a>
        </li>
        <li>
          <strong>Anthropic</strong> (Anthropic, PBC, EE. UU.; servicio Claude):
          escribe y revisa el texto del cuento, comprueba la calidad de cada
          ilustración y, si subes una foto, describe sus rasgos.{" "}
          <a href='https://www.anthropic.com/legal/privacy' target='_blank' rel='noopener noreferrer'>
            Privacidad de Anthropic
          </a>
        </li>
        <li>
          <strong>Google</strong> (Google LLC y Google Ireland Limited; Gemini
          API): dibuja las ilustraciones y, si subes una foto, la hoja del
          personaje a partir de ella. También gestiona el inicio de sesión, solo
          si eliges entrar con Google.{" "}
          <a href='https://policies.google.com/privacy?hl=es' target='_blank' rel='noopener noreferrer'>
            Privacidad de Google
          </a>
        </li>
        <li>
          <strong>OpenAI</strong> (EE. UU.): moderación del texto que escribes
          (nombre, tema, dedicatoria e instrucciones para rehacer dibujos) y
          proveedor de respaldo para el texto, la descripción de la foto y las
          ilustraciones.{" "}
          <a href='https://openai.com/es-ES/policies/privacy-policy/' target='_blank' rel='noopener noreferrer'>
            Privacidad de OpenAI
          </a>
        </li>
        <li>
          <strong>Imprenta colaboradora</strong> (Bubok, en España): cuando el
          libro impreso esté disponible, recibirá el PDF del libro y los datos
          de envío para imprimirlo y entregarlo.
        </li>
        <li>
          <strong>Resend</strong> (envío de emails).
        </li>
        <li>
          <strong>Umami</strong> (analítica sin cookies, con datos agregados).
        </li>
        <li>
          <strong>Amazon Web Services</strong> (alojamiento: servidores en
          Londres, Reino Unido, donde se guardan los cuentos y sus
          ilustraciones).
        </li>
      </ul>
      <p>
        Según sus condiciones para clientes de API, Anthropic, Google y OpenAI
        no usan los datos que les enviamos a través de su API para entrenar sus
        modelos. Según esas mismas condiciones, pueden conservarlos durante un
        tiempo limitado para prevenir abusos.
      </p>
      <p>No vendemos tus datos ni los cedemos para publicidad.</p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos proveedores (Anthropic, Google, OpenAI, Stripe y Resend) son
        empresas de Estados Unidos o pueden tratar datos fuera del Espacio
        Económico Europeo. Esas transferencias se hacen con las garantías
        previstas en el RGPD, como el Marco de Privacidad de Datos UE-EE. UU.
        o cláusulas contractuales tipo aprobadas por la Comisión Europea.
      </p>
      <p>
        Los servidores de la web están en Londres (Reino Unido), país que
        cuenta con una decisión de adecuación de la Comisión Europea.
      </p>

      <h2>7. Cuánto tiempo los guardamos</h2>
      <ul>
        <li>
          <strong>Foto:</strong> no la guardamos; se procesa en memoria y se
          descarta en cuanto se describen sus rasgos y se dibuja el personaje.
        </li>
        <li>
          <strong>Cuentos comprados:</strong> mientras quieras tener acceso a
          ellos o hasta que nos pidas borrarlos.
        </li>
        <li>
          <strong>Borradores sin comprar</strong> (con sus ilustraciones y el
          email que nos dejaste en el borrador): se borran automáticamente
          cuando pasan 12 meses sin actividad, o antes si nos lo pides.
        </li>
        <li>
          <strong>Email de tu cuenta y de tus compras:</strong> mientras tengas
          cuentos con nosotros o hasta que nos pidas borrarlo, salvo lo que
          debamos conservar por obligación legal.
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
        LibrosIA está dirigido a personas adultas (madres, padres y otros
        familiares) que crean cuentos para niños; no está pensado para que lo
        usen los propios niños. Los cuentos contienen el nombre de un menor y,
        si se sube una foto, la descripción de su aspecto y un personaje
        dibujado a partir de ella.
      </p>
      <ul>
        <li>
          La foto es <strong>opcional</strong>: puedes crear el cuento sin ella.
        </li>
        <li>
          Quien la sube confirma que tiene la patria potestad o la tutela del
          menor, o el permiso de quien la tiene.
        </li>
        <li>
          Solo se usa para describir sus rasgos físicos y dibujar el personaje.
          No se usa para identificar a nadie y no se guarda.
        </li>
        <li>
          Quien tenga la patria potestad o la tutela puede pedirnos en
          cualquier momento que borremos el cuento y los datos del menor.
        </li>
      </ul>

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
