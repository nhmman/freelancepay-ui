// Ghi trạng thái sau khi tx đã final on-chain — thay cho phần supabase.update() bên
// trong persistAfterTx() ở browser.
//
// ⚠️ Không xác thực người gọi, cùng lý do đã ghi ở app/api/escrow/create/route.ts.
// Route này không đòi chữ ký vì nó chỉ chép lại một sự việc ĐÃ xảy ra trên chain.
//
// PHẢI idempotent: nút "Retry sync" trên trang escrow gọi lại đúng payload cũ sau khi
// lần ghi đầu fail, và lần fail đó có thể là mất response chứ không phải mất ghi. Gọi
// hai lần phải cho cùng một kết quả, không được đá ra lỗi làm người dùng tưởng tiền kẹt.
import { getSupabaseAdmin, SupabaseConfigError } from "../../../../lib/supabaseAdmin";

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

  if (status === "FUNDED") {
    const paymentId = typeof fields.payment_id === "number" ? fields.payment_id : NaN;
    const txHashFund = typeof fields.tx_hash_fund === "string" ? fields.tx_hash_fund : "";
    if (!Number.isInteger(paymentId) || paymentId < 0) {
      return Response.json({ ok: false, error: "payment_id must be a non-negative integer" }, { status: 400 });
    }
    if (!TX_HASH.test(txHashFund)) {
      return Response.json({ ok: false, error: "tx_hash_fund is not a tx hash" }, { status: 400 });
    }
    update.payment_id = paymentId;
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

  const { data: row, error: readError } = await admin
    .from("escrow_agreements")
    .select(`id, status, ${hashColumn}`)
    .eq("id", id)
    .maybeSingle();
  if (readError) return Response.json({ ok: false, error: readError.message }, { status: 500 });
  if (!row) return Response.json({ ok: false, error: "escrow not found" }, { status: 404 });

  // Đã đúng trạng thái VÀ đúng tx hash => lần gọi trước đã ghi xong, chỉ mất response.
  // Trả ok mà không ghi lại: giữ nguyên updated_at cũ, đúng với việc không có gì đổi.
  const current = (row as Record<string, unknown>)[hashColumn];
  if (row.status === status && typeof current === "string" && current.toLowerCase() === hashValue.toLowerCase()) {
    return Response.json({ ok: true, idempotent: true });
  }

  const { error: updateError } = await admin.from("escrow_agreements").update(update).eq("id", id);
  if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });

  return Response.json({ ok: true });
}
