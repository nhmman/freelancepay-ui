# contracts/

Source Solidity của hệ TimelockEscrow (Agent Pay) trên Arc Testnet, chain 5042002.

| File | Địa chỉ | Trạng thái |
|---|---|---|
| `TimelockEscrow.sol` (V1) | `0x74d0cb38af5d79f1a88d893e13ed2ac347347961` | Đang chạy, app đang dùng |
| `TimelockEscrowV2.sol` | chưa deploy | Chưa deploy |

## V1 — cách xác minh

- Biên dịch lại bằng solc 0.8.20, optimizer enabled, runs 200, điền 2 giá trị immutable
  (`arbiter`, `usdc`) từ tham số constructor: mã thực thi khớp **1981/1981 byte** với
  `eth_getCode` (RPC Arc, chain 5042002). Vùng metadata CBOR 53 byte ở cuối khác.
- Metadata CBOR trong bytecode on-chain ghi compiler **0.8.24**, trong khi explorer ghi
  `v0.8.20+commit.a1b79de6`. Hai nguồn không khớp nhau.
- Biên dịch lại bằng solc 0.8.24, optimizer enabled, runs 200, evmVersion mặc định
  (shanghai), source lấy từ explorer API (file trong repo có thêm header comment ở đầu),
  tên file nguồn `.sol` như explorer ghi:
  runtime khớp **2003/2034 byte** (mã thực thi 1981/1981); vùng metadata 53 byte khác
  **31 byte**. Thêm `metadata.bytecodeHash: "ipfs"`: vẫn **không khớp**.

## V2 — bộ settings để deploy và verify

- solc 0.8.20
- optimizer: enabled, runs: 200
- evmVersion: để mặc định

Mọi lần sinh bytecode và mọi lần verify V2 phải dùng đúng bộ này, không đổi phiên bản.

V2 chưa được dùng bởi app: `lib/timelockEscrow.ts` vẫn trỏ vào V1.
