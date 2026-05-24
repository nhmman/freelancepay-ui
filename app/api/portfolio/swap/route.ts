import { NextRequest, NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

export async function POST(req: NextRequest) {
  try {
    const { amount, tokenIn, tokenOut } = await req.json();

    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    const result = await kit.swap({
      from: {
        adapter,
        chain: "Arc_Testnet",
        address: process.env.ESCROW_WALLET_ADDRESS!,
      },
      tokenIn,
      tokenOut,
      amountIn: amount,
      config: {
        kitKey: process.env.KIT_KEY as string,
      },
    });

    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      tokenIn: result.tokenIn,
      tokenOut: result.tokenOut,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
