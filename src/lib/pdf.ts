import { PDFDocument, rgb, degrees, PDFFont, PDFPage, PDFImage, RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { createHash } from "crypto";
import { loadStoredImage, upscaleForPrint } from "@/lib/imageTools";
import { createLogger } from "@/lib/logger";

const log = createLogger("pdf");

// ============================================
// Tipos
// ============================================

type TextPosition =
  | "bottom"
  | "top"
  | "center"
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";
type TextBackground = "none" | "gradient" | "bubble" | "box" | "banner";

export interface PdfPage {
  pageNumber: number;
  text: string;
  imageUrl?: string | null;
  textPosition?: string | null;
  textBackground?: string | null;
  textStyle?: string | null;
  textColor?: string | null;
}

export interface PdfBook {
  id: string;
  title: string;
  kidName: string;
  dedication?: string | null;
  characterImageUrl?: string | null;
  characterPersonality?: string | null;
  summary?: string | null;
  createdAt: Date;
  pages: PdfPage[]; // la página 1 es la portada
}

/**
 * - digital: para leer en pantalla (texto sobre la ilustración, como el editor)
 * - home: para imprimir en casa (texto e ilustración en páginas enfrentadas)
 * - print-interior / print-cover: archivos para la imprenta (sangrado, 300 ppp)
 */
export type PdfKind = "digital" | "home" | "print-interior" | "print-cover";

// ============================================
// Geometría (puntos PDF: 72 por pulgada)
// ============================================

const MM = 72 / 25.4;
const TRIM = 8 * 72; // 20,3 cm, formato cuadrado
const envMm = (name: string, fallback: number) =>
  parseFloat(process.env[name] || "") || fallback;
// Ajustar con la plantilla del proveedor (Gelato: sangrado 4 mm; Prodigi: sin sangrado)
const PRINT_BLEED = envMm("PRINT_BLEED_MM", 3) * MM;
const PRINT_SPINE = envMm("PRINT_SPINE_MM", 6) * MM;
const PRINT_COVER_WRAP = envMm("PRINT_COVER_WRAP_MM", 0) * MM;
const PRINT_MIN_PAGES = parseInt(process.env.PRINT_MIN_PAGES || "30", 10);
const SAFE = 0.5 * 72; // margen de seguridad dentro del corte
const LAYOUT_VERSION = 3; // subirlo invalida todos los PDFs en caché

const COLORS = {
  cream: rgb(0.995, 0.97, 0.92),
  ink: rgb(0.2, 0.16, 0.26),
  muted: rgb(0.45, 0.42, 0.5),
  accent: rgb(0.486, 0.227, 0.929), // #7c3aed
  amber: rgb(0.96, 0.62, 0.04),
  white: rgb(1, 1, 1),
  black: rgb(0, 0, 0),
};

interface Fonts {
  body: PDFFont;
  bold: PDFFont;
  title: PDFFont;
}

interface Frame {
  page: PDFPage;
  x: number; // origen del área de corte
  y: number;
  w: number;
  h: number;
}

// ============================================
// Almacenamiento y caché
// ============================================

// Caché regenerable: el nombre incluye un hash del contenido, así que una
// edición de texto o una página regenerada producen un PDF nuevo.
const STORAGE_DIR =
  process.env.PDF_STORAGE_DIR ||
  (process.env.S3_ENDPOINT && process.env.S3_BUCKET
    ? path.join(os.tmpdir(), "libros-ia-pdfs")
    : path.join(process.cwd(), "storage", "pdfs"));

function contentHash(book: PdfBook, kind: PdfKind): string {
  return createHash("sha1")
    .update(
      JSON.stringify({
        LAYOUT_VERSION,
        kind,
        book,
        print: [PRINT_BLEED, PRINT_SPINE, PRINT_COVER_WRAP, PRINT_MIN_PAGES],
      }),
    )
    .digest("hex")
    .slice(0, 12);
}

/** Ruta del PDF (lo genera si no está en caché para este contenido) */
export async function getOrBuildPdf(book: PdfBook, kind: PdfKind): Promise<string> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const prefix = `${book.id}-${kind}-`;
  const filePath = path.join(STORAGE_DIR, `${prefix}${contentHash(book, kind)}.pdf`);

  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    // no existe: generar
  }

  const started = Date.now();
  const bytes = await buildPdf(book, kind);
  await fs.writeFile(filePath, bytes);
  log.info({ bookId: book.id, kind, ms: Date.now() - started }, "PDF generado");

  // Borrar versiones anteriores de este libro y tipo
  const files = await fs.readdir(STORAGE_DIR);
  await Promise.all(
    files
      .filter((f) => f.startsWith(prefix) && path.join(STORAGE_DIR, f) !== filePath)
      .map((f) => fs.unlink(path.join(STORAGE_DIR, f)).catch(() => undefined)),
  );
  return filePath;
}

