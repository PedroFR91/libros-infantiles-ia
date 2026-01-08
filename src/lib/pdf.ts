import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
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

// Configuración de páginas - formato cuadrado de libro infantil
const PAGE_CONFIG = {
  digital: {
    width: 576, // 8 inches at 72 DPI (cuadrado)
    height: 576, // 8 inches at 72 DPI
    margin: 36, // 0.5 inch margin
    fontSize: 12,
    titleSize: 20,
    lineHeight: 1.6,
  },
  print: {
    width: 612, // 8.5 inches at 72 DPI (con bleed)
    height: 612, // 8.5 inches at 72 DPI
    margin: 54, // 0.75 inch margin
    bleed: 18, // 0.25 inch bleed
    fontSize: 12,
    titleSize: 20,
    lineHeight: 1.6,
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
async function getImageBytes(
  imageUrl: string
): Promise<Uint8Array | null> {
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

// Generar PDF digital - formato libro infantil cuadrado
export async function generateDigitalPDF(book: BookData): Promise<string> {
  await ensureStorageDir();

  const config = PAGE_CONFIG.digital;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colores del tema
  const bgColor = rgb(0.98, 0.96, 0.93); // Crema cálido
  const textColor = rgb(0.15, 0.15, 0.15);
  const subtitleColor = rgb(0.4, 0.4, 0.4);
  const accentColor = rgb(0.4, 0.3, 0.6); // Morado suave

  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([config.width, config.height]);
    const { width, height } = page.getSize();

    // Fondo crema
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: bgColor,
    });

    // Imagen ocupando la parte superior (70% de la página)
    const imageAreaHeight = height * 0.7;
    const imageAreaY = height - imageAreaHeight;

    if (pageData.imageUrl) {
      const imageBytes = await getImageBytes(pageData.imageUrl);
      if (imageBytes) {
        try {
          const image = await pdfDoc
            .embedPng(imageBytes)
            .catch(() => pdfDoc.embedJpg(imageBytes));

          // Calcular dimensiones manteniendo aspect ratio
          const imgDims = image.scale(1);
          const imgAspect = imgDims.width / imgDims.height;
          const areaAspect = width / imageAreaHeight;

          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > areaAspect) {
            // Imagen más ancha - ajustar por ancho
            drawWidth = width;
            drawHeight = width / imgAspect;
            drawX = 0;
            drawY = imageAreaY + (imageAreaHeight - drawHeight) / 2;
          } else {
            // Imagen más alta - ajustar por alto
            drawHeight = imageAreaHeight;
            drawWidth = imageAreaHeight * imgAspect;
            drawX = (width - drawWidth) / 2;
            drawY = imageAreaY;
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
    }

    // Área de texto (30% inferior)
    const textAreaY = imageAreaY - 10;
    const textStartY = textAreaY - 20;
    const maxWidth = width - config.margin * 2;

    // Título solo en primera página
    if (pageData.pageNumber === 1) {
      const titleLines = wrapText(
        book.title,
        boldFont,
        config.titleSize,
        maxWidth
      );
      let titleY = textStartY;

      for (const line of titleLines) {
        const titleWidth = boldFont.widthOfTextAtSize(line, config.titleSize);
        page.drawText(line, {
          x: (width - titleWidth) / 2, // Centrado
          y: titleY,
          size: config.titleSize,
          font: boldFont,
          color: accentColor,
        });
        titleY -= config.titleSize * 1.3;
      }

      const subtitle = `Una historia de ${book.kidName}`;
      const subtitleWidth = font.widthOfTextAtSize(subtitle, config.fontSize);
      page.drawText(subtitle, {
        x: (width - subtitleWidth) / 2,
        y: titleY - 5,
        size: config.fontSize,
        font,
        color: subtitleColor,
      });

      // Texto de la primera página debajo del subtítulo
      if (pageData.text) {
        const lines = wrapText(
          pageData.text,
          font,
          config.fontSize - 1,
          maxWidth
        );
        let currentY = titleY - 30;

        for (const line of lines) {
          const lineWidth = font.widthOfTextAtSize(line, config.fontSize - 1);
          page.drawText(line, {
            x: (width - lineWidth) / 2,
            y: currentY,
            size: config.fontSize - 1,
            font,
            color: textColor,
          });
          currentY -= (config.fontSize - 1) * config.lineHeight;
        }
      }
    } else {
      // Texto de la historia (páginas 2+)
      if (pageData.text) {
        const lines = wrapText(pageData.text, font, config.fontSize, maxWidth);
        let currentY = textStartY;

        for (const line of lines) {
          const lineWidth = font.widthOfTextAtSize(line, config.fontSize);
          page.drawText(line, {
            x: (width - lineWidth) / 2,
            y: currentY,
            size: config.fontSize,
            font,
            color: textColor,
          });
          currentY -= config.fontSize * config.lineHeight;
        }
      }
    }

    // Número de página (pequeño, abajo a la derecha)
    page.drawText(`${pageData.pageNumber}`, {
      x: width - config.margin,
      y: 15,
      size: 9,
      font,
      color: subtitleColor,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `${book.id}-digital.pdf`;
  const filepath = path.join(STORAGE_DIR, filename);

  await fs.writeFile(filepath, pdfBytes);

  return `/api/books/${book.id}/pdf/download?type=digital`;
}

// Generar PDF print-ready
export async function generatePrintReadyPDF(book: BookData): Promise<string> {
  await ensureStorageDir();

  const config = PAGE_CONFIG.print;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Colores
  const bgColor = rgb(1, 1, 1); // Blanco para impresión
  const textColor = rgb(0.1, 0.1, 0.1);
  const subtitleColor = rgb(0.35, 0.35, 0.35);
  const accentColor = rgb(0.35, 0.25, 0.55);

  for (const pageData of book.pages) {
    const page = pdfDoc.addPage([config.width, config.height]);
    const { width, height } = page.getSize();

    // Fondo blanco
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: bgColor,
    });

    // Área segura (sin bleed)
    const safeX = config.bleed;
    const safeY = config.bleed;
    const safeWidth = width - config.bleed * 2;
    const safeHeight = height - config.bleed * 2;

    // Imagen ocupando la parte superior
    const imageAreaHeight = safeHeight * 0.68;
    const imageAreaY = safeY + safeHeight - imageAreaHeight;

    if (pageData.imageUrl) {
      const imageBytes = await getImageBytes(pageData.imageUrl);
      if (imageBytes) {
        try {
          const image = await pdfDoc
            .embedPng(imageBytes)
            .catch(() => pdfDoc.embedJpg(imageBytes));

          const imgDims = image.scale(1);
          const imgAspect = imgDims.width / imgDims.height;
          const areaAspect = safeWidth / imageAreaHeight;

          let drawWidth, drawHeight, drawX, drawY;

          if (imgAspect > areaAspect) {
            drawWidth = safeWidth;
            drawHeight = safeWidth / imgAspect;
            drawX = safeX;
            drawY = imageAreaY + (imageAreaHeight - drawHeight) / 2;
          } else {
            drawHeight = imageAreaHeight;
            drawWidth = imageAreaHeight * imgAspect;
            drawX = safeX + (safeWidth - drawWidth) / 2;
            drawY = imageAreaY;
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
    }

    // Área de texto
    const textAreaY = imageAreaY - 15;
    const textStartY = textAreaY - 20;
    const maxWidth = safeWidth - config.margin;

    // Título en primera página
    if (pageData.pageNumber === 1) {
      const titleLines = wrapText(
        book.title,
        boldFont,
        config.titleSize,
        maxWidth
      );
      let titleY = textStartY;

      for (const line of titleLines) {
        const titleWidth = boldFont.widthOfTextAtSize(line, config.titleSize);
        page.drawText(line, {
          x: safeX + (safeWidth - titleWidth) / 2,
          y: titleY,
          size: config.titleSize,
          font: boldFont,
          color: accentColor,
        });
        titleY -= config.titleSize * 1.3;
      }

      const subtitle = `Una historia de ${book.kidName}`;
      const subtitleWidth = font.widthOfTextAtSize(subtitle, config.fontSize);
      page.drawText(subtitle, {
        x: safeX + (safeWidth - subtitleWidth) / 2,
        y: titleY - 5,
        size: config.fontSize,
        font,
        color: subtitleColor,
      });

      // Texto de la primera página
      if (pageData.text) {
        const lines = wrapText(
          pageData.text,
          font,
          config.fontSize - 1,
          maxWidth
        );
        let currentY = titleY - 30;

        for (const line of lines) {
          const lineWidth = font.widthOfTextAtSize(line, config.fontSize - 1);
          page.drawText(line, {
            x: safeX + (safeWidth - lineWidth) / 2,
            y: currentY,
            size: config.fontSize - 1,
            font,
            color: textColor,
          });
          currentY -= (config.fontSize - 1) * config.lineHeight;
        }
      }
    } else {
      // Texto (páginas 2+)
      if (pageData.text) {
        const lines = wrapText(pageData.text, font, config.fontSize, maxWidth);
        let currentY = textStartY;

        for (const line of lines) {
          const lineWidth = font.widthOfTextAtSize(line, config.fontSize);
          page.drawText(line, {
            x: safeX + (safeWidth - lineWidth) / 2,
            y: currentY,
            size: config.fontSize,
            font,
            color: textColor,
          });
          currentY -= config.fontSize * config.lineHeight;
        }
      }
    }

    // Número de página
    page.drawText(`${pageData.pageNumber}`, {
      x: safeX + safeWidth - 20,
      y: safeY + 10,
      size: 9,
      font,
      color: subtitleColor,
    });
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
