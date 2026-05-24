import { NextRequest, NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

const processService = (serviceId: string, input: string): string => {
  switch (serviceId) {
    case "translate":
      return "Hello, I am a Vietnamese freelancer";
    case "analyze":
      return "Trend: +40% growth. Peak: April (140). Dip: March (95). Avg: 113.75/month.";
    case "review":
      return "Score: 85/100. Clean code. Suggestion: add input validation for type safety.";
    default:
      return "Service processed successfully.";
  }
};

export async function POST(req: NextRequest) {
  try {
    const { serviceId, input, amount } = await req.json();

    const adapter = createCircleWalletsAdapter({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
    });

    const paymentResult = await kit.send({
      from: {
        adapter,
        chain: "Arc_Testnet",
        address: process.env.ESCROW_WALLET_ADDRESS!,
      },
      to: process.env.FREELANCER_WALLET_ADDRESS!,
      amount: amount,
      token: "USDC",
    });

    const result = processService(serviceId, input);

    return NextResponse.json({
      success: true,
      txHash: paymentResult.txHash,
      result,
      amountPaid: amount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