async function buildPdf(book: PdfBook, kind: PdfKind): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(book.title);
  doc.setAuthor("LibrosIA · IconicoSpace");
  doc.setCreator("LibrosIA");
  const fonts = await embedFonts(doc);
  const images = new ImageCache(doc, kind.startsWith("print"));

  if (kind === "print-cover") {
    await buildCoverSpread(doc, fonts, images, book);
  } else if (kind === "digital") {
    await buildDigital(doc, fonts, images, book);
  } else {
    await buildSpreads(doc, fonts, images, book, kind === "print-interior");
  }
  return doc.save();
}

// ============================================
// Composición de cada tipo
// ============================================

async function buildDigital(doc: PDFDocument, fonts: Fonts, images: ImageCache, book: PdfBook) {
  const newFrame = () => addFrame(doc, 0);
  const [cover, ...story] = sortPages(book.pages);

  await drawCoverPanel(newFrame(), fonts, images, book, cover?.imageUrl);
  drawExLibris(newFrame(), fonts, book);
  if (book.dedication) drawDedication(newFrame(), fonts, book);

  for (const page of story) {
    const frame = newFrame();
    await drawFullImage(frame, images, page.imageUrl);
    drawTextOverlay(frame, fonts, page);
    drawCornerNumber(frame, fonts, page.pageNumber - 1);
  }

  drawTheEnd(newFrame(), fonts, book);
  await drawCharacterPage(newFrame(), fonts, images, book);
  drawColophon(newFrame(), fonts, book);
}

/** Páginas enfrentadas: texto a la izquierda, ilustración a la derecha */
async function buildSpreads(
  doc: PDFDocument,
  fonts: Fonts,
  images: ImageCache,
  book: PdfBook,
  forPrinter: boolean,
) {
  const bleed = forPrinter ? PRINT_BLEED : 0;
  const newFrame = () => addFrame(doc, bleed);
  const [cover, ...story] = sortPages(book.pages);

  // En casa la portada va dentro; en imprenta va en el archivo de cubierta
  if (!forPrinter) await drawCoverPanel(newFrame(), fonts, images, book, cover?.imageUrl);

  drawExLibris(newFrame(), fonts, book);
  if (book.dedication) drawDedication(newFrame(), fonts, book);
  else drawSimplePage(newFrame(), fonts, `Para ${book.kidName}`);

  for (const page of story) {
    drawStoryText(newFrame(), fonts, page);
    const illustration = newFrame();
    await drawFullImage(illustration, images, page.imageUrl);
  }

  drawTheEnd(newFrame(), fonts, book);
  await drawCharacterPage(newFrame(), fonts, images, book);
  drawDrawingPage(newFrame(), fonts, book);
  drawColophon(newFrame(), fonts, book);

  // La imprenta exige un mínimo de páginas y número par
  if (forPrinter) {
    while (doc.getPageCount() < PRINT_MIN_PAGES || doc.getPageCount() % 2 !== 0) {
      const blank = newFrame();
      const pages = doc.getPages();
      // Insertar las páginas en blanco antes del colofón
      doc.removePage(pages.length - 1);
      doc.insertPage(pages.length - 2, blank.page);
    }
  }
}

