"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

const NAV_ITEMS = [
  { href: "/", label: "Pay" },
  { href: "/history", label: "History" },
  { href: "/milestones", label: "Escrow" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const agentId = isConnected && address ? "#"+address.slice(2,7).toUpperCase() : "#——";
  return (
    <div className="min-h-screen bg-[#F4F7FD] text-[#0A1628] font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#E2EAF8] bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#0A0D12] flex items-center justify-center overflow-hidden border border-[#2A3545]">
              <Image src="/arcstation-logo.svg" alt="ArcStation" width={28} height={28} />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#0A1628]">ArcStation</span>
            <span className="text-[10px] bg-[#EBF2FD] text-[#2775CA] border border-[#C5D9F5] px-2 py-0.5 rounded-full font-medium">
              TESTNET
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className={"px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap " +
                  (pathname === item.href
                    ? "bg-[#EBF2FD] text-[#2775CA] font-semibold"
                    : "text-[#6B8DB8] hover:text-[#0A1628] hover:bg-[#EBF2FD]")}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-[#EBF2FD] border border-[#C5D9F5] rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2775CA]" />
              <span className="text-sm text-[#2775CA] font-mono font-semibold" suppressHydrationWarning>Agent {agentId}</span>
            </div>
            <ConnectButton
              label="Connect"
              accountStatus="avatar"
              showBalance={false}
              chainStatus="none"
            />
          </div>

        </div>
      </nav>
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
