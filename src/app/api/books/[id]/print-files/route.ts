import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import prisma from "@/lib/prisma";
import { getOrBuildPdf } from "@/lib/pdf";
import { toPdfBook } from "@/lib/pdfData";
import { isAdminSession } from "@/lib/adminAuth";
import { createLogger } from "@/lib/logger";

const log = createLogger("print-files");

// La primera generación reescala todas las ilustraciones a 300 ppp
export const maxDuration = 300;

// GET /api/books/[id]/print-files?part=interior|cover
// Archivos para la imprenta (sangrado, 300 ppp, cubierta con lomo). Solo admin:
// se suben a mano a la imprenta en la fase A de los pedidos impresos.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAdminSession())) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const part = request.nextUrl.searchParams.get("part") === "cover" ? "cover" : "interior";

    const book = await prisma.book.findUnique({
      where: { id },
      include: { pages: { orderBy: { pageNumber: "asc" } } },
    });
    if (!book) {
      return NextResponse.json({ error: "Libro no encontrado" }, { status: 404 });
    }
    if (book.status !== "COMPLETED") {
      return NextResponse.json({ error: "El libro no está completado" }, { status: 400 });
    }

    const pdfPath = await getOrBuildPdf(
      toPdfBook(book),
      part === "cover" ? "print-cover" : "print-interior",
    );
    const pdfBuffer = await fs.readFile(pdfPath);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${id}-imprenta-${part}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    log.error({ err: error }, "Error generando archivos de imprenta");
    return NextResponse.json({ error: "Error generando el PDF" }, { status: 500 });
  }
}
