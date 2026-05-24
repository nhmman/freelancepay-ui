import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  // Simulated on-chain reputation lookup
  const scores: Record<string, number> = {
    "15994": 95,
    "1": 30,
    "100": 65,
  };
  const score = scores[agentId || ""] ?? Math.floor(Math.random() * 100);
  return NextResponse.json({ success: true, agentId, score });
}
