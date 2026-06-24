import { NextRequest, NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

export async function POST(req: NextRequest) {
  try {
    const { recipientWallet, amount, message, handle } = await req.json();

    if (!recipientWallet || !amount) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    const safeAmount = Math.min(parseFloat(amount), 5).toFixed(2);

    const result = await kit.send({
      from: {
        adapter,
        chain: "Arc_Testnet",
        address: process.env.ESCROW_WALLET_ADDRESS!,
      },
      to: recipientWallet,
      amount: safeAmount,
      token: "USDC",
    });

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      explorerUrl: `https://testnet.arcscan.app/tx/${result.txHash}`,
      amount: safeAmount,
      handle,
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
