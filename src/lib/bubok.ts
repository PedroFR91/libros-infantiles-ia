import { createLogger } from "@/lib/logger";

const log = createLogger("bubok");

// ============================================
// Webservice SOAP de Bubok (impresión bajo demanda y envío)
// Guía: "Guía de Integración Webservice Bubok" v2.3. SOAP 1.1 RPC/encoded,
// credenciales Cliente + Token en todos los métodos. El servidor trabaja en
// ISO-8859-1: se envía y se lee en Latin-1 (con UTF-8 rompe "Rústica").
// ============================================

const ENDPOINT = "https://www.bubok.es/resellers/externWs";

export function isBubokEnabled(): boolean {
  return Boolean(process.env.BUBOK_CLIENT && process.env.BUBOK_TOKEN);
}

/**
 * Pedidos reales SOLO con BUBOK_LIVE=true. Sin eso se envía Prueba=1: Bubok
 * valida el pedido igual que uno real pero no lo imprime ni lo cobra.
 */
export function isBubokLive(): boolean {
  return process.env.BUBOK_LIVE === "true";
}

/**
 * Configuración del libro. Probado con Prueba=1 (oct. 2026): 190x190 + rústica
 * + tapa blanda solo tiene tarifa con papel de 90 u 80 g (120 g no).
 */
export const BUBOK_BOOK = {
  tamano: process.env.BUBOK_TAMANO || "190x190",
  maquetacion: process.env.BUBOK_MAQUETACION || "rustica",
  gramaje: parseInt(process.env.BUBOK_GRAMAJE || "90", 10),
  tipoPortada: "TAPABLANDA",
  plastificado: process.env.BUBOK_PLASTIFICADO || "brillo",
};

export interface BubokBuyer {
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  direccion: string;
  localidad: string;
  codigoPostal: string;
  /** ISO de 3 letras */
  pais: string;
  observaciones?: string;
}

export interface BubokStatus {
  /** 01 no existe · 02 cancelado · 03 pendiente de imprenta · 04 en imprenta · 05 incidencia · 06 enviado */
  codigo: string;
  mensaje: string;
  fechaRecepcion?: string;
  fechaEnvioImprenta?: string;
  fechaEnvioCliente?: string;
}

// ── SOAP ──────────────────────────────────────────────────────────────

const ENVELOPE_NS =
  'xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" ' +
  'xmlns:xsd="http://www.w3.org/2001/XMLSchema" ' +
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
  'xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" ' +
  'xmlns:ns1="urn:webservice"';

/** Solo caracteres representables en Latin-1 (fuera emojis y similares) */
function latin1Safe(value: string): string {
  return value.normalize("NFC").replace(/[^\u0000-ÿ]/g, "");
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function field(name: string, value: string | number, type = "xsd:string"): string {
  return `<${name} xsi:type="${type}">${escapeXml(latin1Safe(String(value)))}</${name}>`;
}

function credentials(): string {
  return field("cliente", process.env.BUBOK_CLIENT ?? "") + field("token", process.env.BUBOK_TOKEN ?? "");
}

async function soapCall(method: string, inner: string): Promise<string> {
  const envelope =
    `<?xml version="1.0" encoding="ISO-8859-1"?><SOAP-ENV:Envelope ${ENVELOPE_NS} ` +
    `SOAP-ENV:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><SOAP-ENV:Body>` +
    `<ns1:${method}>${inner}</ns1:${method}></SOAP-ENV:Body></SOAP-ENV:Envelope>`;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=ISO-8859-1",
      SOAPAction: `"urn:webservice#${method}"`,
    },
    body: Buffer.from(envelope, "latin1"),
    signal: AbortSignal.timeout(60_000),
  });
  const xml = Buffer.from(await response.arrayBuffer()).toString("latin1");
  const fault = xml.match(/<faultstring[^>]*>([\s\S]*?)<\/faultstring>/);
  if (fault) throw new Error(`Bubok ${method}: ${unescapeXml(fault[1])}`);
  const result = xml.match(/<return[^>]*>([\s\S]*?)<\/return>/);
  if (!result) throw new Error(`Bubok ${method}: respuesta inesperada (HTTP ${response.status})`);
  return result[1];
}

/** Campos de una estructura de respuesta (Tracking) */
function structFields(inner: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const [, name, value] of inner.matchAll(/<(\w+)[^>]*>([^<]*)<\/\1>/g)) {
    fields[name] = unescapeXml(value);
  }
  return fields;
}

