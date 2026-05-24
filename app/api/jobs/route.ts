import { NextRequest, NextResponse } from "next/server";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { createPublicClient, http, keccak256, toHex, decodeEventLog, type Address, type Hex } from "viem";
import { arcTestnet } from "viem/chains";

const AGENTIC_COMMERCE_CONTRACT = "0x0747EEf0706327138c69792bF28Cd525089e4583" as Address;

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });

const ABI = [{
  type: "event", name: "JobCreated",
  inputs: [
    { indexed: true, name: "jobId", type: "uint256" },
    { indexed: true, name: "client", type: "address" },
    { indexed: true, name: "provider", type: "address" },
    { indexed: false, name: "evaluator", type: "address" },
    { indexed: false, name: "expiredAt", type: "uint256" },
    { indexed: false, name: "hook", type: "address" },
  ],
}] as const;

async function waitTx(txId: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const tx = await circleClient.getTransaction({ id: txId });
    const data = tx.data?.transaction;
    if (data?.state === "COMPLETE" && data.txHash) return data.txHash;
    if (data?.state === "FAILED") throw new Error("Transaction failed");
  }
  throw new Error("Transaction timed out");
}

export async function POST(req: NextRequest) {
  try {
    const { description, budget } = await req.json();

    const expiredAt = Math.floor(Date.now() / 1000) + 3600;

    const createTx = await circleClient.createContractExecutionTransaction({
      walletAddress: process.env.ESCROW_WALLET_ADDRESS!,
      blockchain: "ARC-TESTNET",
      contractAddress: AGENTIC_COMMERCE_CONTRACT,
      abiFunctionSignature: "createJob(address,address,uint256,string,address)",
      abiParameters: [
        process.env.FREELANCER_WALLET_ADDRESS!,
        process.env.ESCROW_WALLET_ADDRESS!,
        expiredAt.toString(),
        description,
        "0x0000000000000000000000000000000000000000",
      ],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
    });

    const txHash = await waitTx(createTx.data?.id!) as Hex;

    // Extract jobId from event
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    let jobId = "0";
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === "JobCreated") {
          jobId = decoded.args.jobId.toString();
          break;
        }
      } catch { continue; }
    }

    const job = {
      id: Date.now().toString(),
      jobId,
      description,
      budget,
      status: "Open",
      txHashes: { create: txHash },
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
