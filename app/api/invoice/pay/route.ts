import { NextRequest, NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();

    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    const result = await kit.send({
      from: {
        adapter,
        chain: "Arc_Testnet",
        address: process.env.ESCROW_WALLET_ADDRESS!,
      },
      to: process.env.FREELANCER_WALLET_ADDRESS!,
      amount: parseFloat(amount) > 10 ? "1.00" : amount, // testnet safety cap
      token: "USDC",
    });

    return NextResponse.json({ success: true, txHash: result.txHash });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
