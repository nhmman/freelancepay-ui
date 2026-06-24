"use client";
import Link from "next/link";
import Image from "next/image";

const APPS = [
  {
    href: "/pay",
    icon: "🔗",
    title: "Pay Link",
    desc: "Get paid in USDC instantly. Share your link, receive in seconds.",
    tag: "Freelancers",
    color: "#2775CA",
    bg: "#EBF2FD",
  },
  {
    href: "/payroll",
    icon: "💸",
    title: "Payroll",
    desc: "Pay your team in USDC. Batch transfers, track history.",
    tag: "Teams",
    color: "#1A7A4A",
    bg: "#D1FAE5",
  },
  {
    href: "/escrow",
    icon: "🔒",
    title: "Escrow",
    desc: "Lock USDC for a job. Release when delivered, refund if not.",
    tag: "Contracts",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    href: "/tip",
    icon: "⚡",
    title: "Tip",
    desc: "Send instant tips and microtransactions on Arc.",
    tag: "Micro",
    color: "#D97706",
    bg: "#FEF3C7",
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F4F7FD", fontFamily: "Inter, -apple-system, sans-serif" }}>
      {/* NAV */}
      <nav style={{ background: "white", borderBottom: "1px solid #E2EAF8", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#0A0D12", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #2A3545" }}>
            <Image src="/arcstation-logo.svg" alt="ArcStation" width={22} height={22} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.3px" }}>ArcStation</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#2775CA", background: "#EBF2FD", border: "1px solid #C5D9F5", padding: "2px 7px", borderRadius: 4 }}>TESTNET</span>
        </div>
        <Link href="/pay" style={{ background: "#2775CA", color: "white", padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Open App →
        </Link>
      </nav>

      {/* HERO */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 24px 60px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#EBF2FD", border: "1px solid #C5D9F5", borderRadius: 20, padding: "4px 14px", marginBottom: 24 }}>
          <div style={{ width: 6, height: 6, background: "#2775CA", borderRadius: "50%" }}></div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#2775CA", fontFamily: "JetBrains Mono, monospace" }}>Built on Arc · Powered by Circle USDC</span>
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 900, color: "#0A1628", letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 20 }}>
          Payments OS<br/>
          <span style={{ color: "#2775CA" }}>for Freelancers</span>
        </h1>
        <p style={{ fontSize: 18, color: "#4A6B8A", lineHeight: 1.7, marginBottom: 36, maxWidth: 520, margin: "0 auto 36px" }}>
          Send, receive, and manage USDC payments on Arc. Sub-second finality. No bank required.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/pay" style={{ background: "#2775CA", color: "white", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 800, textDecoration: "none", boxShadow: "0 4px 16px rgba(39,117,202,0.3)" }}>
            Get your Pay Link →
          </Link>
          <Link href="/escrow" style={{ background: "white", color: "#0A1628", padding: "14px 32px", borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: "none", border: "1.5px solid #E2EAF8" }}>
            Try Escrow
          </Link>
        </div>
      </div>

      {/* APPS GRID */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4A6B8A", textAlign: "center", marginBottom: 20 }}>
          Everything you need
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {APPS.map(app => (
            <Link key={app.href} href={app.href} style={{ background: "white", border: "1.5px solid #E2EAF8", borderRadius: 18, padding: "24px 24px 20px", textDecoration: "none", display: "block", transition: "box-shadow 0.2s", boxShadow: "0 2px 12px rgba(39,117,202,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, background: app.bg, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                  {app.icon}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0A1628" }}>{app.title}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: app.color, background: app.bg, padding: "1px 8px", borderRadius: 10, display: "inline-block" }}>{app.tag}</div>
                </div>
              </div>
              <div style={{ fontSize: 14, color: "#4A6B8A", lineHeight: 1.6 }}>{app.desc}</div>
              <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: app.color }}>Open {app.title} →</div>
            </Link>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: "1px solid #E2EAF8", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 12, color: "#4A6B8A", fontFamily: "JetBrains Mono, monospace" }}>
          ArcStation · Arc Testnet · Circle USDC · Agent #15994
        </div>
      </div>
    </div>
  );
}
