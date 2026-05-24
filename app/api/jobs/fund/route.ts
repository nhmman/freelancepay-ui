import { NextRequest, NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { parseUnits, type Address } from "viem";

const AGENTIC_COMMERCE_CONTRACT = "0x0747EEf0706327138c69792bF28Cd525089e4583" as Address;
const USDC_CONTRACT = "0x3600000000000000000000000000000000000000" as Address;

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

async function waitTx(txId: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await circleClient.getTransaction({ id: txId });
    const data = tx.data?.transaction;
    if (data?.state === "COMPLETE" && data.txHash) return data.txHash;
    if (data?.state === "FAILED") throw new Error("Transaction failed");
  }
  throw new Error("Timed out");
}

export async function POST(req: NextRequest) {
  try {
    const { jobId, budget } = await req.json();
    const budgetWei = parseUnits(budget, 6).toString();

    // Approve USDC
    const approveTx = await circleClient.createContractExecutionTransaction({
      walletAddress: process.env.ESCROW_WALLET_ADDRESS!,
      blockchain: "ARC-TESTNET",
      contractAddress: USDC_CONTRACT,
      abiFunctionSignature: "approve(address,uint256)",
      abiParameters: [AGENTIC_COMMERCE_CONTRACT, budgetWei],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    await waitTx(approveTx.data?.id!);

    // setBudget
    const setBudgetTx = await circleClient.createContractExecutionTransaction({
      walletAddress: process.env.FREELANCER_WALLET_ADDRESS!,
      blockchain: "ARC-TESTNET",
      contractAddress: AGENTIC_COMMERCE_CONTRACT,
      abiFunctionSignature: "setBudget(uint256,uint256,bytes)",
      abiParameters: [jobId, budgetWei, "0x"],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    await waitTx(setBudgetTx.data?.id!);

    // Fund
    const fundTx = await circleClient.createContractExecutionTransaction({
      walletAddress: process.env.ESCROW_WALLET_ADDRESS!,
      blockchain: "ARC-TESTNET",
      contractAddress: AGENTIC_COMMERCE_CONTRACT,
      abiFunctionSignature: "fund(uint256,bytes)",
      abiParameters: [jobId, "0x"],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });
    const txHash = await waitTx(fundTx.data?.id!);

    return NextResponse.json({ success: true, txHash });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
