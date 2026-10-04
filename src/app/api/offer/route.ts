import { NextResponse } from "next/server";
import { getFounderState } from "@/lib/offer";
import { publicCampaign } from "@/lib/campaigns";

export const dynamic = "force-dynamic";

// GET /api/offer - Precio fundador (contador real) y campaña de temporada activa
export async function GET() {
  const campaign = publicCampaign();
  try {
    const founder = await getFounderState();
    return NextResponse.json(
      { founder, campaign },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  } catch {
    return NextResponse.json({ founder: { active: false, remaining: 0, percent: 0 }, campaign });
  }
}