/** Pliego de cubierta: contracubierta | lomo | portada */
async function buildCoverSpread(doc: PDFDocument, fonts: Fonts, images: ImageCache, book: PdfBook) {
  const edge = PRINT_BLEED + PRINT_COVER_WRAP;
  const width = TRIM * 2 + PRINT_SPINE + edge * 2;
  const height = TRIM + edge * 2;
  const page = doc.addPage([width, height]);
  page.setBleedBox(0, 0, width, height);
  page.setTrimBox(edge, edge, width - edge * 2, TRIM);

  const cover = sortPages(book.pages)[0];

  // Portada (derecha), la imagen llega hasta el borde exterior
  const frontX = edge + TRIM + PRINT_SPINE;
  await drawCoverPanel(
    { page, x: frontX, y: edge, w: TRIM, h: TRIM },
    fonts,
    images,
    book,
    cover?.imageUrl,
    { extendRight: edge, extendY: edge },
  );

  // Contracubierta (izquierda)
  page.drawRectangle({ x: 0, y: 0, width: edge + TRIM, height, color: COLORS.cream });
  const back: Frame = { page, x: edge, y: edge, w: TRIM, h: TRIM };
  if (book.summary) {
    drawParagraphBlock(back, fonts.body, book.summary, {
      top: back.y + back.h - SAFE - 20,
      size: 15,
      maxWidth: TRIM - SAFE * 2.4,
      color: COLORS.ink,
    });
  }
  if (book.characterImageUrl) {
    const img = await images.get(book.characterImageUrl);
    if (img) {
      const size = 150;
      page.drawImage(img, { x: back.x + (TRIM - size) / 2, y: back.y + 110, width: size, height: size });
    }
  }
  drawCentered(page, fonts.title, "LibrosIA", back.x + TRIM / 2, back.y + SAFE + 28, 16, COLORS.accent);
  drawCentered(page, fonts.body, "libros.iconicospace.com", back.x + TRIM / 2, back.y + SAFE + 10, 9, COLORS.muted);

  // Lomo
  page.drawRectangle({ x: edge + TRIM, y: 0, width: PRINT_SPINE, height, color: COLORS.accent });
  if (PRINT_SPINE >= 5 * MM) {
    const size = Math.min(PRINT_SPINE * 0.55, 11);
    const label = truncateToWidth(`${book.title}`, fonts.title, size, TRIM - SAFE * 2);
    const textWidth = fonts.title.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: edge + TRIM + PRINT_SPINE / 2 + size * 0.35,
      y: edge + (TRIM - textWidth) / 2 + textWidth,
      size,
      font: fonts.title,
      color: COLORS.white,
      rotate: degrees(-90),
    });
  }
}

// ============================================
// Bloques de página
// ============================================

function addFrame(doc: PDFDocument, bleed: number): Frame {
  const size = TRIM + bleed * 2;
  const page = doc.addPage([size, size]);
  if (bleed > 0) {
    page.setBleedBox(0, 0, size, size);
    page.setTrimBox(bleed, bleed, TRIM, TRIM);
  }
  return { page, x: bleed, y: bleed, w: TRIM, h: TRIM };
}

function fillBleed(frame: Frame, color: RGB) {
  const { width, height } = frame.page.getSize();
  frame.page.drawRectangle({ x: 0, y: 0, width, height, color });
}

async function drawFullImage(frame: Frame, images: ImageCache, url?: string | null) {
  const { width, height } = frame.page.getSize();
  if (!url) {
    fillBleed(frame, COLORS.cream);
    return;
  }
  const image = await images.get(url);
  if (!image) {
    fillBleed(frame, COLORS.cream);
    return;
  }
  // Cubrir toda la página, sangrado incluido
  drawImageCover(frame.page, image, 0, 0, width, height);
}

async function drawCoverPanel(
  frame: Frame,
  fonts: Fonts,
  images: ImageCache,
  book: PdfBook,
  imageUrl?: string | null,
  extend: { extendRight?: number; extendY?: number } = {},
) {
  const ext = extend.extendY ?? frame.x;
  const right = extend.extendRight ?? frame.x;
  const area = {
    x: frame.x,
    y: frame.y - ext,
    w: frame.w + right,
    h: frame.h + ext * 2,
  };
  frame.page.drawRectangle({ x: area.x, y: area.y, width: area.w, height: area.h, color: COLORS.cream });
  const image = imageUrl ? await images.get(imageUrl) : null;
  if (image) drawImageCover(frame.page, image, area.x, area.y, area.w, area.h);

  // Banda del título en el tercio superior (el prompt deja ese hueco libre)
  const titleSize = fitSize(fonts.title, book.title, frame.w - SAFE * 2, 40, 22);
  const lines = wrapText(book.title, fonts.title, titleSize, frame.w - SAFE * 2);
  const lineHeight = titleSize * 1.15;
  const bandHeight = lines.length * lineHeight + 46;
  const bandTop = frame.y + frame.h - SAFE * 0.6;
  frame.page.drawRectangle({
    x: frame.x + SAFE * 0.5,
    y: bandTop - bandHeight,
    width: frame.w - SAFE,
    height: bandHeight,
    color: COLORS.white,
    opacity: 0.82,
  });
  let y = bandTop - 20 - titleSize * 0.8;
  for (const line of lines) {
    drawCentered(frame.page, fonts.title, line, frame.x + frame.w / 2, y, titleSize, COLORS.accent);
    y -= lineHeight;
  }
  drawCentered(
    frame.page,
    fonts.body,
    `Una aventura de ${book.kidName}`,
    frame.x + frame.w / 2,
    bandTop - bandHeight + 12,
    12,
    COLORS.ink,
  );
}

