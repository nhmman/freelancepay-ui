// Supabase client dùng SERVICE ROLE KEY — bypass TOÀN BỘ RLS.
//
// ⚠️ TUYỆT ĐỐI KHÔNG import file này vào Client Component (bất kỳ file nào có
// "use client") hay bất cứ code nào chạy trên browser. Service role key đọc/ghi
// được mọi bảng và bỏ qua mọi policy — lộ ra bundle client là mất sạch DB, và
// key nằm trong JS đã ship thì không "gỡ" lại được, chỉ còn cách rotate.
//
// `import "server-only"` ngay dưới đây biến sai lầm đó thành lỗi BUILD chứ không
// phải sự cố production: bundler fail ngay khi module này bị kéo vào graph của
// client. Comment thì người ta đọc lướt, build fail thì không.
//
// Chỉ dùng trong: Route Handler (app/api/**), Server Component, Server Action.
// Client Component vẫn dùng lib/supabase.ts (anon key, chịu sự quản của RLS).
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Lỗi cấu hình env, tách riêng khỏi lỗi mạng/lỗi query để route phân biệt được
// "thiếu/sai biến môi trường" với "Supabase từ chối key". Luôn mang theo TÊN biến.
// KHÔNG BAO GIỜ nhét giá trị key vào `message` — message này đi thẳng ra HTTP
// response và vào log của GitHub Actions.
export class SupabaseConfigError extends Error {
  readonly variable: string;
  constructor(variable: string, problem: string) {
    super(`${variable} ${problem}`);
    this.name = "SupabaseConfigError";
    this.variable = variable;
  }
}

// Đọc claim `role` của legacy JWT key mà không log gì ra ngoài. Trả null nếu
// không phải JWT đọc được.
function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const role = (payload as { role?: unknown } | null)?.role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

// Khởi tạo lazy chứ không phải ở module scope: Next có load module của route
// lúc `next build`, nên tạo client sẵn sẽ làm build FAIL trên máy/CI chưa kịp
// điền SUPABASE_SERVICE_ROLE_KEY. Lazy thì build vẫn xanh, và chỉ đúng request
// nào cần tới key mới báo lỗi — kèm thông báo chỉ rõ phải điền ở đâu.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || url.trim() === "") {
    throw new SupabaseConfigError("NEXT_PUBLIC_SUPABASE_URL", "is missing or empty");
  }
  if (!serviceRoleKey || serviceRoleKey.trim() === "") {
    // Fail closed, và nói luôn chỗ điền — thiếu key mà để supabase-js tự gửi
    // request thì chỉ nhận về 401 rỗng, rất khó truy ngược.
    throw new SupabaseConfigError(
      "SUPABASE_SERVICE_ROLE_KEY",
      "is missing or empty — set it in .env.local for local runs and in the Vercel project environment for deployments",
    );
  }

  // Các kiểm tra dưới đây bắt đúng lớp lỗi mà guard "rỗng" KHÔNG bắt được: biến
  // có mặt, không rỗng, nhưng giá trị hỏng. Đó là ca đã làm cron đỏ trong
  // production — Supabase chỉ trả về "Invalid API key" ở tận lúc query.
  if (serviceRoleKey !== serviceRoleKey.trim()) {
    // Paste dính newline/space là nguyên nhân kinh điển, và nhìn bằng mắt trên
    // dashboard thì không thấy.
    throw new SupabaseConfigError(
      "SUPABASE_SERVICE_ROLE_KEY",
      "has leading or trailing whitespace — it was probably pasted with a stray newline or space; re-paste it with no surrounding whitespace",
    );
  }

  const role = jwtRole(serviceRoleKey);
  if (role !== null && role !== "service_role") {
    // Hay gặp nhất: paste nhầm anon key sang ô service role. Key vẫn hợp lệ nên
    // query vẫn chạy khi chưa bật RLS, rồi hỏng âm thầm ngay khi policy bật lên.
    throw new SupabaseConfigError(
      "SUPABASE_SERVICE_ROLE_KEY",
      `carries the "${role}" role, not "service_role" — this looks like the wrong key was pasted (the anon key belongs in NEXT_PUBLIC_SUPABASE_ANON_KEY)`,
    );
  }
  // Allowlist hình dạng key. Nếu Supabase ra định dạng mới thì đây là chỗ phải
  // nới ra — thông báo lỗi cố ý nói rõ hình dạng đang chấp nhận để khỏi phải đoán.
  if (role === null && !serviceRoleKey.startsWith("sb_secret_")) {
    throw new SupabaseConfigError(
      "SUPABASE_SERVICE_ROLE_KEY",
      'does not look like a Supabase service role key — expected a JWT starting with "eyJ" or a key starting with "sb_secret_"',
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: {
      // Không có user session ở server: đừng refresh token, đừng ghi session ra
      // storage. Để mặc định thì supabase-js giữ state thừa giữa các request.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cached;
}
