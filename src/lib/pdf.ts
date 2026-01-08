import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFFont,
  PDFPage,
  RGB,
} from "pdf-lib";
import * as fs from "fs/promises";
import * as path from "path";

// Tipos de personalización (deben coincidir con types.ts del editor)
type TextPosition =
  | "bottom"
  | "top"
  | "center"
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right";
type TextBackground = "none" | "gradient" | "bubble" | "box" | "banner";
type TextStyle =
  | "default"
  | "handwritten"
  | "comic"
  | "elegant"
  | "playful"
  | "bold";

interface PageData {
  pageNumber: number;
  text: string;
  imageUrl?: string;
  // Campos de personalización
  textPosition?: TextPosition;
  textBackground?: TextBackground;
  textStyle?: TextStyle;
  textColor?: string;
}

interface BookData {
  id: string;
  title: string;
  kidName: string;
  pages: PageData[];
}

// Configuración de páginas - formato cuadrado de libro infantil
const PAGE_CONFIG = {
  digital: {
    width: 576, // 8 inches at 72 DPI (cuadrado)
    height: 576, // 8 inches at 72 DPI
    padding: 20, // Padding para el texto
    fontSize: 14,
    titleSize: 22,
    lineHeight: 1.5,
  },
  print: {
    width: 612, // 8.5 inches at 72 DPI (con bleed)
    height: 612, // 8.5 inches at 72 DPI
    bleed: 18, // 0.25 inch bleed
    padding: 25,
    fontSize: 14,
    titleSize: 22,
    lineHeight: 1.5,
  },
};

// Directorio de almacenamiento
const STORAGE_DIR =
  process.env.USE_S3 === "true"
    ? "/tmp"
    : path.join(process.cwd(), "storage", "pdfs");

// Directorio de imágenes
const IMAGES_DIR = path.join(process.cwd(), "public", "images", "books");

// Asegurar que el directorio existe
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch {
    // El directorio ya existe
  }
}

// Leer imagen del disco o descargar si es URL externa
async function getImageBytes(imageUrl: string): Promise<Uint8Array | null> {
  try {
    // Si es una URL de nuestra API, leer del disco
    if (
      imageUrl.startsWith("/api/images/books/") ||
      imageUrl.startsWith("/images/books/")
    ) {
      // Extraer el path: /api/images/books/bookId/filename.png -> bookId/filename.png
      const match = imageUrl.match(/\/(?:api\/)?images\/books\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bookId, filename] = match;
        const localPath = path.join(IMAGES_DIR, bookId, filename);

        try {
          const fileBuffer = await fs.readFile(localPath);
          console.log(`Imagen leída del disco: ${localPath}`);
          return new Uint8Array(fileBuffer);
        } catch (readError) {
          console.error(
            `Error leyendo imagen del disco: ${localPath}`,
            readError
          );
        }
      }
    }

    // Si es una URL externa, descargarla
    if (imageUrl.startsWith("http")) {
      const response = await fetch(imageUrl);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    return null;
  } catch (error) {
    console.error("Error obteniendo imagen:", error);
    return null;
  }
}

// Utilidad para wrappear texto usando el ancho real de la fuente
function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Convertir color hex a RGB
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return rgb(
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    );
  }
  return rgb(1, 1, 1); // Blanco por defecto
}

