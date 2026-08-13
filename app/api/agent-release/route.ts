// Agent watcher — tự gọi TimelockEscrow.release() cho các escrow đã được duyệt.
//
// Vì sao ví agent phải là depositor: release() chỉ nhận depositor trước deadline
// (hoặc bất kỳ ai sau deadline). Không redeploy contract cho MVP này, nên agent tự
// fund escrow. Xem lib/timelockEscrow.ts.
//
// Ví ký là private key trong env cho bản MVP. Đường production là mở rộng phần Circle
// Developer-Controlled Wallets ĐÃ tích hợp ở app/api/milestones/release/route.ts từ
// chuyển token sang gọi hàm contract.
//
// Trigger: GitHub Actions cron (Vercel Hobby chỉ cho cron 1 lần/ngày nên không dùng
// được). Route là POST và đòi CRON_SECRET — nếu không chặn thì bất kỳ ai cũng gọi được
// lệnh giải ngân.
import { type NextRequest } from "next/server";
import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { arcTestnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { TIMELOCK_ADDRESS, TIMELOCK_ABI } from "../../../lib/timelockEscrow";
// Service role client (bypass RLS) thay cho anon client. Route này đã chặn bằng
// CRON_SECRET nên là chỗ an toàn nhất để đi trước trong đợt refactor RLS.
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Chờ receipt tốn vài giây; mặc định 10s của Hobby là quá ngắn.
export const maxDuration = 60;

// Status enum on-chain của TimelockEscrow (đọc từ bytecode trong lib/timelockEscrow.ts):
// 0 = None, 1 = Funded, 2 = Released, 3 = Refunded.
const CHAIN_FUNDED = 1;
const CHAIN_RELEASED = 2;

// Giới hạn mỗi lần chạy để không vượt maxDuration. Còn sót thì lần cron sau xử lý.
const MAX_PER_RUN = 5;

const RELEASED_EVENT = parseAbiItem("event EscrowReleased(uint256 indexed id, address indexed by)");

// Cửa sổ tìm lại tx hash cho đường tự chữa. KHÔNG dùng fromBlock "earliest": chain đã
// hơn 54 triệu block và RPC từ chối thẳng range đó. Arc block rất nhanh nên 5000 block
// ~ hơn một tiếng, thừa sức phủ khoảng cách giữa lần ghi DB fail và lần cron kế tiếp.
// Nếu để lệch lâu hơn thế thì mất link tx, nhưng status vẫn được chữa đúng.
// BigInt(...) chứ không phải literal 5000n: tsconfig target là ES2017 nên literal BigInt
// bị tsc từ chối — cùng lý do code sẵn có luôn viết BigInt(...).
const HEAL_LOOKBACK_BLOCKS = BigInt(5000);

type Result =
  | "released"              // agent ký tx thành công + DB đã cập nhật
  | "synced_already_onchain" // on-chain đã Released từ trước, chỉ chữa lại DB
  | "skipped"               // chưa đủ điều kiện, không phải lỗi
  | "failed"                // không release được, DB không đổi
  | "DB_SYNC_FAILED_AFTER_TX"; // tx ĐÃ thành công nhưng ghi DB thất bại — nguy hiểm

type Outcome = { id: string; payment_id: number | null; result: Result; tx_hash?: string; detail?: string };

export async function POST(request: NextRequest) {
  // ── Chặn route ──────────────────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Fail closed. Thiếu secret thì thà không chạy còn hơn chạy mà không ai chặn.
    return Response.json({ ok: false, error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rawKey = process.env.AGENT_PRIVATE_KEY;
  if (!rawKey) {
    return Response.json({ ok: false, error: "AGENT_PRIVATE_KEY is not configured" }, { status: 500 });
  }

  let account;
  try {
    account = privateKeyToAccount(rawKey.startsWith("0x") ? (rawKey as `0x${string}`) : (`0x${rawKey}` as `0x${string}`));
  } catch {
    // Không log key, chỉ nói là parse fail.
    return Response.json({ ok: false, error: "AGENT_PRIVATE_KEY is malformed" }, { status: 500 });
  }

  // Dựng sau lớp chặn ở trên: thiếu key thì báo rõ, cùng kiểu fail-closed như
  // CRON_SECRET/AGENT_PRIVATE_KEY chứ không ném stack trace ra ngoài.
  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Supabase admin client is not configured" }, { status: 500 });
  }

  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
  const walletClient = createWalletClient({ account, chain: arcTestnet, transport: http() });

  // ── Tìm escrow đến hạn ──────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const { data: due, error: queryError } = await supabase
    .from("escrow_agreements")
    .select("id, payment_id, amount_usdc, beneficiary_address, agent_release_at")
    .eq("agent_auto_release", true)
    .eq("status", "APPROVED")
    .lte("agent_release_at", nowIso)
    .order("agent_release_at", { ascending: true })
    .limit(MAX_PER_RUN);

  if (queryError) {
    return Response.json(
      { ok: false, error: `Could not query escrows that are due: ${queryError.message}` },
      { status: 500 },
    );
  }

  const rows = due ?? [];
  if (rows.length === 0) {
    return Response.json({ ok: true, agent: account.address, checked_at: nowIso, processed: 0, outcomes: [] });
  }

  const outcomes: Outcome[] = [];

  for (const row of rows) {
    const paymentId = row.payment_id as number | null;
    if (paymentId === null || paymentId === undefined) {
      // Escrow được duyệt mà chưa từng fund on-chain — không có gì để release.
      outcomes.push({ id: row.id, payment_id: null, result: "failed", detail: "payment_id is empty — this escrow was never funded on-chain" });
      continue;
    }

    // ── Tiền kiểm on-chain ────────────────────────────────────────────────────
    // Đọc trước để: (a) biến revert mù thành thông báo rõ, (b) nếu tx của lần chạy
    // trước đã thành công mà ghi DB fail thì lần này chỉ chữa DB, không gửi tx thứ hai.
    let onChain;
    try {
      onChain = await publicClient.readContract({
        address: TIMELOCK_ADDRESS, abi: TIMELOCK_ABI, functionName: "escrows", args: [BigInt(paymentId)],
      }) as readonly [string, string, bigint, bigint, number];
    } catch (e: any) {
      outcomes.push({ id: row.id, payment_id: paymentId, result: "failed", detail: `Failed to read the escrow on-chain: ${e?.shortMessage || e?.message || "unknown"}` });
      continue;
    }

    const [depositor, , , , chainStatus] = onChain;

    if (Number(chainStatus) === CHAIN_RELEASED) {
      // On-chain xong rồi, DB tụt lại. Chữa DB, không gửi tx.
      //
      // Trong đúng ca này (tx thành công nhưng ghi DB fail) thì tx hash đã mất theo
      // lần chạy trước, nên tìm lại từ event EscrowReleased — không có nó thì escrow
      // hiện là RELEASED mà không có link tx nào trên UI, mất luôn dấu vết on-chain.
      // Tìm không ra cũng không sao: vẫn chữa status, chỉ thiếu link.
      // RPC public của Arc fail lẻ tẻ nên thử lại vài lần; đây là phần "cho thêm",
      // không được phép làm fail việc chữa status.
      let healedHash: string | undefined;
      for (let attempt = 0; attempt < 3 && !healedHash; attempt++) {
        try {
          const head = await publicClient.getBlockNumber();
          const logs = await publicClient.getLogs({
            address: TIMELOCK_ADDRESS, event: RELEASED_EVENT, args: { id: BigInt(paymentId) },
            fromBlock: head > HEAL_LOOKBACK_BLOCKS ? head - HEAL_LOOKBACK_BLOCKS : BigInt(0),
            toBlock: head,
          });
          healedHash = logs.at(-1)?.transactionHash;
        } catch {
          // thử lại
        }
      }

      const { error: syncErr } = await supabase.from("escrow_agreements")
        .update({
          status: "RELEASED",
          updated_at: new Date().toISOString(),
          ...(healedHash ? { tx_hash_release: healedHash } : {}),
        })
        .eq("id", row.id);
      outcomes.push(syncErr
        ? { id: row.id, payment_id: paymentId, result: "DB_SYNC_FAILED_AFTER_TX", detail: `Already Released on-chain but the database write still failed: ${syncErr.message}` }
        : { id: row.id, payment_id: paymentId, result: "synced_already_onchain", tx_hash: healedHash,
            detail: healedHash
              ? "Already Released on-chain; database re-synced and the tx hash recovered from the event"
              : "Already Released on-chain; database re-synced, but the tx hash could not be recovered (RPC failure) — the escrow status is correct, only the tx link is missing" });
      continue;
    }

    if (Number(chainStatus) !== CHAIN_FUNDED) {
      outcomes.push({ id: row.id, payment_id: paymentId, result: "failed", detail: `On-chain status = ${Number(chainStatus)} (expected ${CHAIN_FUNDED}=Funded). It may have been refunded.` });
      continue;
    }

    if (depositor.toLowerCase() !== account.address.toLowerCase()) {
      // Nguyên nhân hay gặp nhất: escrow do ví khác fund. release() sẽ revert.
      // Nói thẳng ra thay vì để tốn gas rồi nhận lỗi mù.
      outcomes.push({
        id: row.id, payment_id: paymentId, result: "failed",
        detail: `The agent wallet (${account.address}) is not this escrow's depositor (${depositor}). release() only accepts the depositor before the deadline — this escrow must be funded by the agent wallet itself.`,
      });
      continue;
    }

    // ── Ký và gửi ─────────────────────────────────────────────────────────────
    let txHash: `0x${string}`;
    try {
      txHash = await walletClient.writeContract({
        address: TIMELOCK_ADDRESS, abi: TIMELOCK_ABI, functionName: "release", args: [BigInt(paymentId)],
      });
    } catch (e: any) {
      outcomes.push({ id: row.id, payment_id: paymentId, result: "failed", detail: `Sending release() failed: ${e?.shortMessage || e?.message || "unknown"}` });
      continue;
    }

    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        outcomes.push({ id: row.id, payment_id: paymentId, result: "failed", tx_hash: txHash, detail: "Tx reverted on-chain; the database stays at APPROVED" });
        continue;
      }
    } catch (e: any) {
      // Không rõ tx thành công hay chưa → KHÔNG ghi DB. Lần chạy sau tiền kiểm sẽ
      // thấy status on-chain và tự chữa, nên không có nguy cơ trả tiền hai lần.
      outcomes.push({ id: row.id, payment_id: paymentId, result: "failed", tx_hash: txHash, detail: `Could not fetch the receipt: ${e?.shortMessage || e?.message || "unknown"}. The next run will reconcile against on-chain state.` });
      continue;
    }

    const { error: updateErr } = await supabase.from("escrow_agreements")
      .update({ status: "RELEASED", tx_hash_release: txHash, updated_at: new Date().toISOString() })
      .eq("id", row.id);

    if (updateErr) {
      // Đúng cái bug đã gặp với Supabase trước đây: tx on-chain là FINAL, tiền đã
      // chuyển. Không được im lặng. Kêu to để run của GitHub Actions đỏ lên.
      outcomes.push({
        id: row.id, payment_id: paymentId, result: "DB_SYNC_FAILED_AFTER_TX", tx_hash: txHash,
        detail: `The release tx SUCCEEDED and is FINAL (${txHash}) but the database write failed: ${updateErr.message}. Do NOT re-run release — the funds already moved. The next run will re-sync the database.`,
      });
      continue;
    }

    outcomes.push({ id: row.id, payment_id: paymentId, result: "released", tx_hash: txHash });
  }

  const bad = outcomes.filter(o => o.result === "failed" || o.result === "DB_SYNC_FAILED_AFTER_TX");
  const body = {
    ok: bad.length === 0,
    agent: account.address,
    checked_at: nowIso,
    processed: outcomes.length,
    released: outcomes.filter(o => o.result === "released").length,
    outcomes,
  };
  // Trả 500 khi có cái nào lỗi, để cron run đỏ lên chứ không lẳng lặng 200.
  return Response.json(body, { status: bad.length === 0 ? 200 : 500 });
}
