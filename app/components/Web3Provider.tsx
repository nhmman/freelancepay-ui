"use client";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { WagmiProvider, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@rainbow-me/rainbowkit/styles.css";

const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } } } as const;

// projectId của Reown/WalletConnect đọc từ env, KHÔNG hard-code. Giá trị cũ nằm ngay
// trong code (2b0b4e6e…) là placeholder giả: pulse.walletconnect.org trả 403 cho nó nên
// ví không kết nối được. Tiền tố NEXT_PUBLIC_ là bắt buộc — đây là client component nên
// Next inline giá trị vào bundle lúc build, biến không có tiền tố sẽ là undefined ở
// browser. Lấy project ID ở https://dashboard.reown.com.
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
if (!projectId) {
  // Fail closed ngay lúc khởi tạo module, không fallback về giá trị mặc định: một
  // projectId thiếu hoặc sai chỉ lộ ra rất muộn, dưới dạng 403 từ
  // pulse.walletconnect.org lúc người dùng bấm Connect Wallet, và lúc đó thì gần như
  // không truy được nguyên nhân. Thà vỡ ngay ở đây với đúng tên biến cần đặt.
  throw new Error(
    "NEXT_PUBLIC_REOWN_PROJECT_ID is not set. Get the project ID from https://dashboard.reown.com, " +
    "then add it to .env.local for local dev and to the Vercel project environment variables for production.",
  );
}

const config = getDefaultConfig({
  appName: "Statio",
  projectId,
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http("https://rpc.testnet.arc.network") } });

const queryClient = new QueryClient();

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en-US">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
