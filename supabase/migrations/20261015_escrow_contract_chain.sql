-- Phân biệt escrow theo contract + chain — thêm contract_address và chain_id vào escrow_agreements.
-- Chạy TAY trên Supabase dashboard (SQL Editor). Không chạy bằng service role key từ code.
--
-- Bối cảnh: payment_id là id on-chain, nhưng chỉ duy nhất TRONG MỘT contract. Bảng đang
-- chứa escrow của 2 contract trên Arc Testnet mà không có cột nào nói dòng nào thuộc
-- contract nào, nên payment_id 0..3 đang trùng giữa hệ escrow cũ và TimelockEscrow V1:
--   - 0x48b9bc658f49d88c077414f757cda92018949cd0  hệ escrow cũ (lib/escrowContract.ts), 4 dòng
--   - 0x74d0cb38af5d79f1a88d893e13ed2ac347347961  TimelockEscrow V1 testnet, app đang dùng, 42 dòng,
--     mức chứng minh KHÔNG đều:
--       20 dòng: fund tx gửi tới 0x74d0 (eth_getTransactionByHash)
--       18 dòng: fund tx đã bị RPC prune; khớp depositor/beneficiary/amount với escrows(id) on-chain
--        1 dòng (ee4a2e3f…, payment_id 17, FUNDED 100 USDC): KHÔNG khớp escrow nào on-chain,
--          gán V1 chỉ vì lúc đó app chỉ có đường fund V1 (commit a166144: chỗ gọi fund() duy
--          nhất là app/escrow/page.tsx với TIMELOCK_ADDRESS). Chưa xác minh.
--        3 dòng chưa fund (payment_id NULL): chưa thuộc contract nào, nhận giá trị mặc định.
-- 4 dòng cũ được nhận diện vì tx_hash_fund của chúng gửi tới 0x48b9 (eth_getTransactionByHash
-- trên RPC testnet). Khớp theo UUID đầy đủ, không theo prefix hay ngày tạo.
--
-- KHÔNG thêm UNIQUE trên payment_id dưới bất kỳ dạng nào: payment_id 17 đang có 2 dòng cùng
-- thuộc V1 testnet (dòng ee4a2e3f không khớp escrow #17 on-chain) và chưa được xử lý.
--
-- Toàn bộ nằm trong một transaction. ALTER TABLE giữ ACCESS EXCLUSIVE lock tới COMMIT, nên
-- không có insert nào chen vào giữa lúc thêm cột và lúc backfill. Kiểm tra ở bước 3 sai thì
-- RAISE EXCEPTION và cả transaction rollback, bảng giữ nguyên như trước.

BEGIN;

-- ── 1. Hai cột mới, nullable ở bước này ───────────────────────────────────────
ALTER TABLE public.escrow_agreements
  ADD COLUMN contract_address text,
  ADD COLUMN chain_id integer;


-- ── 2. Backfill ───────────────────────────────────────────────────────────────
-- a. 4 dòng của hệ escrow cũ. id::text để so được dù cột id là uuid hay text.
UPDATE public.escrow_agreements
SET    contract_address = '0x48b9bc658f49d88c077414f757cda92018949cd0',
       chain_id         = 5042002
WHERE  id::text IN (
  '6c5e2234-f8ff-413e-af18-4c59b47c923c',
  '9d3f38b9-6487-44d4-932b-2b6e0b524e06',
  '08cc2474-6c97-4821-bd11-ffffe3a2979a',
  '1ff87ef1-3259-4944-9e4b-4057b49f9977'
);

-- b. Mọi dòng còn lại thuộc TimelockEscrow V1 testnet.
UPDATE public.escrow_agreements
SET    contract_address = '0x74d0cb38af5d79f1a88d893e13ed2ac347347961',
       chain_id         = 5042002
WHERE  contract_address IS NULL;


-- ── 3. Kiểm tra — sai bất kỳ điều kiện nào thì rollback toàn bộ ──────────────
DO $$
DECLARE
  n_legacy integer;
  n_v1     integer;
  n_null   integer;
  n_total  integer;
BEGIN
  SELECT count(*) INTO n_legacy FROM public.escrow_agreements
    WHERE contract_address = '0x48b9bc658f49d88c077414f757cda92018949cd0';
  SELECT count(*) INTO n_v1 FROM public.escrow_agreements
    WHERE contract_address = '0x74d0cb38af5d79f1a88d893e13ed2ac347347961';
  SELECT count(*) INTO n_null FROM public.escrow_agreements
    WHERE contract_address IS NULL OR chain_id IS NULL;
  SELECT count(*) INTO n_total FROM public.escrow_agreements;

  IF n_legacy <> 4 THEN
    RAISE EXCEPTION 'expected 4 rows on 0x48b9 (legacy), got %', n_legacy;
  END IF;
  IF n_v1 <> 42 THEN
    RAISE EXCEPTION 'expected 42 rows on 0x74d0 (V1 testnet), got %', n_v1;
  END IF;
  IF n_null <> 0 THEN
    RAISE EXCEPTION 'expected 0 rows with NULL contract_address/chain_id, got %', n_null;
  END IF;
  IF n_total <> 46 THEN
    RAISE EXCEPTION 'expected 46 rows in total, got %', n_total;
  END IF;
END
$$;


-- ── 4. Default + NOT NULL ─────────────────────────────────────────────────────
-- DEFAULT là để create route hiện tại (app/api/escrow/create/route.ts, không truyền 2 cột
-- này) vẫn insert được. Xem COMMENT ở bước 6: default này là TẠM.
ALTER TABLE public.escrow_agreements
  ALTER COLUMN contract_address SET DEFAULT '0x74d0cb38af5d79f1a88d893e13ed2ac347347961',
  ALTER COLUMN contract_address SET NOT NULL,
  ALTER COLUMN chain_id SET DEFAULT 5042002,
  ALTER COLUMN chain_id SET NOT NULL;


-- ── 5. CHECK constraints ──────────────────────────────────────────────────────
-- Địa chỉ lưu chữ thường, giống depositor_address/beneficiary_address hiện có.
ALTER TABLE public.escrow_agreements
  ADD CONSTRAINT escrow_agreements_contract_address_fmt
    CHECK (contract_address ~ '^0x[0-9a-f]{40}$'),
  ADD CONSTRAINT escrow_agreements_chain_id_known
    CHECK (chain_id IN (5042002, 5042));


-- ── 6. Ghi chú cột ────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.escrow_agreements.contract_address IS
  'Escrow contract chứa payment_id của dòng này (chữ thường). payment_id chỉ duy nhất trong một contract. DEFAULT = TimelockEscrow V1 testnet 0x74d0… là TẠM: khi nối app sang V2, create route phải truyền giá trị tường minh, rồi DROP DEFAULT.';
COMMENT ON COLUMN public.escrow_agreements.chain_id IS
  'Chain của contract_address: 5042002 = Arc Testnet, 5042 = Arc Mainnet. DEFAULT 5042002 là TẠM: khi nối app sang V2, create route phải truyền giá trị tường minh, rồi DROP DEFAULT.';

COMMIT;


-- ── ROLLBACK (chỉ chạy nếu cần gỡ migration này) ──────────────────────────────
-- BEGIN;
-- ALTER TABLE public.escrow_agreements
--   DROP CONSTRAINT IF EXISTS escrow_agreements_contract_address_fmt,
--   DROP CONSTRAINT IF EXISTS escrow_agreements_chain_id_known;
-- ALTER TABLE public.escrow_agreements
--   DROP COLUMN IF EXISTS contract_address,
--   DROP COLUMN IF EXISTS chain_id;
-- COMMIT;


-- ── VERIFY (chạy sau migration) ───────────────────────────────────────────────
-- Kỳ vọng: 2 nhóm — 0x48b9… / 5042002 / 4 và 0x74d0… / 5042002 / 42.
-- SELECT contract_address, chain_id, count(*)
-- FROM   public.escrow_agreements
-- GROUP  BY 1, 2
-- ORDER  BY 1, 2;
--
-- Kỳ vọng: đúng 1 nhóm — payment_id 17 / 0x74d0… / 2.
-- WHERE payment_id IS NOT NULL là bắt buộc: 3 dòng chưa fund (payment_id NULL) cùng thuộc
-- 0x74d0…, thiếu điều kiện này GROUP BY sẽ gom chúng thành một nhóm NULL có count = 3.
-- SELECT payment_id, contract_address, count(*)
-- FROM   public.escrow_agreements
-- WHERE  payment_id IS NOT NULL
-- GROUP  BY 1, 2
-- HAVING count(*) > 1
-- ORDER  BY 1, 2;