// ── Métodos ───────────────────────────────────────────────────────────

/** Portes en euros (importe de Bubok), null si no hay cobertura */
export async function bubokShippingCost(pesoGramos: number, codigoPostal: string, pais = "ESP"): Promise<number | null> {
  const raw = await soapCall(
    "gastoEnvio",
    field("peso", Math.round(pesoGramos), "xsd:int") + field("pais", pais) + field("postal", codigoPostal) + credentials(),
  );
  const value = parseFloat(unescapeXml(raw));
  if (value === -999) throw new Error("Bubok gastoEnvio: credenciales no válidas");
  return value > 0 ? value : null;
}

/** Crea el pedido. Devuelve null si Bubok lo acepta, o el mensaje de error */
export async function bubokCreateOrder(params: {
  identificador: string;
  buyer: BubokBuyer;
  quantity: number;
  pages: number;
  interiorUrl: string;
  coverUrl: string;
}): Promise<string | null> {
  const b = params.buyer;
  const comprador = [
    field("Nombre", b.nombre),
    field("Apellidos", b.apellidos),
    field("Telefono", b.telefono),
    field("Email", b.email),
    field("Direccion", b.direccion),
    field("Pais", b.pais),
    field("Localidad", b.localidad),
    field("CodigoPostal", b.codigoPostal),
    field("TipoMensajeria", "STANDARD"),
    field("ObsMensajeria", b.observaciones ?? ""),
  ].join("");
  const libro = [
    field("Cantidad", params.quantity, "xsd:int"),
    field("Tamano", BUBOK_BOOK.tamano),
    field("Paginas", String(params.pages)),
    field("Maquetacion", BUBOK_BOOK.maquetacion),
    field("Gramaje", BUBOK_BOOK.gramaje, "xsd:int"),
    field("TipoPortada", BUBOK_BOOK.tipoPortada),
    field("PlastificadoPortada", BUBOK_BOOK.plastificado),
    field("UrlTripa", params.interiorUrl),
    field("UrlPortada", params.coverUrl),
  ].join("");
  const datos =
    '<datos xsi:type="ns1:Compra">' +
    field("Prueba", isBubokLive() ? "0" : "1") +
    field("Cliente", process.env.BUBOK_CLIENT ?? "") +
    field("Token", process.env.BUBOK_TOKEN ?? "") +
    field("IdentificadorPedido", params.identificador) +
    `<Comprador xsi:type="ns1:Comprador">${comprador}</Comprador>` +
    `<Libro xsi:type="ns1:Pedido">${libro}</Libro></datos>`;

  const result = unescapeXml(await soapCall("hacerPedido", datos)).trim();
  log.info({ identificador: params.identificador, live: isBubokLive(), result }, "Bubok hacerPedido");
  return result === "OK" ? null : result;
}

export async function bubokOrderStatus(identificador: string): Promise<BubokStatus> {
  const f = structFields(await soapCall("trackingPedido", field("identificador_pedido", identificador) + credentials()));
  return {
    codigo: f.Codigo ?? "",
    mensaje: f.Mensaje ?? "",
    fechaRecepcion: f.FechaRecepcion,
    fechaEnvioImprenta: f.FechaEnvioImprenta,
    fechaEnvioCliente: f.FechaEnvioCliente,
  };
}

/** Número de seguimiento de la mensajería (Seur), o null si aún no lo hay */
export async function bubokTrackingNumber(identificador: string): Promise<{ codigo: string; mensajeria: string } | null> {
  const f = structFields(await soapCall("getTrackingNumber", field("identificador_pedido", identificador) + credentials()));
  if (!f.Codigo || f.Codigo === "ERROR") return null;
  return { codigo: f.Codigo, mensajeria: f.Mensaje ?? "" };
}

export function seurTrackingUrl(codigo: string): string {
  return `https://www.seur.com/livetracking/?segEnvNum=${encodeURIComponent(codigo)}`;
}

/** true si se canceló (solo es posible antes de entrar en imprenta) */
export async function bubokCancelOrder(identificador: string): Promise<boolean> {
  const result = unescapeXml(await soapCall("cancelarPedido", field("identificador_pedido", identificador) + credentials()));
  return result.trim() === "OK";
}