function drawExLibris(frame: Frame, fonts: Fonts, book: PdfBook) {
  fillBleed(frame, COLORS.cream);
  const cx = frame.x + frame.w / 2;
  const cy = frame.y + frame.h / 2;
  frame.page.drawRectangle({
    x: frame.x + SAFE,
    y: frame.y + SAFE,
    width: frame.w - SAFE * 2,
    height: frame.h - SAFE * 2,
    borderColor: COLORS.amber,
    borderWidth: 2,
    borderDashArray: [6, 6],
  });
  drawCentered(frame.page, fonts.body, "Este libro pertenece a", cx, cy + 40, 18, COLORS.muted);
  const size = fitSize(fonts.title, book.kidName, frame.w - SAFE * 3, 52, 26);
  drawCentered(frame.page, fonts.title, book.kidName, cx, cy - 20, size, COLORS.accent);
}

function drawDedication(frame: Frame, fonts: Fonts, book: PdfBook) {
  fillBleed(frame, COLORS.cream);
  drawParagraphBlock(frame, fonts.body, book.dedication || "", {
    top: frame.y + frame.h / 2 + 60,
    size: 17,
    maxWidth: frame.w - SAFE * 3,
    color: COLORS.ink,
  });
}

function drawSimplePage(frame: Frame, fonts: Fonts, text: string) {
  fillBleed(frame, COLORS.cream);
  drawCentered(frame.page, fonts.title, text, frame.x + frame.w / 2, frame.y + frame.h / 2, 24, COLORS.accent);
}

function drawStoryText(frame: Frame, fonts: Fonts, page: PdfPage) {
  fillBleed(frame, COLORS.cream);
  const maxWidth = frame.w - SAFE * 2.6;
  const maxHeight = frame.h - SAFE * 3;
  let size = 24;
  let lines = wrapText(page.text, fonts.body, size, maxWidth);
  while (size > 12 && lines.length * size * 1.55 > maxHeight) {
    size -= 1;
    lines = wrapText(page.text, fonts.body, size, maxWidth);
  }
  const lineHeight = size * 1.55;
  let y = frame.y + frame.h / 2 + (lines.length * lineHeight) / 2 - size;
  for (const line of lines) {
    drawCentered(frame.page, fonts.body, line, frame.x + frame.w / 2, y, size, COLORS.ink);
    y -= lineHeight;
  }
  // Pequeño adorno y número de página
  frame.page.drawCircle({ x: frame.x + frame.w / 2, y: frame.y + SAFE + 26, size: 3, color: COLORS.amber });
  drawPageNumber(frame, fonts, page.pageNumber - 1, COLORS.muted);
}

function drawTheEnd(frame: Frame, fonts: Fonts, book: PdfBook) {
  fillBleed(frame, COLORS.cream);
  const cx = frame.x + frame.w / 2;
  drawCentered(frame.page, fonts.title, "Fin", cx, frame.y + frame.h / 2 + 10, 64, COLORS.accent);
  drawCentered(
    frame.page,
    fonts.body,
    `¿Qué aventura vivirá ${book.kidName} mañana?`,
    cx,
    frame.y + frame.h / 2 - 50,
    15,
    COLORS.muted,
  );
}

async function drawCharacterPage(frame: Frame, fonts: Fonts, images: ImageCache, book: PdfBook) {
  fillBleed(frame, COLORS.cream);
  const cx = frame.x + frame.w / 2;
  drawCentered(frame.page, fonts.title, `Así es ${book.kidName}`, cx, frame.y + frame.h - SAFE - 30, 28, COLORS.accent);
  const image = book.characterImageUrl ? await images.get(book.characterImageUrl) : null;
  const size = 280;
  if (image) {
    const x = cx - size / 2;
    const y = frame.y + frame.h - SAFE - 60 - size;
    frame.page.drawRectangle({ x: x - 6, y: y - 6, width: size + 12, height: size + 12, color: COLORS.white });
    drawImageCover(frame.page, image, x, y, size, size);
  }
  if (book.characterPersonality) {
    drawParagraphBlock(frame, fonts.body, book.characterPersonality, {
      top: frame.y + SAFE + 90,
      size: 14,
      maxWidth: frame.w - SAFE * 3,
      color: COLORS.ink,
    });
  }
}

