import { createHmac, timingSafeEqual } from "crypto";
import * as fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import prisma from "@/lib/prisma";
import { appUrl } from "@/lib/appUrl";
import { getOrBuildPdf } from "@/lib/pdf";
import { toPdfBook } from "@/lib/pdfData";
import {
  bubokCreateOrder,
  bubokOrderStatus,
  bubokTrackingNumber,
  isBubokEnabled,
  isBubokLive,
  seurTrackingUrl,
  type BubokBuyer,
} from "@/lib/bubok";
import { sendAdminAlert, sendPrintShippedEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("print-fulfillment");

// ============================================
// Pedidos impresos: del pedido pagado y aprobado a la imprenta (Bubok) y del
// envío al seguimiento del cliente. Bubok descarga los PDF desde URLs
// públicas y directas: se firman por pedido para que nadie más pueda bajarlos.
// ============================================

export type PrintPart = "interior" | "cubierta";

const FILES_SECRET =
  process.env.PRINT_FILES_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "";

function sign(orderId: string): string {
  return createHmac("sha256", FILES_SECRET).update(`print:${orderId}`).digest("hex").slice(0, 40);
}

export function printFileUrl(orderId: string, part: PrintPart): string {
  return appUrl(`/api/imprenta/${orderId}/${sign(orderId)}/${part}.pdf`);
}

export function verifyPrintFileSignature(orderId: string, signature: string): boolean {
  if (!FILES_SECRET) return false;
  const expected = Buffer.from(sign(orderId));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** PDF de imprenta de un pedido (lo genera y lo deja en caché) */
export async function printFilePath(bookId: string, part: PrintPart): Promise<string> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!book) throw new Error("Libro no encontrado");
  return getOrBuildPdf(toPdfBook(book), part === "cubierta" ? "print-cover" : "print-interior");
}

async function countPages(path: string): Promise<number> {
  const doc = await PDFDocument.load(await fs.readFile(path), { updateMetadata: false });
  return doc.getPageCount();
}

/** Identificador del pedido en Bubok. Las pruebas llevan otro prefijo: un
 * identificador no se puede repetir y las pruebas también quedan registradas. */
function bubokId(orderId: string): string {
  return `${isBubokLive() ? "LIBROSIA" : "LIBROSIA-TEST"}-${orderId}`;
}

const ISO3: Record<string, string> = { ES: "ESP" };

function splitName(full: string): { nombre: string; apellidos: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { nombre: parts[0], apellidos: "-" };
  return { nombre: parts[0], apellidos: parts.slice(1).join(" ") };
}

/**
 * Envía a Bubok un pedido pagado y aprobado (estado PAID). Idempotente: si
 * ya tiene pedido en Bubok no hace nada. Si Bubok lo rechaza, el pedido queda
 * en PAID con el motivo en `notes` y se avisa al administrador.
 */
export async function submitPrintOrder(orderId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isBubokEnabled()) {
    log.info({ orderId }, "Bubok sin configurar: el pedido se gestiona a mano");
    return { ok: false, error: "Bubok sin configurar" };
  }

  const order = await prisma.printOrder.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PAID" || order.providerOrderId) {
    return { ok: false, error: "El pedido no está listo para imprenta o ya se envió" };
  }

  const address = (order.shippingAddress ?? {}) as Record<string, string | null | undefined>;
  const pais = ISO3[(address.country ?? "").toUpperCase()];
  const missing = [
    !order.shippingName && "nombre",
    !order.shippingPhone && "teléfono",
    !order.email && "email",
    !address.line1 && "dirección",
    !address.city && "localidad",
    !address.postal_code && "código postal",
    !pais && "país (solo España)",
  ].filter(Boolean);
  if (missing.length) {
    return fail(order.id, order.bookId, `Faltan datos de envío: ${missing.join(", ")}`);
  }

  const identificador = bubokId(order.id);
  // Reservar el envío para que dos llamadas a la vez no creen dos pedidos
  const claimed = await prisma.printOrder.updateMany({
    where: { id: order.id, status: "PAID", providerOrderId: null },
    data: { provider: "bubok", providerOrderId: identificador },
  });
  if (claimed.count === 0) return { ok: false, error: "Ya se está enviando" };

  try {
    // Los PDF se generan antes de avisar a Bubok: así la descarga es inmediata
    const [interiorPath] = await Promise.all([
      printFilePath(order.bookId, "interior"),
      printFilePath(order.bookId, "cubierta"),
    ]);
    const { nombre, apellidos } = splitName(order.shippingName!);
    const buyer: BubokBuyer = {
      nombre,
      apellidos,
      telefono: order.shippingPhone!,
      email: order.email!,
      direccion: [address.line1, address.line2].filter(Boolean).join(", "),
      localidad: address.city!,
      codigoPostal: address.postal_code!,
      pais: pais!,
    };
    const error = await bubokCreateOrder({
      identificador,
      buyer,
      quantity: order.quantity,
      pages: await countPages(interiorPath),
      interiorUrl: printFileUrl(order.id, "interior"),
      coverUrl: printFileUrl(order.id, "cubierta"),
    });
    if (error) {
      await prisma.printOrder.update({
        where: { id: order.id },
        data: { provider: null, providerOrderId: null },
      });
      return fail(order.id, order.bookId, `Bubok rechazó el pedido: ${error}`);
    }

    await prisma.printOrder.update({
      where: { id: order.id },
      data: {
        status: "IN_PRODUCTION",
        notes: isBubokLive() ? "Enviado a Bubok" : "Enviado a Bubok en MODO PRUEBA (no se imprime)",
      },
    });
    log.info({ orderId: order.id, identificador, live: isBubokLive() }, "Pedido enviado a Bubok");
    return { ok: true };
  } catch (error) {
    await prisma.printOrder.update({
      where: { id: order.id },
      data: { provider: null, providerOrderId: null },
    });
    return fail(order.id, order.bookId, error instanceof Error ? error.message : String(error));
  }
}

