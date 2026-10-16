-- Trả dòng ee4a2e3f… về DRAFT và thêm UNIQUE (chain_id, contract_address, payment_id).
-- Chạy TAY trên Supabase dashboard (SQL Editor), CẢ FILE một lần. Không chạy bằng service
-- role key từ code. Chạy SAU 20261015_escrow_contract_chain.sql.
--
-- ── Dòng ee4a2e3f-af14-46ed-ae36-66fc248b0650 ────────────────────────────────
-- DB ghi status FUNDED, payment_id 17, tx_hash_fund 0x7cec1361…fb64. Bằng chứng on-chain
-- (RPC https://rpc.testnet.arc.network, chain 5042002, đọc ngày 15/10/2026):
--   - eth_getTransactionReceipt(0x7cec1361d0c9beca0d37bd959ba58750f4bbe6e2fd9366b176f06b89a393fb64):
--     block 55652747, status 0x0, logs [], gasUsed 43246, from 0x5ddd…728b, to 0x74d0…7961.
--   - Input decode ra fund(0x30bd48…3248, 100000000, 604800).
--   - Replay eth_call cùng from/to/data ở block 55652746 báo
--     "ERC20: transfer amount exceeds balance". Số dư USDC của 0x5ddd…728b ở block đó là
--     11.97028 USDC; allowance cho 0x74d0… là 100 USDC; V1 nonce() là 17.
-- Tx revert nên không có escrow nào được tạo. payment_id 17 là nonce() đọc TRƯỚC khi fund
-- (app/escrow/page.tsx cũ), không phải id của escrow này: escrows(17) on-chain thuộc
-- depositor 0x7ef0…9774, 10 USDC — khớp dòng 71fcfd3a… chứ không phải dòng này.
-- Vì vậy dòng này trở về DRAFT (chưa từng được fund), payment_id và tx_hash_fund về NULL.
-- tx_hash 0x7cec1361… được ghi lại ở comment này để không mất dấu vết.
--
-- ── Đính chính migration 20261015_escrow_contract_chain.sql ──────────────────
-- - Câu "18 dòng: fund tx đã bị RPC prune" không đúng hoàn toàn. Khảo sát lại 15/10: trong
--   19 fund tx từng trả null, 13 tx đã được RPC trả về, 6 tx vẫn null. Null có thể chỉ là
--   tạm thời, không chắc là đã prune.
-- - Câu "ee4a2e3f … Chưa xác minh" đã được xác minh: tx fund của dòng này revert (ở trên).
--
-- ── UNIQUE ───────────────────────────────────────────────────────────────────
-- Sau khi sửa dòng trên, không còn nhóm trùng (chain_id, contract_address, payment_id) nào
-- với payment_id NOT NULL. Postgres coi NULL là khác nhau, nên 3 dòng chưa fund (payment_id
-- NULL) cùng với dòng ee4a2e3f… không vi phạm UNIQUE. Sau migration, ghi một payment_id đã
-- thuộc dòng khác (cùng chain, cùng contract) sẽ lỗi 23505; /api/escrow/sync trả 409.
--
-- Toàn bộ trong một transaction. Kiểm tra trong DO block sai thì RAISE EXCEPTION và cả
-- transaction rollback, bảng giữ nguyên.

BEGIN;

DO $$
DECLARE
  r       record;
  n_upd   integer;
  n_dups  integer;
BEGIN
  -- 1. Dòng phải đang đúng như khảo sát.
  SELECT status, payment_id, tx_hash_fund INTO r
  FROM   public.escrow_agreements
  WHERE  id::text = 'ee4a2e3f-af14-46ed-ae36-66fc248b0650';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'row ee4a2e3f-af14-46ed-ae36-66fc248b0650 not found';
  END IF;
  IF r.status IS DISTINCT FROM 'FUNDED'
     OR r.payment_id IS DISTINCT FROM 17
     OR lower(r.tx_hash_fund) IS DISTINCT FROM '0x7cec1361d0c9beca0d37bd959ba58750f4bbe6e2fd9366b176f06b89a393fb64' THEN
    RAISE EXCEPTION 'row ee4a2e3f is not in the expected state: status=%, payment_id=%, tx_hash_fund=%',
      r.status, r.payment_id, r.tx_hash_fund;
  END IF;

  -- 2. Trả về DRAFT. Kiểm đúng 1 dòng bị đổi.
  UPDATE public.escrow_agreements
  SET    status = 'DRAFT', payment_id = NULL, tx_hash_fund = NULL
  WHERE  id::text = 'ee4a2e3f-af14-46ed-ae36-66fc248b0650'
    AND  status = 'FUNDED' AND payment_id = 17;
  GET DIAGNOSTICS n_upd = ROW_COUNT;
  IF n_upd <> 1 THEN
    RAISE EXCEPTION 'expected to update exactly 1 row, updated %', n_upd;
  END IF;

  -- 3. Không còn nhóm trùng nào thì mới thêm UNIQUE.
  SELECT count(*) INTO n_dups FROM (
    SELECT chain_id, contract_address, payment_id
    FROM   public.escrow_agreements
    WHERE  payment_id IS NOT NULL
    GROUP  BY chain_id, contract_address, payment_id
    HAVING count(*) > 1
  ) d;
  IF n_dups <> 0 THEN
    RAISE EXCEPTION 'expected 0 duplicate (chain_id, contract_address, payment_id) groups, found %', n_dups;
  END IF;
END
$$;

ALTER TABLE public.escrow_agreements
  ADD CONSTRAINT escrow_agreements_chain_contract_payment_key
  UNIQUE (chain_id, contract_address, payment_id);

COMMIT;


-- ── VERIFY (chạy sau migration) ───────────────────────────────────────────────
-- Kỳ vọng: 1 dòng — status DRAFT, payment_id NULL, tx_hash_fund NULL.
-- SELECT id, status, payment_id, tx_hash_fund, contract_address, chain_id
-- FROM   public.escrow_agreements
-- WHERE  id::text = 'ee4a2e3f-af14-46ed-ae36-66fc248b0650';
--
-- Kỳ vọng: 1 dòng — constraint escrow_agreements_chain_contract_payment_key, kiểu 'u',
-- định nghĩa UNIQUE (chain_id, contract_address, payment_id).
-- SELECT conname, contype, pg_get_constraintdef(oid)
-- FROM   pg_constraint
-- WHERE  conrelid = 'public.escrow_agreements'::regclass
--   AND  conname = 'escrow_agreements_chain_contract_payment_key';
