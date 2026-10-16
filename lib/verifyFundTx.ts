// Kiểm một tx fund() của TimelockEscrow V1 trên chain, phía server, trước khi ghi FUNDED.
//
// Lý do tồn tại: trước đây /api/escrow/sync tin nguyên payment_id + tx_hash_fund do client
// gửi lên. Dòng ee4a2e3f… bị ghi FUNDED với payment_id 17 trong khi tx fund của nó REVERT
// (block 55652747, status 0x0) — client không kiểm receipt.status và lấy id từ nonce() đọc
// trước. Hàm này lấy id từ event EscrowFunded trong receipt, không từ client.
//
// Chỉ đọc chain, không ký gì. `import "server-only"` để file này không bị kéo vào bundle client.
import "server-only";
import { createPublicClient, http, parseEventLogs } from "viem";
import { arcTestnet } from "viem/chains";
import { TIMELOCK_ABI } from "./timelockEscrow";

export type FundExpectation = {
  contract: string;
  chainId: number;
  depositor: string;
  beneficiary: string;
  amountUnits: bigint; // USDC 6 decimals — người gọi đổi bằng parseUnits(String(amount), 6)
};

export type VerifyFundResult =
  | { ok: true; paymentId: number }
  | { ok: false; reason: string; retryable: boolean };

// Chỉ chain đã có RPC trong app. Chain khác (vd mainnet 5042) bị từ chối thay vì đoán RPC.
const RPC_BY_CHAIN: Record<number, string> = {
  5042002: "https://rpc.testnet.arc.network",
};

const lower = (s: string) => s.toLowerCase();

export async function verifyFundTx(txHash: `0x${string}`, expected: FundExpectation): Promise<VerifyFundResult> {
  const rpc = RPC_BY_CHAIN[expected.chainId];
  if (!rpc) {
    return { ok: false, reason: `no RPC configured for chain ${expected.chainId}`, retryable: false };
  }
  const client = createPublicClient({ chain: arcTestnet, transport: http(rpc) });

  let receipt;
  try {
    const rpcChainId = await client.getChainId();
    if (rpcChainId !== expected.chainId) {
      return { ok: false, reason: `RPC chain ${rpcChainId} does not match expected chain ${expected.chainId}`, retryable: false };
    }
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (e) {
    // viem ném TransactionReceiptNotFoundError khi RPC trả null. Null KHÔNG có nghĩa là tx
    // không tồn tại: RPC Arc testnet từng trả null rồi vài giờ sau trả đủ cho cùng một hash.
    const msg = e instanceof Error ? e.message.split("\n")[0] : "unknown RPC error";
    return { ok: false, reason: `receipt not available yet: ${msg}`, retryable: true };
  }
  if (!receipt) {
    return { ok: false, reason: "receipt not available yet", retryable: true };
  }

  if (receipt.status !== "success") {
    return { ok: false, reason: `transaction status is ${receipt.status}, not success`, retryable: false };
  }
  if (!receipt.to || lower(receipt.to) !== lower(expected.contract)) {
    return { ok: false, reason: `transaction was sent to ${receipt.to ?? "null"}, not ${expected.contract}`, retryable: false };
  }

  const funded = parseEventLogs({ abi: TIMELOCK_ABI, eventName: "EscrowFunded", logs: receipt.logs })
    .filter(l => lower(l.address) === lower(expected.contract));
  if (funded.length !== 1) {
    return { ok: false, reason: `expected exactly 1 EscrowFunded log from ${expected.contract}, found ${funded.length}`, retryable: false };
  }
  const { id, depositor, beneficiary, amount } = funded[0].args;

  const mismatched: string[] = [];
  if (lower(depositor) !== lower(expected.depositor)) mismatched.push(`depositor (chain ${depositor})`);
  if (lower(beneficiary) !== lower(expected.beneficiary)) mismatched.push(`beneficiary (chain ${beneficiary})`);
  if (amount !== expected.amountUnits) mismatched.push(`amount (chain ${amount.toString()} units, expected ${expected.amountUnits.toString()})`);
  if (mismatched.length > 0) {
    return { ok: false, reason: `EscrowFunded does not match this escrow: ${mismatched.join(", ")}`, retryable: false };
  }

  if (id > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { ok: false, reason: `escrow id ${id.toString()} exceeds Number.MAX_SAFE_INTEGER`, retryable: false };
  }
  return { ok: true, paymentId: Number(id) };
}
