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

// Khởi tạo lazy chứ không phải ở module scope: Next có load module của route
// lúc `next build`, nên tạo client sẵn sẽ làm build FAIL trên máy/CI chưa kịp
// điền SUPABASE_SERVICE_ROLE_KEY. Lazy thì build vẫn xanh, và chỉ đúng request
// nào cần tới key mới báo lỗi — kèm thông báo chỉ rõ phải điền ở đâu.
let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  if (!serviceRoleKey) {
    // Fail closed, và nói luôn chỗ điền — thiếu key mà để supabase-js tự gửi
    // request thì chỉ nhận về 401 rỗng, rất khó truy ngược.
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured — set it in .env.local for local runs and in the Vercel project environment for deployments",
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
