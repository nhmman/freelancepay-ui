// Tạo escrow — thay cho supabase.from("escrow_agreements").insert(...) chạy ở browser.
//
// ⚠️ Route này KHÔNG xác thực người gọi. Trước đây anon key + RLS policy quyết định ai
// insert được; service_role bypass sạch RLS nên lớp đó biến mất, và policy nằm ngoài
// phạm vi được sửa của đợt này. Nghĩa là bất kỳ ai POST vào đây cũng tạo được escrow
// với depositor_address tùy ý. Đây là đánh đổi ĐÃ BIẾT, không phải sót — chỉ hành động
// approve mới đòi chữ ký (app/api/escrow/approve/route.ts).
import { isAddress } from "viem";
import { getSupabaseAdmin, SupabaseConfigError } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }

  const depositorAddress = str(body.depositorAddress).toLowerCase();
  const beneficiaryAddress = str(body.beneficiaryAddress).toLowerCase();
  const beneficiaryUsername = str(body.beneficiaryUsername);
  const terms = str(body.terms);
  const amountUsdc = typeof body.amountUsdc === "number" ? body.amountUsdc : NaN;

  if (!isAddress(depositorAddress)) {
    return Response.json({ ok: false, error: "depositorAddress is not an address" }, { status: 400 });
  }
  if (!isAddress(beneficiaryAddress)) {
    return Response.json({ ok: false, error: "beneficiaryAddress is not an address" }, { status: 400 });
  }
  if (!beneficiaryUsername) {
    return Response.json({ ok: false, error: "beneficiaryUsername is required" }, { status: 400 });
  }
  if (!terms) {
    return Response.json({ ok: false, error: "terms is required" }, { status: 400 });
  }
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return Response.json({ ok: false, error: "amountUsdc must be a positive number" }, { status: 400 });
  }

  // Whitelist cột CỨNG: dựng từng field một, không spread body vào insert. Client gửi
  // thừa key thì key đó rơi xuống đất, không chạm tới bảng.
  const row: Record<string, unknown> = {
    depositor_address: depositorAddress,
    beneficiary_username: beneficiaryUsername,
    beneficiary_address: beneficiaryAddress,
    amount_usdc: amountUsdc,
    terms,
    status: "DRAFT",
  };
  // Giữ nguyên hành vi của bản client: chỉ đính cột này khi toggle bật. DB chưa chạy
  // migration 20260730 vẫn tạo được escrow thường thay vì fail "column does not exist".
  if (body.agentAutoRelease === true) row.agent_auto_release = true;

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

  const { error } = await admin.from("escrow_agreements").insert(row);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
