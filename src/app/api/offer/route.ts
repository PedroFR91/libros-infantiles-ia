import { NextResponse } from "next/server";
import { getFounderState } from "@/lib/offer";

export const dynamic = "force-dynamic";

// GET /api/offer - Estado del precio fundador (contador real) para la landing
export async function GET() {
  try {
    const founder = await getFounderState();
    return NextResponse.json(
      { founder },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  } catch {
    return NextResponse.json({ founder: { active: false, remaining: 0, percent: 0 } });
  }
}
