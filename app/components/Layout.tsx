"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV_ITEMS = [
  { href: "/", label: "Pay" },
  { href: "/milestones", label: "Milestones" },
  { href: "/nanopay", label: "Nanopay" },
  { href: "/reputation", label: "Reputation" },
  { href: "/jobs", label: "Jobs" },
  { href: "/invoice", label: "Invoice" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/dashboard", label: "Dashboard" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[#0a0b0d] text-white font-sans">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0b0d]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm">
              💸
            </div>
            <span className="font-bold text-lg tracking-tight">FreelancePay</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">
              TESTNET
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href}
                className={"px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap " +
                  (pathname === item.href
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5")}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-300 font-mono">Agent #15994</span>
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
