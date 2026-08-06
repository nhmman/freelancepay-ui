import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

// Canonical ERC-8004 ReputationRegistry (ERC-1967 proxy, getVersion() == "2.0.0").
// Source: github.com/erc-8004/erc-8004-contracts — contracts/ReputationRegistryUpgradeable.sol
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713" as const;

const ABI = [
  {
    type: "function", name: "getClients", stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function", name: "getSummary", stateMutability: "view",
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
    ],
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" },
    ],
  },
] as const;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(process.env.ARC_RPC_URL),
});

// getSummary loops every feedback of every client passed in, so a client with a
// large history can exceed the RPC's eth_call gas cap. Bisect on revert and skip
// the individual clients that can't be summarised, rather than failing the agent.
const CHUNK = 25;
const MAX_CALLS = 60;
// Hard latency bound: an agent with thousands of clients would otherwise run past
// the serverless function timeout. Past the deadline we return what we have.
const DEADLINE_MS = 8000;

type Acc = { weighted: number; count: number; skipped: number; calls: number; deadline: number };

const outOfBudget = (acc: Acc) => acc.calls >= MAX_CALLS || Date.now() > acc.deadline;

async function summarise(agentId: bigint, clients: readonly `0x${string}`[], acc: Acc): Promise<void> {
  if (clients.length === 0 || outOfBudget(acc)) return;

  try {
    acc.calls++;
    const [count, value, decimals] = await publicClient.readContract({
      address: REPUTATION_REGISTRY, abi: ABI, functionName: "getSummary",
      args: [agentId, clients as `0x${string}`[], "", ""],
    });
    if (count > BigInt(0)) {
      // summaryValue is a signed fixed-point number scaled by summaryValueDecimals.
      acc.weighted += (Number(value) / 10 ** decimals) * Number(count);
      acc.count += Number(count);
    }
  } catch {
    if (clients.length === 1) {
      acc.skipped++;                      // single client too expensive to read
      return;
    }
    const mid = Math.ceil(clients.length / 2);
    await summarise(agentId, clients.slice(0, mid), acc);
    await summarise(agentId, clients.slice(mid), acc);
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("agentId");
  if (raw === null || !/^\d+$/.test(raw)) {
    return NextResponse.json(
      { success: false, error: "agentId must be a non-negative integer" },
      { status: 400 },
    );
  }
  const agentId = BigInt(raw);

  try {
    const clients = await publicClient.readContract({
      address: REPUTATION_REGISTRY, abi: ABI, functionName: "getClients", args: [agentId],
    });

    if (clients.length === 0) {
      return NextResponse.json({
        success: true, agentId: raw, score: null, feedbackCount: 0, source: "none",
      });
    }

    const acc: Acc = {
      weighted: 0, count: 0, skipped: 0, calls: 0, deadline: Date.now() + DEADLINE_MS,
    };
    for (let i = 0; i < clients.length && !outOfBudget(acc); i += CHUNK) {
      await summarise(agentId, clients.slice(i, i + CHUNK), acc);
    }

    if (acc.count === 0) {
      return NextResponse.json({
        success: true, agentId: raw, score: null, feedbackCount: 0,
        source: acc.skipped > 0 ? "unavailable" : "none",
      });
    }

    return NextResponse.json({
      success: true,
      agentId: raw,
      score: Math.round((acc.weighted / acc.count) * 100) / 100,
      feedbackCount: acc.count,
      clientCount: clients.length,
      source: "on-chain",
      registry: REPUTATION_REGISTRY,
      // true when some clients were skipped or the call/time budget ran out, so
      // the score is an average over part of the feedback rather than all of it.
      partial: acc.skipped > 0 || outOfBudget(acc),
    });
  } catch (err: any) {
    // RPC unreachable / rate limited — degrade instead of breaking the page.
    return NextResponse.json({
      success: true, agentId: raw, score: null, feedbackCount: 0,
      source: "unavailable", error: err?.shortMessage || err?.message,
    });
  }
}
