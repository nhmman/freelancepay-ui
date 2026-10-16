// Ghi trạng thái sau khi tx đã final on-chain — thay cho phần supabase.update() bên
// trong persistAfterTx() ở browser.
//
// ⚠️ Không xác thực người gọi, cùng lý do đã ghi ở app/api/escrow/create/route.ts.
// Route này không đòi chữ ký. Với FUNDED, route KHÔNG tin client: tự đọc receipt trên
// chain (lib/verifyFundTx.ts), đối chiếu với depositor/beneficiary/amount/contract/chain
// của chính dòng trong DB, và lấy payment_id từ event EscrowFunded. payment_id client gửi
// lên bị bỏ qua. RELEASED/REFUNDED vẫn chép lại tx hash client gửi, chưa kiểm on-chain.
//
// PHẢI idempotent: nút "Retry sync" trên trang escrow gọi lại đúng payload cũ sau khi
// lần ghi đầu fail, và lần fail đó có thể là mất response chứ không phải mất ghi. Gọi
// hai lần phải cho cùng một kết quả, không được đá ra lỗi làm người dùng tưởng tiền kẹt.
import { parseUnits } from "viem";
import { getSupabaseAdmin, SupabaseConfigError } from "../../../../lib/supabaseAdmin";
import { verifyFundTx } from "../../../../lib/verifyFundTx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
// Ba trạng thái này, và chỉ ba. Client gửi "APPROVED" vào đây thì bị chặn — approve có
// đường riêng và đường đó đòi chữ ký.
const ALLOWED = new Set(["FUNDED", "RELEASED", "REFUNDED"]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

  const fields = (body.fields ?? {}) as Record<string, unknown>;
  const status = typeof fields.status === "string" ? fields.status : "";
  if (!ALLOWED.has(status)) {
    return Response.json(
      { ok: false, error: "status must be one of FUNDED, RELEASED, REFUNDED" },
      { status: 400 },
    );
  }

  // Whitelist cột CỨNG: đọc từng field đã biết tên ra biến, rồi dựng update bằng tay.
  // KHÔNG spread `fields` — spread là để client tự chọn cột nào được ghi, tức là không
  // còn whitelist nữa.
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  // Cột dùng để nhận ra "đã ghi rồi" ở bước idempotent bên dưới.
  let hashColumn: "tx_hash_fund" | "tx_hash_release";
  let hashValue: string;

  // payment_id client gửi chỉ dùng để so với event và cảnh báo; KHÔNG ghi vào DB.
  let clientPaymentId: number | null = null;
  if (status === "FUNDED") {
    const txHashFund = typeof fields.tx_hash_fund === "string" ? fields.tx_hash_fund : "";
    if (!TX_HASH.test(txHashFund)) {
      return Response.json({ ok: false, error: "tx_hash_fund is not a tx hash" }, { status: 400 });
    }
    if (typeof fields.payment_id === "number" && Number.isInteger(fields.payment_id)) clientPaymentId = fields.payment_id;
    update.tx_hash_fund = txHashFund;
    hashColumn = "tx_hash_fund";
    hashValue = txHashFund;
  } else {
    const txHashRelease = typeof fields.tx_hash_release === "string" ? fields.tx_hash_release : "";
    if (!TX_HASH.test(txHashRelease)) {
      return Response.json({ ok: false, error: "tx_hash_release is not a tx hash" }, { status: 400 });
    }
    update.tx_hash_release = txHashRelease;
    hashColumn = "tx_hash_release";
    hashValue = txHashRelease;
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    const misconfigured = e instanceof SupabaseConfigError;
    return Response.json(
      {
        ok: false,
        error_kind: misconfigured ? "env_misconfigured" : "supabase_client_init_failed",
        variable: misconfigured ? e.variable : undefined,
        error: e instanceof Error ? e.message : "Supabase admin client could not be created",
      },
      { status: 500 },
    );
  }

  // FUNDED cần thêm các cột để đối chiếu với event on-chain.
  const fundColumns = status === "FUNDED"
    ? ", depositor_address, beneficiary_address, amount_usdc, contract_address, chain_id"
    : "";
  // Khai kiểu string: chuỗi ghép từ union làm parser kiểu của supabase-js báo ParserError.
  const selectColumns: string = `id, status, ${hashColumn}${fundColumns}`;
  const { data: rowData, error: readError } = await admin
    .from("escrow_agreements")
    .select(selectColumns)
    .eq("id", id)
    .maybeSingle();
  const row = rowData as unknown as ({ status: string } & Record<string, unknown>) | null;
  if (readError) return Response.json({ ok: false, error: readError.message }, { status: 500 });
  if (!row) return Response.json({ ok: false, error: "escrow not found" }, { status: 404 });

  // Đã đúng trạng thái VÀ đúng tx hash => lần gọi trước đã ghi xong, chỉ mất response.
  // Trả ok mà không ghi lại: giữ nguyên updated_at cũ, đúng với việc không có gì đổi.
  const current = (row as Record<string, unknown>)[hashColumn];
  if (row.status === status && typeof current === "string" && current.toLowerCase() === hashValue.toLowerCase()) {
    return Response.json({ ok: true, idempotent: true });
  }

  let warning: string | undefined;
  if (status === "FUNDED") {
    const r = row as unknown as {
      status: string; depositor_address: string; beneficiary_address: string;
      amount_usdc: number; contract_address: string; chain_id: number;
    };
    // Chỉ DRAFT mới được fund. Dòng đã FUNDED/SUBMITTED/… mà nhận một tx khác là dấu hiệu
    // gán nhầm hoặc phát lại tx của escrow khác.
    if (r.status !== "DRAFT") {
      return Response.json({ ok: false, error: `escrow is ${r.status}, only DRAFT can become FUNDED` }, { status: 409 });
    }
    let amountUnits: bigint;
    try {
      amountUnits = parseUnits(String(r.amount_usdc), 6);
    } catch {
      return Response.json({ ok: false, error: "amount_usdc in the database cannot be converted to USDC units" }, { status: 422 });
    }
    // Expected lấy TỪ DÒNG DB, không từ client.
    const v = await verifyFundTx(hashValue as `0x${string}`, {
      contract: r.contract_address, chainId: r.chain_id,
      depositor: r.depositor_address, beneficiary: r.beneficiary_address, amountUnits,
    });
    if (!v.ok) {
      return v.retryable
        ? Response.json({ ok: false, retryable: true, error: `Could not read the fund transaction from the chain yet. Nothing was saved. Retry sync. (${v.reason})` }, { status: 503 })
        : Response.json({ ok: false, retryable: false, error: `fund transaction rejected: ${v.reason}` }, { status: 422 });
    }
    update.payment_id = v.paymentId;
    if (clientPaymentId !== null && clientPaymentId !== v.paymentId) {
      warning = `client sent payment_id ${clientPaymentId}, the EscrowFunded event says ${v.paymentId}; stored ${v.paymentId}`;
    }
  }

  if (status === "FUNDED") {
    // Kèm .eq("status","DRAFT") để Postgres chặn hai request chen nhau giữa lúc đọc và lúc
    // ghi. .select("id") để biết có đúng một dòng được ghi.
    const { data: written, error: fundError } = await admin
      .from("escrow_agreements").update(update).eq("id", id).eq("status", "DRAFT").select("id");
    if (fundError) {
      // 23505 = unique_violation: (chain_id, contract_address, payment_id) đã thuộc dòng khác.
      if (fundError.code === "23505") {
        return Response.json({ ok: false, error: "this on-chain escrow is already linked to another row" }, { status: 409 });
      }
      return Response.json({ ok: false, error: fundError.message }, { status: 500 });
    }
    if (!written || written.length === 0) {
      return Response.json({ ok: false, error: "escrow changed status — reload and try again" }, { status: 409 });
    }
    return Response.json(warning ? { ok: true, warning } : { ok: true });
  }

  const { error: updateError } = await admin.from("escrow_agreements").update(update).eq("id", id);
  if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });

  return Response.json({ ok: true });
}
