import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron-fix-stuck");

// GET /api/cron/fix-stuck-books
// Protected by CRON_SECRET to prevent unauthorized access
// Call every 10 minutes via external cron: curl -H "Authorization: Bearer $CRON_SECRET" https://yourdomain/api/cron/fix-stuck-books
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

    if (stuckBooks.length === 0) {
      return NextResponse.json({ fixed: 0, message: "No stuck books found" });
    }

    // Reset them to ERROR state
    const result = await prisma.book.updateMany({
      where: {
        id: { in: stuckBooks.map((b: { id: string }) => b.id) },
        status: "GENERATING",
      },
      data: { status: "ERROR" },
    });

    log.info(
      {
        count: result.count,
        bookIds: stuckBooks.map((b: { id: string }) => b.id),
      },
      "Fixed stuck books",
    );

    return NextResponse.json({
      fixed: result.count,
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
