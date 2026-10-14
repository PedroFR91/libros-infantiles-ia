import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs/promises";
import prisma from "@/lib/prisma";
import { printFilePath, verifyPrintFileSignature, type PrintPart } from "@/lib/printFulfillment";
import { createLogger } from "@/lib/logger";

const log = createLogger("imprenta-files");

// La primera generación reescala las ilustraciones a 300 ppp
export const maxDuration = 300;

const FILES: Record<string, PrintPart> = {
  "interior.pdf": "interior",
  "cubierta.pdf": "cubierta",
};

// GET /api/imprenta/[orderId]/[signature]/interior.pdf | cubierta.pdf
// PDF de imprenta de un pedido para que Bubok los descargue (la guía pide URLs
// públicas y directas). Solo con la firma del pedido y mientras el pedido siga
// vivo (pagado, en producción o enviado).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string; signature: string; file: string }> },
) {
  const { orderId, signature, file } = await params;
  const part = FILES[file];
  if (!part || !verifyPrintFileSignature(orderId, signature)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  try {
    const order = await prisma.printOrder.findUnique({
      where: { id: orderId },
      select: { bookId: true, status: true },
    });
    if (!order || !["PAID", "IN_PRODUCTION", "SHIPPED"].includes(order.status)) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    const pdf = await fs.readFile(await printFilePath(order.bookId, part));
    log.info({ orderId, part, bytes: pdf.length }, "PDF de imprenta descargado");
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${orderId}-${part}.pdf"`,
        "Content-Length": pdf.length.toString(),
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    log.error({ err: error, orderId, part }, "Error sirviendo el PDF de imprenta");
    return NextResponse.json({ error: "Error generando el PDF" }, { status: 500 });
  }
}
