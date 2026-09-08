// Duyệt escrow cho agent — thay cho setStatus(a.id, "APPROVED", { agent_release_at }).
//
// Đây là route DUY NHẤT trong app/api/escrow/* có xác thực, vì nó là hành động duy nhất
// mở đường cho tiền chạy: watcher ở app/api/agent-release chỉ release row nào
// status = 'APPROVED'. Ba lớp kiểm, thiếu lớp nào cũng thủng:
//
//   1. Chữ ký personal_sign bind vào ĐÚNG escrow + ĐÚNG hành động + ĐÚNG chain + thời
//      điểm phát hành. Ký chuỗi chung chung thì một chữ ký dùng lại được cho mọi escrow.
//   2. Signer phải khớp depositor_address ĐỌC TỪ DB. Không đụng tới address client gửi
//      lên — client gửi gì cũng được, nên tin nó là bỏ luôn lớp xác thực.
//   3. Row phải đang ở SUBMITTED. Vừa đúng luồng nghiệp vụ, vừa là chống replay: chữ ký
//      cũ phát lại lần hai gặp status đã là APPROVED nên bị chặn. Vì thế không cần bảng
//      nonce riêng — timestamp lo cửa sổ ngắn, status lo phần còn lại.
import { recoverMessageAddress } from "viem";
import { getSupabaseAdmin, SupabaseConfigError } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ARC_ID = 5042002;
// Cửa sổ chấp nhận chữ ký. Ngắn để chữ ký nhặt được từ log cũ không xài lại được.
const MAX_AGE_MS = 5 * 60 * 1000;
// Lệch đồng hồ máy client. Không cho ký "trước" quá mốc này.
const MAX_SKEW_MS = 60 * 1000;
// Phải khớp AGENT_DELAY_SECONDS trong app/escrow/page.tsx (chỗ đó chỉ còn dùng để hiển
// thị "6 minutes after approval"). Giá trị THẬT tính ở đây, server không nhận từ client.
const AGENT_DELAY_SECONDS = 6 * 60;

// PHẢI khớp từng byte với approvalMessage() trong app/escrow/page.tsx. Lệch một dấu cách
// là recover ra địa chỉ khác và mọi approve fail 403. Không tách được ra file dùng chung
// vì đợt sửa này chỉ được tạo app/api/escrow/*/route.ts.
function approvalMessage(id: string, issuedAt: string): string {
  return [
    "Statio escrow approval",
    `Escrow: ${id}`,
    "Action: APPROVE",
    `Chain: ${ARC_ID}`,
    `Issued: ${issuedAt}`,
  ].join("\n");
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const issuedAt = typeof body.issuedAt === "string" ? body.issuedAt.trim() : "";
  const signature = typeof body.signature === "string" ? body.signature.trim() : "";

  if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });
  if (!/^0x[0-9a-fA-F]+$/.test(signature)) {
    return Response.json({ ok: false, error: "signature is malformed" }, { status: 400 });
  }

  const issuedMs = Date.parse(issuedAt);
  if (!Number.isFinite(issuedMs)) {
    return Response.json({ ok: false, error: "issuedAt is not a timestamp" }, { status: 400 });
  }
  const age = Date.now() - issuedMs;
  if (age > MAX_AGE_MS) {
    return Response.json({ ok: false, error: "signature expired — approve again" }, { status: 400 });
  }
  if (age < -MAX_SKEW_MS) {
    return Response.json({ ok: false, error: "issuedAt is in the future — check your clock" }, { status: 400 });
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
    .select("id, status, depositor_address")
    .eq("id", id)
    .maybeSingle();
  if (readError) return Response.json({ ok: false, error: readError.message }, { status: 500 });
  if (!row) return Response.json({ ok: false, error: "escrow not found" }, { status: 404 });

  if (row.status !== "SUBMITTED") {
    return Response.json(
      { ok: false, error: `escrow is ${row.status}, only SUBMITTED can be approved` },
      { status: 409 },
    );
  }

  // recoverMessageAddress + so lowercase thay vì verifyMessage: depositor_address trong DB
  // là chuỗi thường, mà verifyMessage đi qua getAddress() nên ném lỗi checksum với chuỗi
  // hoa/thường lẫn lộn. So tay thì không phụ thuộc kiểu ghi địa chỉ.
  let signer: string;
  try {
    signer = await recoverMessageAddress({
      message: approvalMessage(id, issuedAt),
      signature: signature as `0x${string}`,
    });
  } catch {
    return Response.json({ ok: false, error: "signature could not be recovered" }, { status: 400 });
  }

  const depositor = String(row.depositor_address ?? "").toLowerCase();
  if (signer.toLowerCase() !== depositor) {
    // Cố tình không nói signer là ai — người gọi đã biết mình ký bằng ví nào.
    return Response.json({ ok: false, error: "signer is not the depositor of this escrow" }, { status: 403 });
  }

  // Whitelist cột CỨNG. agent_release_at tính Ở ĐÂY, client không gửi lên được — nếu
  // nhận từ client thì depositor tự đặt mốc quá khứ và xoá sạch cửa sổ tranh chấp.
  const releaseAt = new Date(Date.now() + AGENT_DELAY_SECONDS * 1000).toISOString();
  const { data: updated, error: updateError } = await admin
    .from("escrow_agreements")
    .update({ status: "APPROVED", agent_release_at: releaseAt, updated_at: new Date().toISOString() })
    // Lặp lại điều kiện status: giữa lúc đọc và lúc ghi vẫn có thể có request khác chen
    // vào. Kèm .eq ở đây thì Postgres là chỗ quyết định, không phải khoảng trống hai câu.
    .eq("id", id)
    .eq("status", "SUBMITTED")
    .select("id");
  if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
  if (!updated || updated.length === 0) {
    return Response.json({ ok: false, error: "escrow changed status — reload and try again" }, { status: 409 });
  }

  return Response.json({ ok: true, agent_release_at: releaseAt });
}
