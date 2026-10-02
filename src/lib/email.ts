import { Resend } from "resend";
import { createLogger } from "@/lib/logger";

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

export function appUrl(path = ""): string {
  const base =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://libros.iconicospace.com";
  return `${base.replace(/\/$/, "")}${path}`;
}

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
<p>Y si quieres tenerlo en papel, puedes pedirlo impreso en tapa dura con envío a casa.</p>`,
      { href: appUrl(`/editor?bookId=${bookId}`), label: "Ver mi libro" },
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
<p>Tu borrador está guardado: entra y desbloquéalo cuando quieras.</p>`,
      { href: appUrl(`/editor?bookId=${bookId}`), label: "Terminar mi libro" },
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
      `<p>Vamos a imprimir <strong>«${escapeHtml(title)}»</strong> en tapa dura.</p>
<p>Lo preparamos en 2-4 días laborables y te enviaremos el enlace de seguimiento en cuanto salga hacia tu casa.</p>`,
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
