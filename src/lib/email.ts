import { Resend } from "resend";
import { createLogger } from "@/lib/logger";
import { appUrl } from "@/lib/appUrl";
import { bookLink } from "@/lib/bookAccess";
import { GUARANTEE_TEXT, PRINT_ENABLED, PRINT_PRODUCT, formatEuros } from "@/lib/pricing";

export { appUrl };

const log = createLogger("email");

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) resendInstance = new Resend(process.env.RESEND_API_KEY);
  return resendInstance;
}

const FROM =
  process.env.EMAIL_FROM || "LibrosIA <noreply@libros.iconicospace.com>";
const REPLY_TO = "hola@iconicospace.com";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Plantilla mínima compatible con clientes de correo (tablas e inline styles)
function layout(title: string, body: string, cta?: { href: string; label: string }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#c2410c;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:10px;font-weight:bold;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#2b2b2b">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;padding:32px">
<tr><td>
<p style="font-size:20px;font-weight:bold;margin:0 0 20px"><span style="color:#c2410c">Libros</span><span style="color:#6b7280">IA</span></p>
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>
${body}
${button}
<p style="font-size:12px;color:#888;margin-top:32px">LibrosIA · IconicoSpace · ¿Dudas? Responde a este email.</p>
</td></tr></table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    log.warn({ subject }, "RESEND_API_KEY no configurada: email no enviado");
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
    });
    if (error) {
      log.error({ err: error, subject }, "Error enviando email");
      return false;
    }
    return true;
  } catch (err) {
    log.error({ err, subject }, "Error enviando email");
    return false;
  }
}

export async function sendBookReadyEmail(params: {
  to: string;
  kidName: string;
  title: string;
  bookId: string;
}) {
  const { to, kidName, title, bookId } = params;
  return send(
    to,
    `📚 El libro de ${kidName} está listo`,
    layout(
      `«${title}» ya está listo`,
      `<p>Hemos terminado todas las ilustraciones del libro de <strong>${escapeHtml(kidName)}</strong>.</p>
<p>Puedes verlo, retocar páginas y descargar el PDF para leer en pantalla o imprimir.</p>
${PRINT_ENABLED ? "<p>Y si quieres tenerlo en papel, puedes pedirlo impreso con envío a casa.</p>" : "<p>Muy pronto podrás pedirlo también impreso, con envío a casa: te avisaremos.</p>"}`,
      { href: await bookLink(bookId), label: "Ver mi libro" },
    ),
  );
}

export async function sendDraftReminderEmail(params: {
  to: string;
  kidName: string;
  title: string;
  bookId: string;
  coverUrl?: string | null;
}) {
  const { to, kidName, title, bookId, coverUrl } = params;
  const cover = coverUrl
    ? `<p><img src="${coverUrl.startsWith("http") ? coverUrl : appUrl(coverUrl)}" alt="Portada" width="320" style="border-radius:12px;max-width:100%"></p>`
    : "";
  return send(
    to,
    `La historia de ${kidName} te está esperando`,
    layout(
      `«${title}» está a un paso`,
      `<p>Dejaste escrita la historia de <strong>${escapeHtml(kidName)}</strong>. Solo faltan las ilustraciones para convertirla en su libro.</p>
${cover}
<p>Está guardado: entra cuando quieras para ilustrarlo.</p>
<p style="font-size:13px;color:#6B5B4E">${escapeHtml(GUARANTEE_TEXT)}</p>`,
      { href: await bookLink(bookId), label: "Terminar mi libro" },
    ),
  );
}

export async function sendPrintOrderConfirmationEmail(params: {
  to: string;
  kidName: string;
  title: string;
}) {
  const { to, kidName, title } = params;
  return send(
    to,
    `Pedido recibido: el libro impreso de ${kidName}`,
    layout(
      "¡Pedido recibido!",
      `<p>Vamos a imprimir <strong>«${escapeHtml(title)}»</strong> en papel.</p>
<p>Llegará en unos 7-10 días laborables y te enviaremos el enlace de seguimiento en cuanto salga hacia tu casa.</p>`,
    ),
  );
}

export async function sendPrintShippedEmail(params: {
  to: string;
  kidName: string;
  trackingUrl: string;
}) {
  const { to, kidName, trackingUrl } = params;
  return send(
    to,
    `📦 El libro de ${kidName} va de camino`,
    layout(
      "Tu libro ya está en camino",
      `<p>El libro impreso de <strong>${escapeHtml(kidName)}</strong> ha salido de la imprenta.</p>`,
      { href: trackingUrl, label: "Seguir el envío" },
    ),
  );
}

// Aviso interno de pedido impreso para producirlo a mano (fase A)
export async function sendPrintOrderAdminEmail(params: {
  orderId: string;
  title: string;
  shippingName?: string | null;
}) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    log.warn({ orderId: params.orderId }, "ADMIN_EMAIL no configurado");
    return false;
  }
  return send(
    to,
    `🖨️ Nuevo pedido impreso: ${params.title}`,
    layout(
      "Nuevo pedido impreso",
      `<p>Libro: <strong>${escapeHtml(params.title)}</strong><br>Destinatario: ${escapeHtml(params.shippingName || "-")}<br>Pedido: ${params.orderId}</p>
<p>Descarga el interior y la cubierta desde el panel y súbelos a la imprenta.</p>`,
      { href: appUrl("/admin"), label: "Abrir panel" },
    ),
  );
}

/**
 * Aviso interno cuando algo falla con un libro pagado (páginas sin ilustrar,
 * generación caída, proveedor sin saldo): para reaccionar antes que el cliente.
 */
