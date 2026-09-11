@AGENTS.md

## Quy tắc bất biến của Statio

1. **KHÔNG BAO GIỜ** dùng `SUPABASE_SERVICE_ROLE_KEY` để quét dữ liệu production. Khi cần đọc dữ liệu, viết câu SQL read-only ra cho tôi tự chạy trên Supabase.

2. **KHÔNG BAO GIỜ** dùng `curl` vào `arcscan.app` để chứng minh một tx tồn tại — đó là SPA, trả HTTP 200 cho mọi đường dẫn kể cả hash bịa. Chỉ được xác minh bằng RPC `eth_getTransactionReceipt` tại `https://rpc.testnet.arc.network` (chain `5042002`).

3. Không được viết bất kỳ tuyên bố nào vào README, UI, deck hay form nộp bài nếu chưa chứng minh được bằng code trong repo hoặc bằng dữ liệu on-chain. Nếu không chứng minh được, nói rõ **"KHÔNG CHỨNG MINH ĐƯỢC"** thay vì viết đại.

4. Project target **ES2017**: dùng `BigInt(0)`, không dùng `0n`.

5. Thư mục `src/app/` là **code chết** — Next.js bỏ qua nó vì đã có `app/` ở gốc. Chỉ sửa trong `app/`.

6. Có **HAI hệ escrow tách biệt**, tuyệt đối không gộp khi mô tả:
   - **TimelockEscrow** `0x74d0cb38af5d79f1a88d893e13ed2ac347347961` — chạy client-side qua wagmi, lưu ở bảng Supabase `escrow_agreements`. Đây là hệ Agent Pay release.
   - **Jobs contract** `0x0747EEf0706327138c69792bF28Cd525089e4583` — ERC-8183 qua Developer-Controlled Wallets, 4 route `api/jobs/*`, không có frontend. Chuẩn ERC-8183 là thật, có EIP chính thức tại eips.ethereum.org/EIPS/eip-8183 và Arc đã công khai áp dụng: arc.io/blog/running-an-agentic-economic-flow-on-arc-with-erc-8183. Tên biến AGENTIC_COMMERCE_CONTRACT lấy từ docs chính thức của Arc, không phải tự đặt.

7. **Giới hạn đã biết của Agent Pay**: chỉ release được escrow do chính ví agent `0x5DDd68cB85A1CB8Fd0C740473D4F1A39A669728B` nạp tiền. Không được mô tả nó như thể client bên thứ ba nạp cũng chạy được.

8. Đổi env var trên Vercel **phải redeploy mới có tác dụng** — luôn nhắc tôi điều này.

9. Cron GitHub Actions thực tế chạy cách nhau **50-95 phút** dù cấu hình 5 phút. Trước mọi demo trực tiếp phải bấm `workflow_dispatch` thủ công.

10. USDC trên Arc có **hai giao diện**: ERC-20 6 decimals, native 18 decimals. Xử lý quy đổi ở tầng hiển thị, không ở tầng gọi contract.

11. Giữ nguyên pin `"@circle-fin/adapter-circle-wallets": "1.3.1"` — không thêm dấu `^`, bản 1.4.x làm hỏng đường DCW của route `milestones/release`.

12. **RLS Supabase đã siết từ 10/9/2026**: bảng `escrow_agreements` chỉ còn đúng một policy `"anon read | SELECT"`. Mọi thao tác ghi **PHẢI** qua `lib/supabaseAdmin.ts` trong route handler server-side. Một chỗ ghi bằng anon client sẽ fail **IM LẶNG** — trả HTTP 200 với body rỗng, không throw, nên bug sẽ không lộ ra ở log.

13. `eth_getLogs` trên Arc **PHẢI gọi tuần tự**. Chạy song song dù chỉ 2 request cũng fail `-32005` rate limit. Khác `eth_getBlock` (song song 8 vẫn OK). Cách sửa là **tuần tự hoá**, không phải retry. RPC cũng chặn range > 20.000 block (`-32012`) và cap 20.000 kết quả mỗi query.

14. Bấm **"Redeploy"** trên Vercel chỉ build lại commit cũ. Muốn code mới lên production phải commit + push.

15. Biến `NEXT_PUBLIC_` trên Vercel phải chọn type **"Config"**, không phải "Secret" — nó vốn đã lộ ra browser, chọn Secret chỉ làm tôi không xem lại được.

16. **Placeholder trong code hỏng ÂM THẦM.** Đã mất nhiều tuần vì Reown project ID là giá trị giả hard-code: app vẫn chạy, vẫn hiện nút Connect, nhưng mọi request trả 403 và không ai kết nối được qua WalletConnect. Khi nghi ngờ hỏng âm thầm, đọc network request thật, đừng tin log.

### Cách làm việc

17. **Sửa tối thiểu.** Không refactor kèm, không đổi tên biến ngoài yêu cầu, không tạo file mới trừ khi được bảo. Chỉ đụng đúng file được nêu trong yêu cầu.

18. **KHÔNG BAO GIỜ** tự chạy `git commit` hoặc `git push`. Chỉ sửa file, báo cáo, rồi chờ tôi quyết định.

19. Sau mỗi lần sửa, báo: diff `+x/-y`, danh sách file thay đổi, kết quả `npx tsc --noEmit`, và xác nhận những file bị cấm đụng vẫn unchanged.

20. Khi được yêu cầu khảo sát, **CHỈ báo cáo, không sửa gì**.

21. Trả lời tôi bằng **tiếng Việt**. Tôi không đọc code trực tiếp, nên khi báo cáo phải nói rõ `file:dòng` và giải thích **hậu quả thực tế**, không chỉ nêu tên lỗi.

22. Nói thẳng rủi ro kể cả khi trái ý tôi. Không khẳng định điều chưa verify — không chắc thì nói không chắc, và nói cần dữ liệu gì để chắc.
