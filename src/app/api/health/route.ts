import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStorageMode } from "@/lib/imageStorage";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check database
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "ok", latency: Date.now() - dbStart };
  } catch {
    checks.database = { status: "error" };
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      storage: getStorageMode(),
      checks,
      latency: Date.now() - start,
    },
    { status: allOk ? 200 : 503 },
  );
}
