import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Directorio para almacenar imágenes
const IMAGES_DIR = process.env.IMAGES_DIR || "./public/images/books";

/**
 * Descarga una imagen desde una URL y la guarda localmente
 * @param url - URL de la imagen (ej: URL temporal de OpenAI)
 * @param bookId - ID del libro para organizar las imágenes
 * @param pageNumber - Número de página
 * @returns URL local de la imagen guardada
 */
export async function downloadAndStoreImage(
  url: string,
  bookId: string,
  pageNumber: number
): Promise<string> {
  try {
    // Crear directorio si no existe
    const bookDir = path.join(IMAGES_DIR, bookId);
    await fs.mkdir(bookDir, { recursive: true });

    // Generar nombre único para el archivo
    const fileName = `page-${pageNumber}-${randomUUID().slice(0, 8)}.png`;
    const filePath = path.join(bookDir, fileName);

    // Descargar la imagen
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Guardar en disco
    await fs.writeFile(filePath, buffer);

    // Retornar la URL usando la API route para servir la imagen
    const publicUrl = `/api/images/books/${bookId}/${fileName}`;

    console.log(`Imagen guardada: ${filePath} -> ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error("Error guardando imagen:", error);
    // Si falla el almacenamiento, devolver la URL original
    // (aunque expirará, al menos funcionará temporalmente)
    return url;
  }
}

/**
 * Elimina todas las imágenes de un libro
 * @param bookId - ID del libro
 */
export async function deleteBookImages(bookId: string): Promise<void> {
  try {
    const bookDir = path.join(IMAGES_DIR, bookId);
    await fs.rm(bookDir, { recursive: true, force: true });
    console.log(`Imágenes eliminadas para libro: ${bookId}`);
  } catch (error) {
    console.error("Error eliminando imágenes:", error);
  }
}

/**
 * Verifica si una URL es local (guardada en nuestro servidor)
 */
export function isLocalUrl(url: string): boolean {
  return url.startsWith("/images/") || url.startsWith("/uploads/");
}

/**
 * Verifica si una URL es de OpenAI (temporal)
 */
export function isOpenAIUrl(url: string): boolean {
  return url.includes("oaidalleapiprodscus.blob.core.windows.net");
}