export async function sendAdminAlert(params: { subject: string; bookId: string; details: string[] }) {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    log.warn({ bookId: params.bookId }, "ADMIN_EMAIL no configurado");
    return false;
  }
  return send(
    to,
    `⚠️ ${params.subject}`,
    layout(
      params.subject,
      `<p>Libro: ${escapeHtml(params.bookId)}</p><ul>${params.details
        .map((d) => `<li>${escapeHtml(d)}</li>`)
        .join("")}</ul>
<p>Revisa los saldos de Gemini y Anthropic y los logs del contenedor. El cliente puede terminarlo gratis con «Terminar las ilustraciones».</p>`,
      { href: appUrl("/admin"), label: "Abrir panel" },
    ),
  );
}

/** Al dejar el email en el borrador: su portada de muestra y el enlace */
export async function sendLeadPreviewEmail(params: {
  to: string;
  kidName: string;
  title: string;
  bookId: string;
  coverUrl: string;
}) {
  const { to, kidName, title, bookId, coverUrl } = params;
  const cover = coverUrl.startsWith("http") ? coverUrl : appUrl(coverUrl);
  return send(
    to,
    `La portada del cuento de ${kidName}`,
    layout(
      `«${title}»`,
      `<p>Aquí tienes la portada de muestra del cuento de <strong>${escapeHtml(kidName)}</strong> y su historia guardada.</p>
<p><img src="${cover}" alt="Portada de muestra" width="320" style="border-radius:12px;max-width:100%"></p>
<p>Cuando quieras, entra y lo ilustramos entero en unos minutos.</p>`,
      { href: await bookLink(bookId), label: "Ver su cuento" },
    ),
  );
}

/** Justo después de pagar: el libro se está ilustrando (enlace privado) */
export async function sendIllustratingEmail(params: {
  to: string;
  kidName: string;
  title: string;
  bookId: string;
  withPrint: boolean;
}) {
  const { to, kidName, title, bookId, withPrint } = params;
  return send(
    to,
    `🎨 Estamos ilustrando el cuento de ${kidName}`,
    layout(
      "¡Gracias! Ya lo estamos ilustrando",
      `<p>Las ilustraciones de <strong>«${escapeHtml(title)}»</strong> estarán listas en unos minutos. Puedes cerrar la página: con este enlace vuelves a tu cuento desde cualquier dispositivo, sin cuenta.</p>
${withPrint ? `<p><strong>Tu libro impreso:</strong> cuando esté ilustrado, revísalo y pulsa «Aprobar para imprimir». Lo mandamos a imprenta entonces y llega en ${PRINT_PRODUCT.deliveryDays.min}-${PRINT_PRODUCT.deliveryDays.max} días laborables.</p>` : ""}
<p style="font-size:13px;color:#6B5B4E">${escapeHtml(GUARANTEE_TEXT)}</p>`,
      { href: await bookLink(bookId), label: "Abrir mi cuento" },
    ),
  );
}

/** Día siguiente a comprar el digital: oferta para tenerlo en papel */
export async function sendPrintOfferEmail(params: {
  to: string;
  kidName: string;
  title: string;
  bookId: string;
}) {
  const { to, kidName, title, bookId } = params;
  return send(
    to,
    `¿Y si el cuento de ${kidName} lo tiene en papel?`,
    layout(
      `«${title}», en sus manos`,
      `<p>Muchas familias acaban pidiendo el cuento impreso: es el que se lee cada noche y el que se guarda.</p>
<p>Pásalo a papel por <strong>${formatEuros(PRINT_PRODUCT.price)}</strong> (21×21 cm, envío a casa incluido). Llega en ${PRINT_PRODUCT.deliveryDays.min}-${PRINT_PRODUCT.deliveryDays.max} días laborables.</p>`,
      { href: await bookLink(bookId), label: "Pedirlo impreso" },
    ),
  );
}

/** Unos días después: pedir opinión (sin incentivos para no sesgar reseñas) */
export async function sendReviewRequestEmail(params: {
  to: string;
  kidName: string;
}) {
  const { to, kidName } = params;
  return send(
    to,
    `¿Qué le ha parecido a ${kidName} su cuento?`,
    layout(
      "Nos encantaría saberlo",
      `<p>Somos un proyecto pequeño, desde Málaga. Responde a este email con lo que te ha gustado y lo que mejorarías: lo leemos todo.</p>
<p>Si te apetece, mándanos una foto leyendo el cuento (solo la publicaremos si nos das permiso).</p>`,
    ),
  );
}

/** Recuperar cuentos sin cuenta: lista de enlaces privados */
export async function sendRecoverEmail(params: {
  to: string;
  books: { id: string; title: string }[];
}) {
  const { to, books } = params;
  const items = (
    await Promise.all(
      books.map(async (b) => `<li style="margin:8px 0"><a href="${await bookLink(b.id)}" style="color:#C2410C">${escapeHtml(b.title)}</a></li>`),
    )
  ).join("");
  return send(
    to,
    "Tus cuentos de LibrosIA",
    layout(
      "Aquí tienes tus cuentos",
      books.length
        ? `<p>Pulsa en cualquiera para abrirlo en este dispositivo:</p><ul>${items}</ul>`
        : `<p>No hemos encontrado cuentos con este email. Si pagaste con otro correo, prueba con ese.</p>`,
      { href: appUrl("/editor"), label: "Crear otro cuento" },
    ),
  );
}
