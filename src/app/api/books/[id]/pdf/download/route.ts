import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import prisma from "@/lib/prisma";
import { getOrBuildPdf } from "@/lib/pdf";
import { toPdfBook } from "@/lib/pdfData";
import { getAuthenticatedUserId } from "@/lib/apiAuth";
import { isAdminSession } from "@/lib/adminAuth";
import { createLogger } from "@/lib/logger";

const log = createLogger("pdf-download");

// GET /api/books/[id]/pdf/download?type=digital|print
// digital: para leer en pantalla · print: para imprimir en casa (páginas enfrentadas)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const type = request.nextUrl.searchParams.get("type") === "print" ? "print" : "digital";

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // El dueño del libro o un administrador (soporte desde el panel)
    const book = await prisma.book.findFirst({
      where: { id, ...((await isAdminSession()) ? {} : { userId }) },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });

    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }

    if (book.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "El libro debe estar completado para descargar" },
        { status: 400 },
      );
    }

    const pdfPath = await getOrBuildPdf(
      toPdfBook(book),
      type === "print" ? "home" : "digital",
    );
    const pdfBuffer = await fs.readFile(pdfPath);

    const safeName = book.kidName
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]/g, "")
      .replace(/\s+/g, "-");
    const filename = `${safeName}-libro${type === "print" ? "-para-imprimir" : ""}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error descargando PDF");
    return NextResponse.json({ error: "Error al descargar PDF" }, { status: 500 });
  }
}
