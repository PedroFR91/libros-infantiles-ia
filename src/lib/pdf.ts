import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as fs from "fs/promises";
import * as path from "path";

interface PageData {
  pageNumber: number;
  text: string;
  imageUrl?: string;
}

interface BookData {
  id: string;
  title: string;
  kidName: string;
  pages: PageData[];
}

// Configuración de páginas
const PAGE_CONFIG = {
  digital: {
    width: 612, // 8.5 inches at 72 DPI
    height: 792, // 11 inches at 72 DPI
    margin: 50,
    fontSize: 14,
    titleSize: 24,
  },
  print: {
    width: 648, // 9 inches at 72 DPI (con bleed de 0.25")
    height: 828, // 11.5 inches at 72 DPI (con bleed de 0.25")
    margin: 72, // 1 inch margin
    bleed: 18, // 0.25 inch bleed
    fontSize: 14,
    titleSize: 24,
  },
};

// Directorio de almacenamiento
const STORAGE_DIR =
  process.env.USE_S3 === "true"
    ? "/tmp"
    : path.join(process.cwd(), "storage", "pdfs");

// Asegurar que el directorio existe
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    // El directorio ya existe
  }
}

// Descargar imagen como bytes
async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } catch (error) {
    console.error("Error descargando imagen:", error);
    return null;
  }
}

// Generar PDF digital
export async function generateDigitalPDF(book: BookData): Promise<string> {
  await ensureStorageDir();

  const config = PAGE_CONFIG.digital;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([config.width, config.height]);
    const { width, height } = page.getSize();

    // Fondo suave
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.98, 0.97, 0.95), // Crema claro
    });

    // Imagen (si existe)
    if (pageData.imageUrl) {
      const imageBytes = await fetchImageBytes(pageData.imageUrl);
      if (imageBytes) {
        try {
          const image = await pdfDoc
            .embedPng(imageBytes)
            .catch(() => pdfDoc.embedJpg(imageBytes));

          const imageWidth = width - config.margin * 2;
          const imageHeight = height * 0.55;
          const imageX = config.margin;
          const imageY = height - config.margin - imageHeight;

          page.drawImage(image, {
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
          });
        } catch (error) {
          console.error("Error embebiendo imagen:", error);
        }
      }
    }

    // Texto
    const textY = height * 0.35;
    const maxWidth = width - config.margin * 2;

    // Título en primera página
    if (pageData.pageNumber === 1) {
      page.drawText(book.title, {
        x: config.margin,
        y: textY + 50,
        size: config.titleSize,
        font: boldFont,
        color: rgb(0.2, 0.2, 0.2),
        maxWidth,
      });

      page.drawText(`Una aventura de ${book.kidName}`, {
        x: config.margin,
        y: textY + 20,
        size: config.fontSize,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Texto de la página
    if (pageData.text) {
      const lines = wrapText(pageData.text, font, config.fontSize, maxWidth);
      let currentY = textY;

      for (const line of lines) {
        page.drawText(line, {
          x: config.margin,
          y: currentY,
          size: config.fontSize,
          font,
          color: rgb(0.2, 0.2, 0.2),
        });
        currentY -= config.fontSize * 1.5;
      }
    }

    // Número de página
    page.drawText(`${pageData.pageNumber}`, {
      x: width / 2 - 5,
      y: 30,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${book.id}-digital.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  await fs.writeFile(filepath, pdfBytes);

  // TODO: Si USE_S3=true, subir a S3 y retornar URL de S3
  return `/api/books/${book.id}/pdf/download?type=digital`;
}

// Generar PDF print-ready
export async function generatePrintReadyPDF(book: BookData): Promise<string> {
  await ensureStorageDir();

  const config = PAGE_CONFIG.print;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([config.width, config.height]);
    const { width, height } = page.getSize();

    // Área de bleed (marca de corte visual - en producción sería más sofisticado)
    // Fondo que se extiende al bleed
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1), // Blanco
    });

    // Área segura (dentro de márgenes)
    const safeX = config.bleed + config.margin;
    const safeY = config.bleed + config.margin;
    const safeWidth = width - safeX * 2;
    const safeHeight = height - safeY * 2;

    // Imagen (si existe) - con mayor resolución
    if (pageData.imageUrl) {
      const imageBytes = await fetchImageBytes(pageData.imageUrl);
      if (imageBytes) {
        try {
          const image = await pdfDoc
            .embedPng(imageBytes)
            .catch(() => pdfDoc.embedJpg(imageBytes));

          const imageWidth = safeWidth;
          const imageHeight = safeHeight * 0.55;
          const imageX = safeX;
          const imageY = height - safeY - imageHeight;

          page.drawImage(image, {
            x: imageX,
            y: imageY,
            width: imageWidth,
            height: imageHeight,
          });
        } catch (error) {
          console.error("Error embebiendo imagen:", error);
        }
      }
    }

    // Texto
    const textY = height * 0.35;

    // Título en primera página
    if (pageData.pageNumber === 1) {
      page.drawText(book.title, {
        x: safeX,
        y: textY + 50,
        size: config.titleSize,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: safeWidth,
      });

      page.drawText(`Una aventura de ${book.kidName}`, {
        x: safeX,
        y: textY + 20,
        size: config.fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Texto de la página
    if (pageData.text) {
      const lines = wrapText(pageData.text, font, config.fontSize, safeWidth);
      let currentY = textY;

      for (const line of lines) {
        page.drawText(line, {
          x: safeX,
          y: currentY,
          size: config.fontSize,
          font,
          color: rgb(0.1, 0.1, 0.1),
        });
        currentY -= config.fontSize * 1.5;
      }
    }

    // Número de página (fuera del área de corte)
    page.drawText(`${pageData.pageNumber}`, {
      x: width / 2 - 5,
      y: config.bleed + 15,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });

    // TODO: Añadir marcas de corte para impresión profesional
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

// Utilidad para wrappear texto
function wrapText(
  text: string,
  _font: unknown, // Font no se usa actualmente, reservado para futuro
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Aproximación simple del ancho (en producción usar font.widthOfTextAtSize)
    const estimatedWidth = testLine.length * fontSize * 0.5;

    if (estimatedWidth > maxWidth && currentLine) {
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
