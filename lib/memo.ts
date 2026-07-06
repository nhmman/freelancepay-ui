// lib/memo.ts
// Transaction Memo integration — Arc v0.7.2
// Official docs: https://docs.arc.io/arc/concepts/transaction-memos

import { type Address, encodeFunctionData, keccak256, toHex, stringToBytes } from "viem";

export const MEMO_ENABLED = true;
export const MEMO_ADDRESS: Address = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";
export const USDC_ADDRESS: Address = "0x3600000000000000000000000000000000000000";

// Official Memo contract ABI
export const MEMO_ABI = [
  {
    name: "memo",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "Memo",
    type: "event",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "callDataHash", type: "bytes32", indexed: false },
      { name: "memoId", type: "bytes32", indexed: true },
      { name: "memo", type: "bytes", indexed: false },
      { name: "memoIndex", type: "uint256", indexed: false },
    ],
  },
] as const;

// USDC transfer ABI (target call to be wrapped)
const USDC_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export function memoByteLength(memo: string): number {
  return new TextEncoder().encode(memo).length;
}

export function validateMemo(memo: string): { ok: boolean; reason?: string } {
  const trimmed = memo.trim();
  if (!trimmed) return { ok: true };
  const bytes = memoByteLength(trimmed);
  if (bytes > 200) {
    return { ok: false, reason: `Memo too long (${bytes}/200 bytes)` };
  }
  return { ok: true };
}

/**
 * Build the params for calling Memo.memo() to send USDC with a memo attached.
 * Returns the args ready for writeContract({ address: MEMO_ADDRESS, abi: MEMO_ABI, functionName: "memo", args })
 */
export function buildMemoTransfer(opts: {
  to: Address;
  amountRaw: bigint; // USDC amount in 6-decimal raw units
  memo?: string;
}) {
  const memoText = (opts.memo ?? "").trim();

  // Encode the inner USDC transfer(to, amount) call
  const transferData = encodeFunctionData({
    abi: USDC_TRANSFER_ABI,
    functionName: "transfer",
    args: [opts.to, opts.amountRaw],
  });

  // memoId: unique id per memo call — hash of recipient + timestamp
  const memoId = keccak256(
    toHex(`${opts.to}-${Date.now()}-${Math.random()}`)
  );

  // memoData: the actual note text, encoded as bytes
  const memoData = memoText ? toHex(stringToBytes(memoText)) : "0x";

  return {
    address: MEMO_ADDRESS,
    abi: MEMO_ABI,
    functionName: "memo" as const,
    args: [USDC_ADDRESS, transferData, memoId, memoData] as const,
  };
}
