// Nộp deliverable — thay cho setStatus(a.id, "SUBMITTED", { deliverable_url }) ở browser.
//
// ⚠️ Không xác thực người gọi, cùng lý do đã ghi ở app/api/escrow/create/route.ts:
// service_role bypass RLS và policy nằm ngoài phạm vi sửa. Ai biết id là POST được.
import { getSupabaseAdmin, SupabaseConfigError } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "body must be JSON" }, { status: 400 });
  }

  // Không ép id về UUID: migration không nói rõ kiểu cột, ép ở đây là đoán. Chỉ chặn
  // rỗng/sai kiểu, còn id sai định dạng thì để Postgres từ chối.
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) return Response.json({ ok: false, error: "id is required" }, { status: 400 });

  // Client đã chạy normalizeUrl, nhưng client không phải nguồn tin cậy — kiểm lại, và
  // chỉ nhận http/https để không ghi được javascript:/data: vào cột rồi render ra <a href>.
  const raw = typeof body.deliverableUrl === "string" ? body.deliverableUrl.trim() : "";
  let deliverableUrl: string;
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
    if (!u.hostname.includes(".")) throw new Error("host");
    deliverableUrl = u.toString();
  } catch {
    return Response.json({ ok: false, error: "deliverableUrl must be a valid http(s) URL" }, { status: 400 });
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

  // Whitelist cột CỨNG — ba field, dựng tay, không spread body.
  const { error } = await admin
    .from("escrow_agreements")
    .update({ status: "SUBMITTED", deliverable_url: deliverableUrl, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
