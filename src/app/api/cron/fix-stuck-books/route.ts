import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { refundCredits } from "@/lib/credits";
import { sendDraftReminderEmail } from "@/lib/email";
import { isRunning } from "@/lib/generation";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron-fix-stuck");

// GET /api/cron/fix-stuck-books
// Protected by CRON_SECRET to prevent unauthorized access
// Call every 10 minutes via external cron: curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain/api/cron/fix-stuck-books
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    log.error("CRON_SECRET no configurado: endpoint deshabilitado");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find books stuck in GENERATING state for > 15 minutes
    const stuckBooks = await prisma.book.findMany({
      where: {
        status: "GENERATING",
        updatedAt: { lt: fifteenMinutesAgo },
      },
      select: { id: true, kidName: true, updatedAt: true },
    });

    const reminders = await sendDraftReminders();

    if (stuckBooks.length === 0) {
      return NextResponse.json({
        fixed: 0,
        reminders,
        message: "No stuck books found",
      });
    }

    // Pasar a ERROR y devolver los créditos de la generación interrumpida
    // (p. ej. reinicio del contenedor a mitad), para que el usuario pueda
    // reintentar sin pagar dos veces.
    let fixed = 0;
    let refunded = 0;
    for (const stuck of stuckBooks) {
      // Sigue generándose en este proceso (OpenAI lento): no tocarlo
      if (isRunning(stuck.id)) continue;
      const claimed = await prisma.book.updateMany({
        where: { id: stuck.id, status: "GENERATING" },
        data: { status: "ERROR" },
      });
      if (claimed.count === 0) continue;
      fixed++;

      const charge = await prisma.creditLedger.findFirst({
        where: { referenceId: stuck.id, reason: "book_generation" },
        orderBy: { createdAt: "desc" },
      });
      if (!charge) continue;

      const alreadyRefunded = await prisma.creditLedger.findFirst({
        where: {
          referenceId: stuck.id,
          reason: "refund",
          createdAt: { gt: charge.createdAt },
        },
      });
      if (alreadyRefunded) continue;

      await refundCredits(charge.userId, -charge.amount, stuck.id);
      refunded++;
    }

    log.info(
      {
        fixed,
        refunded,
        bookIds: stuckBooks.map((b: { id: string }) => b.id),
      },
      "Fixed stuck books",
    );

    return NextResponse.json({
      fixed,
      refunded,
      reminders,
      books: stuckBooks.map(
        (b: { id: string; kidName: string; updatedAt: Date }) => ({
          id: b.id,
          kidName: b.kidName,
          stuckSince: b.updatedAt,
        }),
      ),
    });
  } catch (error) {
    log.error({ err: error }, "Error fixing stuck books");
    return NextResponse.json(
      { error: "Error fixing stuck books" },
      { status: 500 },
    );
  }
}

// Borradores sin desbloquear de hace 24-72 h con email conocido: un único
// recordatorio con la portada de muestra
async function sendDraftReminders(): Promise<number> {
  const now = Date.now();
  const drafts = await prisma.book.findMany({
    where: {
      status: "DRAFT",
      unlockedAt: null,
      reminderSentAt: null,
      createdAt: {
        lt: new Date(now - 24 * 60 * 60 * 1000),
        gt: new Date(now - 72 * 60 * 60 * 1000),
      },
      OR: [{ leadEmail: { not: null } }, { user: { email: { not: null } } }],
    },
    include: { user: { select: { email: true } } },
    take: 50,
  });

  let sent = 0;
  for (const draft of drafts) {
    const to = draft.leadEmail ?? draft.user.email;
    if (!to) continue;
    // Marcar antes de enviar: ante un fallo es mejor no enviar que enviar dos veces
    await prisma.book.update({
      where: { id: draft.id },
      data: { reminderSentAt: new Date() },
    });
    const ok = await sendDraftReminderEmail({
      to,
      kidName: draft.kidName,
      title: draft.title || `El libro de ${draft.kidName}`,
      bookId: draft.id,
      coverUrl: draft.coverPreviewUrl,
    });
    if (ok) sent++;
  }
  if (sent > 0) log.info({ sent }, "Recordatorios de borrador enviados");
  return sent;
}