async function fail(orderId: string, bookId: string, reason: string) {
  log.error({ orderId, reason }, "No se pudo enviar el pedido a la imprenta");
  await prisma.printOrder.update({ where: { id: orderId }, data: { notes: reason } }).catch(() => undefined);
  await sendAdminAlert({
    subject: "Un pedido impreso no se ha podido enviar a Bubok",
    bookId,
    details: [`Pedido: ${orderId}`, reason, "Sigue pagado: corrígelo y reenvíalo desde el panel."],
  }).catch(() => undefined);
  return { ok: false, error: reason };
}

/**
 * Consulta en Bubok los pedidos en producción (lo llama el cron): al salir de
 * imprenta guarda el seguimiento de Seur y avisa al cliente; una incidencia o
 * una cancelación avisan al administrador. Los pedidos de prueba no se
 * consultan (Bubok los marca como cancelados).
 */
export async function syncPrintOrders(): Promise<{ checked: number; shipped: number; issues: number }> {
  if (!isBubokEnabled()) return { checked: 0, shipped: 0, issues: 0 };
  const orders = await prisma.printOrder.findMany({
    where: {
      status: "IN_PRODUCTION",
      provider: "bubok",
      providerOrderId: { startsWith: "LIBROSIA-", not: { startsWith: "LIBROSIA-TEST-" } },
    },
    include: { book: { select: { kidName: true } } },
    take: 100,
  });

  let shipped = 0;
  let issues = 0;
  for (const order of orders) {
    try {
      const status = await bubokOrderStatus(order.providerOrderId!);
      if (status.codigo === "06") {
        const tracking = await bubokTrackingNumber(order.providerOrderId!);
        if (!tracking) continue; // enviado, pero el número de Seur aún no está
        const trackingUrl = seurTrackingUrl(tracking.codigo);
        await prisma.printOrder.update({
          where: { id: order.id },
          data: { status: "SHIPPED", trackingUrl, notes: `${tracking.mensajeria} ${tracking.codigo}`.trim() },
        });
        if (order.email) {
          await sendPrintShippedEmail({ to: order.email, kidName: order.book.kidName, trackingUrl });
        }
        shipped++;
      } else if (["01", "02", "05"].includes(status.codigo)) {
        const note = `Bubok ${status.codigo}: ${status.mensaje}`;
        if (order.notes === note) continue; // ya avisado
        issues++;
        await prisma.printOrder.update({
          where: { id: order.id },
          data: { notes: note, ...(status.codigo === "02" && { status: "CANCELED" }) },
        });
        await sendAdminAlert({
          subject: `Pedido impreso con incidencia en Bubok (${status.codigo})`,
          bookId: order.bookId,
          details: [`Pedido: ${order.id} (${order.providerOrderId})`, status.mensaje],
        }).catch(() => undefined);
      }
    } catch (error) {
      log.error({ err: error, orderId: order.id }, "Error consultando el pedido en Bubok");
    }
  }
  if (orders.length) log.info({ checked: orders.length, shipped, issues }, "Pedidos impresos consultados");
  return { checked: orders.length, shipped, issues };
}