// Dibujar texto con su posición y estilo (replicando el editor)
function drawTextOverlay(
  page: PDFPage,
  text: string,
  font: PDFFont,
  boldFont: PDFFont,
  fontSize: number,
  config: { width: number; height: number; padding: number },
  pageData: PageData,
  isCover: boolean
) {
  if (!text && !isCover) return;

  const { width, height } = page.getSize();
  const padding = config.padding;
  const maxWidth = width - padding * 2;

  // Obtener configuración de la página o usar valores por defecto
  const textPosition = pageData.textPosition || "bottom";
  const textBackground = pageData.textBackground || "gradient";
  const textStyle = pageData.textStyle || "default";
  const textColorHex = pageData.textColor || "#FFFFFF";

  // Seleccionar fuente según estilo
  const selectedFont =
    textStyle === "bold" || textStyle === "comic" ? boldFont : font;

  // Wrap del texto
  const lines = wrapText(text, selectedFont, fontSize, maxWidth * 0.85);
  const lineHeight = fontSize * 1.5;
  const textBlockHeight = lines.length * lineHeight + padding;

  // Calcular posición Y según textPosition
  let textY: number;
  let textAreaY: number;
  let textAreaHeight: number = textBlockHeight + padding;

  switch (textPosition) {
    case "top":
    case "top-left":
    case "top-right":
      textAreaY = height - textAreaHeight;
      textY = textAreaY + textAreaHeight - padding - fontSize;
      break;
    case "center":
      textAreaY = (height - textAreaHeight) / 2;
      textY = textAreaY + textAreaHeight - padding - fontSize;
      break;
    case "bottom":
    case "bottom-left":
    case "bottom-right":
    default:
      textAreaY = 0;
      textY = textAreaHeight - padding - fontSize;
      break;
  }

  // Calcular posición X según textPosition
  const isLeft = textPosition.includes("left");
  const isRight = textPosition.includes("right");
  const textMaxWidth = isLeft || isRight ? maxWidth * 0.6 : maxWidth;

  // Dibujar fondo según textBackground
  switch (textBackground) {
    case "gradient":
      // Degradado de negro transparente
      if (textPosition.includes("top")) {
        // Degradado de arriba hacia abajo
        for (let i = 0; i < 5; i++) {
          const opacity = 0.7 * (1 - i / 5);
          page.drawRectangle({
            x: 0,
            y: height - textAreaHeight - i * 20,
            width: width,
            height: textAreaHeight + i * 20 + 20,
            color: rgb(0, 0, 0),
            opacity: opacity * 0.15,
          });
        }
      } else {
        // Degradado de abajo hacia arriba
        for (let i = 0; i < 5; i++) {
          const opacity = 0.7 * (1 - i / 5);
          page.drawRectangle({
            x: 0,
            y: 0,
            width: width,
            height: textAreaHeight + i * 20,
            color: rgb(0, 0, 0),
            opacity: opacity * 0.15,
          });
        }
      }
      break;

    case "box":
      // Caja con fondo semi-transparente
      page.drawRectangle({
        x: padding / 2,
        y: textAreaY + padding / 2,
        width: width - padding,
        height: textAreaHeight - padding,
        color: rgb(0, 0, 0),
        opacity: 0.75,
      });
      break;

    case "bubble":
      // Bocadillo blanco tipo cómic
      page.drawRectangle({
        x: padding,
        y: textAreaY + padding / 2,
        width: width - padding * 2,
        height: textAreaHeight - padding,
        color: rgb(1, 1, 1),
      });
      // Borde del bocadillo
      page.drawRectangle({
        x: padding,
        y: textAreaY + padding / 2,
        width: width - padding * 2,
        height: textAreaHeight - padding,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 2,
      });
      break;

    case "banner":
      // Banner con degradado lateral
      page.drawRectangle({
        x: 0,
        y: textAreaY,
        width: width,
        height: textAreaHeight,
        color: rgb(0, 0, 0),
        opacity: 0.8,
      });
      break;

    case "none":
    default:
      // Sin fondo, solo sombra en el texto (simulado con texto desplazado)
      break;
  }

  // Determinar color del texto
  const finalTextColor =
    textBackground === "bubble" ? rgb(0, 0, 0) : hexToRgb(textColorHex);

  // Dibujar el texto
  let currentY = textY;
  for (const line of lines) {
    const lineWidth = selectedFont.widthOfTextAtSize(line, fontSize);

    let textX: number;
    if (isLeft) {
      textX = padding;
    } else if (isRight) {
      textX = width - padding - lineWidth;
    } else {
      textX = (width - lineWidth) / 2;
    }

    // Sombra del texto (para "none" background)
    if (textBackground === "none") {
      page.drawText(line, {
        x: textX + 2,
        y: currentY - 2,
        size: fontSize,
        font: selectedFont,
        color: rgb(0, 0, 0),
        opacity: 0.8,
      });
    }

    // Texto principal
    page.drawText(line, {
      x: textX,
      y: currentY,
      size: fontSize,
      font: selectedFont,
      color: finalTextColor,
    });

    currentY -= lineHeight;
  }
}

