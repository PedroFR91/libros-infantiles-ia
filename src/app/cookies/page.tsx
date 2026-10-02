import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";
import { CONTACT_EMAIL } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "LibrosIA solo usa cookies técnicas necesarias para que la web funcione. La analítica (Umami) no usa cookies. Por eso no hay banner de cookies.",
};

const COOKIES: { name: string; owner: string; purpose: string; duration: string }[] = [
  {
    name: "sessionId",
    owner: "LibrosIA",
    purpose:
      "Recordar qué cuentos has creado en este navegador sin que tengas que crear una cuenta.",
    duration: "1 año",
  },
  {
    name: "authjs.session-token",
    owner: "LibrosIA",
    purpose: "Mantener tu sesión abierta, solo si inicias sesión con una cuenta.",
    duration: "30 días",
  },
  {
    name: "authjs.csrf-token",
    owner: "LibrosIA",
    purpose: "Seguridad: evitar envíos de formularios falsificados al iniciar sesión.",
    duration: "Sesión",
  },
  {
    name: "authjs.callback-url",
    owner: "LibrosIA",
    purpose: "Volver a la página en la que estabas después de iniciar sesión.",
    duration: "Sesión",
  },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title='Política de cookies'
      updated='2 de octubre de 2026'
      intro={
        <p>
          <strong>Solo usamos cookies técnicas</strong>, las imprescindibles para
          que la web funcione. No usamos cookies de publicidad, de redes
          sociales ni de analítica. Por eso no te mostramos un banner de
          cookies: la ley no exige pedir consentimiento para estas cookies
          (art. 22.2 de la Ley 34/2002, LSSI).
        </p>
      }>
      <h2>1. Qué son las cookies</h2>
      <p>
        Son pequeños archivos que una web guarda en tu navegador para recordar
        información entre una visita y otra, por ejemplo, que has iniciado
        sesión.
      </p>

      <h2>2. Cookies que usamos</h2>
      <p>
        Todas son <strong>técnicas y necesarias</strong>: sin ellas no
        podríamos guardarte el cuento ni mantener tu sesión. En producción,
        las de sesión pueden llevar delante el prefijo de seguridad{" "}
        <code>__Secure-</code> o <code>__Host-</code>.
      </p>
      <div className='overflow-x-auto mb-4 rounded-xl border border-border'>
        <table>
          <thead>
            <tr>
              <th>Cookie</th>
              <th>De quién</th>
              <th>Para qué</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {COOKIES.map((c) => (
              <tr key={c.name}>
                <td>
                  <code>{c.name}</code>
                </td>
                <td>{c.owner}</td>
                <td>{c.purpose}</td>
                <td>{c.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>3. El pago, en la página de Stripe</h2>
      <p>
        El pago se hace en la página segura de Stripe (checkout.stripe.com),
        que es un sitio distinto. Allí Stripe usa sus propias cookies técnicas
        para procesar el pago y prevenir el fraude, según su{" "}
        <a href='https://stripe.com/es/legal/cookies-policy' target='_blank' rel='noopener noreferrer'>
          política de cookies
        </a>
        .
      </p>

      <h2>4. Analítica sin cookies</h2>
      <p>
        Para saber cuántas personas visitan la web y en qué paso del proceso
        se quedan usamos <strong>Umami</strong>, una herramienta de analítica
        que <strong>no usa cookies</strong>, no guarda tu dirección IP
        y no te identifica ni te sigue por otras webs. Solo vemos datos
        agregados.
      </p>

      <h2>5. Cómo borrar o bloquear las cookies</h2>
      <p>
        Puedes borrar o bloquear las cookies desde la configuración de tu
        navegador. Si bloqueas las técnicas, puede que la web no recuerde tus
        cuentos en este navegador; siempre podrás recuperarlos desde{" "}
        <Link href='/mis-libros'>Mis cuentos</Link> con tu email.
      </p>
      <ul>
        <li>
          <a href='https://support.google.com/chrome/answer/95647' target='_blank' rel='noopener noreferrer'>
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href='https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias'
            target='_blank'
            rel='noopener noreferrer'>
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a href='https://support.apple.com/es-es/guide/safari/sfri11471/mac' target='_blank' rel='noopener noreferrer'>
            Safari (Mac)
          </a>{" "}
          y{" "}
          <a href='https://support.apple.com/es-es/105082' target='_blank' rel='noopener noreferrer'>
            Safari (iPhone y iPad)
          </a>
        </li>
        <li>
          <a
            href='https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09'
            target='_blank'
            rel='noopener noreferrer'>
            Microsoft Edge
          </a>
        </li>
      </ul>

      <h2>6. Cambios y contacto</h2>
      <p>
        Si algún día añadimos cookies que no sean técnicas, actualizaremos esta
        página y te pediremos permiso antes de usarlas. Para cualquier duda,
        escríbenos a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> o
        consulta la <Link href='/privacidad'>política de privacidad</Link>.
      </p>
    </LegalLayout>
  );
}
