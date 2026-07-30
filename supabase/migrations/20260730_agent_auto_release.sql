-- Agent Pay MVP — cho phép 1 agent tự giải ngân escrow sau khi milestone được duyệt.
-- Chạy TAY trên Supabase dashboard (SQL Editor). Không chạy bằng service role key từ code.
--
-- Bối cảnh: agent chính là depositor của escrow đó, vì TimelockEscrow.release() chỉ cho
-- depositor gọi trước deadline (hoặc bất kỳ ai sau deadline). Xem lib/timelockEscrow.ts.

-- ── 1. Hai cột mới ────────────────────────────────────────────────────────────
-- IF NOT EXISTS để chạy lại nhiều lần vẫn an toàn.
ALTER TABLE escrow_agreements
  ADD COLUMN IF NOT EXISTS agent_auto_release BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_release_at   TIMESTAMPTZ;

COMMENT ON COLUMN escrow_agreements.agent_auto_release IS
  'Bật = agent watcher sẽ tự gọi release() thay vì depositor bấm tay.';
COMMENT ON COLUMN escrow_agreements.agent_release_at IS
  'Thời điểm sớm nhất agent được release. Set lúc depositor bấm Approve.';


-- ── 2. KIỂM TRA TRƯỚC KHI DÙNG STATUS MỚI 'APPROVED' ──────────────────────────
-- Luồng mới thêm status 'APPROVED' (giữa 'SUBMITTED' và 'RELEASED'). Nếu cột status
-- đang có CHECK constraint giới hạn giá trị thì ghi 'APPROVED' sẽ FAIL lúc runtime —
-- và fail ở chỗ khó thấy (nút Approve im lặng không làm gì).
--
-- Chạy câu này. Nếu trả về 0 dòng => không có constraint => xong, bỏ qua mục 3.
SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM   pg_constraint con
JOIN   pg_class rel ON rel.oid = con.conrelid
WHERE  rel.relname = 'escrow_agreements'
  AND  con.contype = 'c';


-- ── 3. CHỈ chạy nếu mục 2 có trả về constraint dính tới `status` ───────────────
-- Thay <tên_constraint> bằng conname thật ở trên, rồi bỏ comment 2 câu dưới.
-- Danh sách giá trị lấy từ STATUS_STYLE trong app/escrow/page.tsx + 'APPROVED' mới.
--
-- ALTER TABLE escrow_agreements DROP CONSTRAINT <tên_constraint>;
-- ALTER TABLE escrow_agreements ADD  CONSTRAINT escrow_agreements_status_check
--   CHECK (status IN ('DRAFT','FUNDED','SUBMITTED','APPROVED','RELEASED','REFUNDED'));


-- ── Ghi chú ───────────────────────────────────────────────────────────────────
-- Không thêm index cho câu query của watcher
-- (agent_auto_release = true AND status = 'APPROVED' AND agent_release_at <= now()):
-- bảng đang ~21 dòng, seq scan nhanh hơn index. Thêm sau nếu bảng lớn lên.