// Generar PDF digital - replicando exactamente el diseño del editor
export async function generateDigitalPDF(book: BookData): Promise<string> {
  await ensureStorageDir();

  const config = PAGE_CONFIG.digital;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([config.width, config.height]);
    const { width, height } = page.getSize();

    // Fondo blanco por defecto (se cubrirá con la imagen)
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.95, 0.93, 0.9), // Crema suave como fallback
    });

    // IMAGEN A PANTALLA COMPLETA (como en el editor)
    if (pageData.imageUrl) {
      const imageBytes = await getImageBytes(pageData.imageUrl);
      if (imageBytes) {
        try {
          const image = await pdfDoc
            .embedPng(imageBytes)
            .catch(() => pdfDoc.embedJpg(imageBytes));

          // Calcular dimensiones para CUBRIR toda la página (cover)
          const imgDims = image.scale(1);
          const imgAspect = imgDims.width / imgDims.height;
          const pageAspect = width / height;

          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > pageAspect) {
            // Imagen más ancha - ajustar por altura y centrar horizontalmente
            drawHeight = height;
            drawWidth = height * imgAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
          } else {
            // Imagen más alta - ajustar por ancho y centrar verticalmente
            drawWidth = width;
            drawHeight = width / imgAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
          }

          page.drawImage(image, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });
        } catch (error) {
          console.error("Error embebiendo imagen:", error);
        }
      }
    } else {
      // Si no hay imagen, dibujar placeholder decorativo
      page.drawRectangle({
        x: width * 0.2,
        y: height * 0.3,
        width: width * 0.6,
        height: height * 0.4,
        color: rgb(0.9, 0.87, 0.85),
      });
    }

    // TEXTO SUPERPUESTO (como en el editor)
    const isCover = pageData.pageNumber === 1;
    if (pageData.text) {
      drawTextOverlay(
        page,
        pageData.text,
        font,
        boldFont,
        config.fontSize,
        config,
        pageData,
        isCover
      );
    }

    // Número de página (pequeño, esquina)
    if (pageData.pageNumber > 1) {
      page.drawText(`${pageData.pageNumber}`, {
        x: width - 30,
        y: 15,
        size: 10,
        font,
        color: rgb(1, 1, 1),
        opacity: 0.7,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${book.id}-digital.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  await fs.writeFile(filepath, pdfBytes);

  return `/api/books/${book.id}/pdf/download?type=digital`;
}

// Generar PDF print-ready - también con diseño del editor
export async function generatePrintReadyPDF(book: BookData): Promise<string> {
  await ensureStorageDir();

  const config = PAGE_CONFIG.print;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([config.width, config.height]);
    const { width, height } = page.getSize();

    // Área segura (sin bleed)
    const safeX = config.bleed;
    const safeY = config.bleed;
    const safeWidth = width - config.bleed * 2;
    const safeHeight = height - config.bleed * 2;

    // Fondo blanco
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
    });

    // IMAGEN A PANTALLA COMPLETA (como en el editor)
    if (pageData.imageUrl) {
      const imageBytes = await getImageBytes(pageData.imageUrl);
      if (imageBytes) {
        try {
          const image = await pdfDoc
            .embedPng(imageBytes)
            .catch(() => pdfDoc.embedJpg(imageBytes));

          // Calcular dimensiones para CUBRIR toda la página (cover) incluyendo bleed
          const imgDims = image.scale(1);
          const imgAspect = imgDims.width / imgDims.height;
          const pageAspect = width / height;

          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > pageAspect) {
            drawHeight = height;
            drawWidth = height * imgAspect;
            drawX = (width - drawWidth) / 2;
            drawY = 0;
          } else {
            drawWidth = width;
            drawHeight = width / imgAspect;
            drawX = 0;
            drawY = (height - drawHeight) / 2;
          }

          page.drawImage(image, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });
        } catch (error) {
          console.error("Error embebiendo imagen:", error);
        }
      }
    } else {
      // Placeholder si no hay imagen
      page.drawRectangle({
        x: width * 0.2,
        y: height * 0.3,
        width: width * 0.6,
        height: height * 0.4,
        color: rgb(0.95, 0.93, 0.9),
      });
    }

    // TEXTO SUPERPUESTO
    const isCover = pageData.pageNumber === 1;
    if (pageData.text) {
      drawTextOverlay(
        page,
        pageData.text,
        font,
        boldFont,
        config.fontSize,
        { width: safeWidth, height: safeHeight, padding: config.padding },
        pageData,
        isCover
      );
    }

    // Número de página
    if (pageData.pageNumber > 1) {
      page.drawText(`${pageData.pageNumber}`, {
        x: safeX + safeWidth - 25,
        y: safeY + 15,
        size: 10,
        font,
        color: rgb(1, 1, 1),
        opacity: 0.7,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${book.id}-print.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  await fs.writeFile(filepath, pdfBytes);

  return `/api/books/${book.id}/pdf/download?type=print`;
}

// Obtener ruta del PDF
export async function getPDFPath(
  bookId: string,
  type: "digital" | "print"
): Promise<string | null> {
  const filename = `${bookId}-${type}.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  try {
    await fs.access(filepath);
    return filepath;
  } catch {
    return null;
  }
}
