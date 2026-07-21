"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

const NAV_ITEMS = [
  { href: "/pay",     label: "Pay" },
  { href: "/payroll", label: "Payroll" },
  { href: "/escrow",  label: "Escrow" },
  { href: "/tip",     label: "Tip" },
  { href: "/history", label: "History" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const agentId = isConnected && address ? "#"+address.slice(2,7).toUpperCase() : "#——";

  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FD", color: "#0A1628", fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* NAV — CSS Grid 3 col: logo | links | wallet */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid #E2EAF8", boxShadow: "0 1px 3px rgba(39,117,202,0.06)",
        height: 64,
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", height: "100%", padding: "0 24px",
          display: "grid", gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center", gap: 16,
        }}>
          {/* LEFT — Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", justifySelf: "start" }}>
            <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Image src="/arcstation-logo.svg" alt="Statio" width={26} height={26} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>Statio</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#2775CA", background: "#EBF2FD", border: "1px solid #C5D9F5", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>TESTNET</span>
          </Link>

          {/* CENTER — Nav links (luôn ở giữa cố định) */}
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{
                  padding: "7px 14px", borderRadius: 8, fontSize: 14,
                  fontWeight: active ? 700 : 500, textDecoration: "none",
                  color: active ? "#2775CA" : "#6B8DB8",
                  background: active ? "#EBF2FD" : "transparent",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* RIGHT — Agent + Wallet */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifySelf: "end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#EBF2FD", border: "1px solid #C5D9F5", borderRadius: 10, padding: "5px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2775CA" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#2775CA", fontFamily: "JetBrains Mono, monospace" }} suppressHydrationWarning>
                Agent {agentId}
              </span>
            </div>
            <ConnectButton label="Connect" accountStatus="avatar" showBalance={false} chainStatus="none" />
          </div>
        </div>
      </nav>

      {/* MAIN */}
      <main style={{ paddingTop: 64, minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  );
}