function drawDrawingPage(frame: Frame, fonts: Fonts, book: PdfBook) {
  fillBleed(frame, COLORS.white);
  const heading = `Dibuja aquí la próxima aventura de ${book.kidName}`;
  const size = fitSize(fonts.title, heading, frame.w - SAFE * 3, 22, 14);
  const lines = wrapText(heading, fonts.title, size, frame.w - SAFE * 3);
  let y = frame.y + frame.h - SAFE - size;
  for (const line of lines) {
    drawCentered(frame.page, fonts.title, line, frame.x + frame.w / 2, y, size, COLORS.accent);
    y -= size * 1.2;
  }
  frame.page.drawRectangle({
    x: frame.x + SAFE,
    y: frame.y + SAFE,
    width: frame.w - SAFE * 2,
    height: y - frame.y - SAFE - 6,
    borderColor: COLORS.muted,
    borderWidth: 1.5,
    borderDashArray: [8, 6],
  });
}

function drawColophon(frame: Frame, fonts: Fonts, book: PdfBook) {
  fillBleed(frame, COLORS.white);
  const owner = [
    process.env.LEGAL_OWNER_NAME || "IconicoSpace",
    process.env.LEGAL_TAX_ID ? `NIF ${process.env.LEGAL_TAX_ID}` : null,
    process.env.LEGAL_ADDRESS || null,
  ]
    .filter(Boolean)
    .join(" · ");
  const date = book.createdAt.toLocaleDateString("es-ES", { year: "numeric", month: "long" });
  const lines = [
    `«${book.title}»`,
    `Un libro creado para ${book.kidName} · ${date}`,
    "",
    "Texto e ilustraciones generados con inteligencia artificial",
    "y revisados por su familia con LibrosIA.",
    "",
    `Editado por ${owner}`,
    "hola@iconicospace.com · libros.iconicospace.com",
  ];
  let y = frame.y + SAFE + lines.length * 14;
  for (const line of lines) {
    if (line) drawCentered(frame.page, fonts.body, line, frame.x + frame.w / 2, y, 9.5, COLORS.muted);
    y -= 14;
  }
}

function drawCornerNumber(frame: Frame, fonts: Fonts, number: number) {
  const label = String(number);
  const size = 10;
  const x = frame.x + frame.w - 22 - fonts.body.widthOfTextAtSize(label, size) / 2;
  const y = frame.y + frame.h - 26;
  frame.page.drawCircle({ x: x + fonts.body.widthOfTextAtSize(label, size) / 2, y: y + 3.5, size: 10, color: COLORS.white, opacity: 0.8 });
  frame.page.drawText(label, { x, y, size, font: fonts.body, color: COLORS.ink });
}

function drawPageNumber(frame: Frame, fonts: Fonts, number: number, color: RGB) {
  drawCentered(frame.page, fonts.body, String(number), frame.x + frame.w / 2, frame.y + SAFE * 0.45, 10, color);
}

/** Texto sobre la ilustración con la personalización del editor (PDF digital) */
function drawTextOverlay(frame: Frame, fonts: Fonts, pageData: PdfPage) {
  const text = pageData.text?.trim();
  if (!text) return;
  const { page, w: width, h: height } = frame;
  const padding = 24;
  const fontSize = 15;

  const position = (pageData.textPosition || "bottom") as TextPosition;
  const background = (pageData.textBackground || "gradient") as TextBackground;
  const style = pageData.textStyle || "default";
  const font = style === "bold" || style === "comic" ? fonts.bold : fonts.body;

  const isLeft = position.includes("left");
  const isRight = position.includes("right");
  const maxWidth = (width - padding * 2) * (isLeft || isRight ? 0.6 : 0.88);
  const lines = wrapText(text, font, fontSize, maxWidth);
  const lineHeight = fontSize * 1.45;
  const areaHeight = lines.length * lineHeight + padding * 2;

  let areaY: number;
  if (position.startsWith("top")) areaY = height - areaHeight;
  else if (position === "center") areaY = (height - areaHeight) / 2;
  else areaY = 0;

  switch (background) {
    case "gradient":
      for (let i = 0; i < 5; i++) {
        page.drawRectangle({
          x: 0,
          y: position.startsWith("top") ? height - areaHeight - i * 20 : 0,
          width,
          height: areaHeight + i * 20,
          color: COLORS.black,
          opacity: 0.11 * (1 - i / 5),
        });
      }
      break;
    case "box":
      page.drawRectangle({ x: padding / 2, y: areaY + padding / 2, width: width - padding, height: areaHeight - padding, color: COLORS.black, opacity: 0.72 });
      break;
    case "bubble":
      page.drawRectangle({ x: padding, y: areaY + padding / 2, width: width - padding * 2, height: areaHeight - padding, color: COLORS.white, borderColor: COLORS.ink, borderWidth: 2 });
      break;
    case "banner":
      page.drawRectangle({ x: 0, y: areaY, width, height: areaHeight, color: COLORS.black, opacity: 0.78 });
      break;
    default:
      break;
  }

  const color = background === "bubble" ? COLORS.ink : hexToRgb(pageData.textColor || "#FFFFFF");
  let y = areaY + areaHeight - padding * 0.8 - fontSize;
  for (const line of lines) {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    const x = isLeft ? padding : isRight ? width - padding - lineWidth : (width - lineWidth) / 2;
    if (background === "none") {
      page.drawText(line, { x: x + 1.5, y: y - 1.5, size: fontSize, font, color: COLORS.black, opacity: 0.7 });
    }
    page.drawText(line, { x, y, size: fontSize, font, color });
    y -= lineHeight;
  }
}

