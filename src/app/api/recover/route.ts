import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recoverSchema, validateBody } from "@/lib/validation";
import { checkRateLimit, RATE_LIMIT_PRESETS } from "@/lib/rateLimit";
import { sendRecoverEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";

const log = createLogger("recover");

// POST /api/recover {email} - Envía los enlaces privados de los cuentos ligados
// a ese email (el del borrador, el de la compra, el del pedido o el de la
// cuenta). Responde siempre igual para no revelar qué emails existen.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = checkRateLimit(`recover:${ip}`, RATE_LIMIT_PRESETS.checkout);
  if (limited) return limited;

  const validation = validateBody(recoverSchema, await request.json().catch(() => ({})));
  if (!validation.success) {
    return NextResponse.json({ error: "Email no válido" }, { status: 400 });
  }
  const email = validation.data.email.toLowerCase();

  try {
    const books = await prisma.book.findMany({
      where: {
        pages: { some: {} },
        OR: [
          { leadEmail: email },
          { user: { email } },
          { user: { payments: { some: { customerEmail: { equals: email, mode: "insensitive" } } } } },
          { printOrders: { some: { email: { equals: email, mode: "insensitive" } } } },
        ],
      },
      select: { id: true, title: true, kidName: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    await sendRecoverEmail({
      to: email,
      books: books.map((b) => ({ id: b.id, title: b.title || `El cuento de ${b.kidName}` })),
    });
    log.info({ found: books.length }, "Recuperación de cuentos enviada");
  } catch (error) {
    log.error({ err: error }, "Error recuperando cuentos");
  }
  return NextResponse.json({ sent: true });
}
