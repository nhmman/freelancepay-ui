"use client";
import { useState } from "react";
import Layout from "./components/Layout";
import Link from "next/link";

const FEATURES = [
  { href: "/milestones", icon: "📋", title: "Multi-Milestone", desc: "Project-based escrow with automatic USDC release", color: "from-blue-500/20 to-blue-600/5", border: "border-blue-500/20", tag: "ESCROW" },
  { href: "/nanopay", icon: "⚡", title: "Nanopayments", desc: "Pay-per-use API calls via Arc x402 protocol", color: "from-yellow-500/20 to-yellow-600/5", border: "border-yellow-500/20", tag: "x402" },
  { href: "/reputation", icon: "⭐", title: "Reputation Pricing", desc: "ERC-8004 score determines your payment tier", color: "from-purple-500/20 to-purple-600/5", border: "border-purple-500/20", tag: "ERC-8004" },
  { href: "/jobs", icon: "🤖", title: "Smart Jobs", desc: "On-chain job contracts with deliverable verification", color: "from-green-500/20 to-green-600/5", border: "border-green-500/20", tag: "ERC-8183" },
  { href: "/invoice", icon: "🧾", title: "AI Invoice", desc: "AI-generated invoices with instant USDC payment", color: "from-pink-500/20 to-pink-600/5", border: "border-pink-500/20", tag: "AI" },
  { href: "/portfolio", icon: "📊", title: "Portfolio", desc: "Multi-currency balance and FX conversion", color: "from-cyan-500/20 to-cyan-600/5", border: "border-cyan-500/20", tag: "FX" },
];

export default function Home() {
  const [amount, setAmount] = useState("1.00");
  const [recipient, setRecipient] = useState("0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handlePayout = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, recipientAddress: recipient }),
      });
      const data = await res.json();
      if (data.success) setResult(data.data);
      else setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 text-blue-400 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Built on Arc · ERC-8004 · Circle USDC
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            The Payment Layer for<br />Remote Freelancers Worldwide
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Trustless escrow, instant USDC payouts, and on-chain reputation — 
            no PayPal, no Upwork fees, no middlemen.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-12">
          {[
            { label: "Agent ID", value: "#15994", sub: "ERC-8004 ✓", color: "text-green-400" },
            { label: "Reputation", value: "95/100", sub: "Expert Tier ⭐", color: "text-blue-400" },
            { label: "Network", value: "Arc", sub: "Testnet · 5042002", color: "text-purple-400" },
            { label: "Protocol", value: "USDC", sub: "Circle Native", color: "text-yellow-400" },
          ].map((s) => (
            <div key={s.label} className="bg-white/3 border border-white/8 rounded-2xl p-5 backdrop-blur-sm">
              <p className="text-gray-500 text-xs mb-2">{s.label}</p>
              <p className={"text-2xl font-bold " + s.color}>{s.value}</p>
              <p className="text-gray-600 text-xs mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Quick Send */}
          <div className="col-span-1 bg-white/3 border border-white/8 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="font-semibold mb-1 text-lg">Quick Send</h2>
            <p className="text-gray-500 text-sm mb-6">Release USDC to freelancer instantly</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">Recipient</label>
                <input value={recipient} onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
                  placeholder="0x..." />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block uppercase tracking-wider">Amount (USDC)</label>
                <div className="flex gap-2 mb-2">
                  <input value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
                    type="number" step="0.01" />
                </div>
                <div className="flex gap-2">
                  {["1", "5", "10", "50"].map((v) => (
                    <button key={v} onClick={() => setAmount(v)}
                      className={"flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all " +
                        (amount === v
                          ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                          : "bg-white/3 border-white/8 text-gray-400 hover:border-white/20")}>
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handlePayout} disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                ) : (
                  <>Send {amount} USDC →</>
                )}
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs">{error}</div>
            )}

            {result && (
              <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-green-400 font-medium text-sm mb-2">✓ Payment confirmed</p>
                <p className="text-gray-400 text-xs mb-1">TX Hash</p>
                <p className="font-mono text-[10px] text-blue-400 break-all mb-2">{result.txHash}</p>
                <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline">
                  View on ArcScan →
                </a>
              </div>
            )}
          </div>

          {/* Feature Grid */}
          <div className="col-span-2 grid grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <Link key={f.href} href={f.href}
                className={"bg-gradient-to-br " + f.color + " border " + f.border + " rounded-2xl p-5 hover:scale-[1.02] transition-all group"}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{f.icon}</span>
                  <span className="text-[10px] bg-white/10 text-gray-400 px-2 py-0.5 rounded-full font-mono">{f.tag}</span>
                </div>
                <h3 className="font-semibold mb-1 group-hover:text-white transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom banner */}
        <div className="mt-12 bg-gradient-to-r from-blue-500/5 to-violet-500/5 border border-white/5 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold mb-1">2 billion remote workers deserve better payment rails</p>
            <p className="text-gray-500 text-sm">No PayPal freezes · No 20% Upwork fees · Instant USDC settlement</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">Arc Testnet</span>
            <span className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">Circle USDC</span>
            <span className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5">ERC-8004</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