// ============================================
// Utilidades
// ============================================

async function embedFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  const dir = path.join(process.cwd(), "public", "fonts");
  const [body, bold, title] = await Promise.all(
    ["Andika-Regular.ttf", "Andika-Bold.ttf", "Sniglet-ExtraBold.ttf"].map((f) =>
      fs.readFile(path.join(dir, f)),
    ),
  );
  return {
    body: await doc.embedFont(body, { subset: true }),
    bold: await doc.embedFont(bold, { subset: true }),
    title: await doc.embedFont(title, { subset: true }),
  };
}

/** Carga, reescala (si es para imprenta) e incrusta cada imagen una sola vez */
class ImageCache {
  private cache = new Map<string, Promise<PDFImage | null>>();
  constructor(
    private doc: PDFDocument,
    private forPrint: boolean,
  ) {}

  get(url: string): Promise<PDFImage | null> {
    if (!this.cache.has(url)) this.cache.set(url, this.load(url));
    return this.cache.get(url)!;
  }

  private async load(url: string): Promise<PDFImage | null> {
    try {
      let bytes = await loadStoredImage(url);
      if (this.forPrint) {
        // Ancho total con sangrado a 300 ppp
        const px = Math.round(((TRIM + PRINT_BLEED * 2 + PRINT_COVER_WRAP) / 72) * 300);
        bytes = await upscaleForPrint(bytes, px);
      }
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
      return isPng ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
    } catch (error) {
      log.error({ err: error, url }, "No se pudo incrustar la imagen");
      return null;
    }
  }
}

function sortPages(pages: PdfPage[]): PdfPage[] {
  return [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
}

function drawImageCover(page: PDFPage, image: PDFImage, x: number, y: number, w: number, h: number) {
  const ratio = image.width / image.height;
  let drawW = w;
  let drawH = w / ratio;
  if (drawH < h) {
    drawH = h;
    drawW = h * ratio;
  }
  page.drawImage(image, { x: x + (w - drawW) / 2, y: y + (h - drawH) / 2, width: drawW, height: drawH });
}

function drawCentered(page: PDFPage, font: PDFFont, text: string, cx: number, y: number, size: number, color: RGB) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - width / 2, y, size, font, color });
}

function drawParagraphBlock(
  frame: Frame,
  font: PDFFont,
  text: string,
  opts: { top: number; size: number; maxWidth: number; color: RGB },
) {
  const lines = wrapText(text, font, opts.size, opts.maxWidth);
  let y = opts.top;
  for (const line of lines) {
    drawCentered(frame.page, font, line, frame.x + frame.w / 2, y, opts.size, opts.color);
    y -= opts.size * 1.5;
  }
}

/** Ajusta el texto al ancho respetando saltos de línea */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function fitSize(font: PDFFont, text: string, maxWidth: number, max: number, min: number): number {
  // Tamaño mayor que deja el texto en 2 líneas como mucho
  for (let size = max; size > min; size -= 2) {
    if (wrapText(text, font, size, maxWidth).length <= 2) return size;
  }
  return min;
}

function truncateToWidth(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 3 && font.widthOfTextAtSize(`${cut}…`, size) > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

function hexToRgb(hex: string): RGB {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match
    ? rgb(parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255)
    : COLORS.white;
}
