// lib/memo.ts
// Memo-ready payment helper for Arc Testnet (v0.7.2+)
//
// Arc v0.7.2 (activates 2026-06-18 12:00 UTC) adds a predeployed "Memo"
// transaction-extension contract. It lets you attach an on-chain payment
// reference (invoice id, order id, note) to a transfer while preserving
// the original msg.sender via the CallFrom precompile.
//
// STATUS: Until the official Memo contract address + ABI are published,
// MEMO_ENABLED stays false and buildTransfer() falls back to a normal
// USDC transfer. The app keeps working exactly as today.
//
// TO ACTIVATE (after 2026-06-18, once docs publish the address + ABI):
//   1) set MEMO_ADDRESS to the real Memo contract address
//   2) confirm MEMO_ABI matches the published interface
//   3) set MEMO_ENABLED = true

import { encodeFunctionData, parseUnits, type Address } from "viem";

export const USDC: Address = "0x3600000000000000000000000000000000000000";

export const USDC_ABI = [
  { name: "transfer", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
] as const;

// ── Memo contract (FILL IN AFTER 2026-06-18) ──
export const MEMO_ENABLED = false;
export const MEMO_ADDRESS: Address = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";

export const MEMO_ABI = [
  { name: "callWithMemo", type: "function", stateMutability: "payable",
    inputs: [
      { name: "memo", type: "bytes" },
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [{ name: "result", type: "bytes" }] },
] as const;

// ── Memo validation ──
export const MEMO_MAX_BYTES = 120;

export function memoByteLength(memo: string): number {
  return new TextEncoder().encode(memo).length;
}

export function validateMemo(memo: string): { ok: boolean; reason?: string } {
  const trimmed = memo.trim();
  if (trimmed.length === 0) return { ok: true };
  const bytes = memoByteLength(trimmed);
  if (bytes > MEMO_MAX_BYTES) {
    return { ok: false, reason: `Memo too long (${bytes}/${MEMO_MAX_BYTES} bytes)` };
  }
  return { ok: true };
}

function memoToHex(memo: string): `0x${string}` {
  const bytes = new TextEncoder().encode(memo.trim());
  let hex = "0x";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex as `0x${string}`;
}

// ── The one call the UI uses ──
export function buildTransfer(opts: {
  to: Address;
  amountUsdc: string;
  memo?: string;
}) {
  const amount = parseUnits(opts.amountUsdc, 6);
  const memo = (opts.memo ?? "").trim();

  if (!memo || !MEMO_ENABLED) {
    return {
      address: USDC,
      abi: USDC_ABI,
      functionName: "transfer" as const,
      args: [opts.to, amount] as const,
      gas: BigInt(120000),
    };
  }

  const innerData = encodeFunctionData({
    abi: USDC_ABI,
    functionName: "transfer",
    args: [opts.to, amount],
  });

  return {
    address: MEMO_ADDRESS,
    abi: MEMO_ABI,
    functionName: "callWithMemo" as const,
    args: [memoToHex(memo), USDC, innerData] as const,
    gas: BigInt(200000),
  };
}
