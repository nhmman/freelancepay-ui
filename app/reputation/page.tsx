"use client";
import { useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";

const TIERS = [
  { min: 0, max: 50, label: "Beginner", color: "gray", escrowDays: 7, maxAmount: 100, speedup: "Standard", badge: "🔰" },
  { min: 51, max: 80, label: "Verified", color: "blue", escrowDays: 3, maxAmount: 500, speedup: "Fast", badge: "✅" },
  { min: 81, max: 100, label: "Expert", color: "green", escrowDays: 0, maxAmount: 9999, speedup: "Instant", badge: "⭐" },
];

const getTier = (score: number) => TIERS.find((t) => score >= t.min && score <= t.max) || TIERS[0];

const getRate = (baseRate: number, score: number) => {
  if (score >= 81) return (baseRate * 1.5).toFixed(2);
  if (score >= 51) return (baseRate * 1.2).toFixed(2);
  return baseRate.toFixed(2);
};

export default function ReputationPage() {
  const [agentId, setAgentId] = useState("15994");
  const [reputation, setReputation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payResult, setPayResult] = useState<any>(null);
  const [amount, setAmount] = useState("1.00");

  const checkReputation = async () => {
    setLoading(true);
    setReputation(null);
    setPayResult(null);
    try {
      const res = await fetch("/api/reputation?agentId=" + agentId);
      const data = await res.json();
      if (data.success) setReputation(data.score);
    } finally {
      setLoading(false);
    }
  };

  const sendWithReputation = async () => {
    if (reputation === null) return;
    setPayLoading(true);
    setPayResult(null);
    try {
      const adjustedAmount = getRate(parseFloat(amount), reputation);
      const res = await fetch("/api/reputation/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, reputation, baseAmount: amount, adjustedAmount }) });
      const data = await res.json();
      if (data.success) setPayResult(data);
      else alert("Error: " + data.error);
    } finally {
      setPayLoading(false);
    }
  };

  const tier = reputation !== null ? getTier(reputation) : null;

  return (
    <Layout>
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">Back</Link>
          <div>
            <h1 className="text-2xl font-bold">Reputation-Based Pricing</h1>
            <p className="text-gray-400 text-sm">ERC-8004 score determines payment terms · Arc Testnet</p>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {TIERS.map((t) => (
            <div key={t.label}
              className={"rounded-xl p-4 border " +
                (t.label === "Expert" ? "bg-green-950 border-green-800" :
                 t.label === "Verified" ? "bg-blue-950 border-blue-800" :
                 "bg-gray-900 border-gray-800")}>
              <p className="text-lg mb-1">{t.badge}</p>
              <p className="font-bold">{t.label}</p>
              <p className="text-xs text-gray-400 mt-1">Score: {t.min}-{t.max}</p>
              <div className="mt-2 space-y-1 text-xs">
                <p className="text-gray-300">Escrow: <span className="font-medium">{t.escrowDays === 0 ? "Instant" : t.escrowDays + " days"}</span></p>
                <p className="text-gray-300">Max: <span className="font-medium">{t.maxAmount === 9999 ? "Unlimited" : "$" + t.maxAmount}</span></p>
                <p className="text-gray-300">Rate: <span className={"font-medium " + (t.label === "Expert" ? "text-green-400" : t.label === "Verified" ? "text-blue-400" : "text-gray-400")}>
                  {t.label === "Expert" ? "+50%" : t.label === "Verified" ? "+20%" : "Base"}
                </span></p>
              </div>
            </div>
          ))}
        </div>

        {/* Check Reputation */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="font-semibold mb-4">Check Agent Reputation</h2>
          <div className="flex gap-2 mb-4">
            <input value={agentId} onChange={(e) => setAgentId(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              placeholder="Agent ID (e.g. 15994)" />
            <button onClick={checkReputation} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-6 py-2 rounded-lg text-sm font-medium">
              {loading ? "Checking..." : "Check Score"}
            </button>
          </div>

          {reputation !== null && tier && (
            <div className={"rounded-xl p-5 border " +
              (tier.label === "Expert" ? "bg-green-950 border-green-800" :
               tier.label === "Verified" ? "bg-blue-950 border-blue-800" :
               "bg-gray-800 border-gray-700")}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold">{tier.badge} {reputation}/100</p>
                  <p className={"font-medium mt-1 " +
                    (tier.label === "Expert" ? "text-green-400" :
                     tier.label === "Verified" ? "text-blue-400" : "text-gray-400")}>
                    {tier.label} Tier
                  </p>
                </div>
                <div className="text-right text-sm space-y-1">
                  <p className="text-gray-300">Escrow: <span className="font-bold text-white">{tier.escrowDays === 0 ? "Instant ⚡" : tier.escrowDays + " days"}</span></p>
                  <p className="text-gray-300">Max project: <span className="font-bold text-white">{tier.maxAmount === 9999 ? "Unlimited" : "$" + tier.maxAmount}</span></p>
                </div>
              </div>

              {/* Payment with reputation */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400 mb-3">Send payment with reputation-adjusted rate:</p>
                <div className="flex gap-2 items-center mb-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Base Amount (USDC)</label>
                    <input value={amount} onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      type="number" step="0.01" />
                  </div>
                  <div className="text-gray-400 mt-5">→</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 mb-1 block">Adjusted Amount</label>
                    <div className={"w-full rounded-lg px-3 py-2 text-sm font-bold " +
                      (tier.label === "Expert" ? "bg-green-900 text-green-300" :
                       tier.label === "Verified" ? "bg-blue-900 text-blue-300" :
                       "bg-gray-800 text-gray-300")}>
                      {getRate(parseFloat(amount) || 0, reputation)} USDC
                      {tier.label !== "Beginner" && (
                        <span className="ml-2 text-xs font-normal">
                          (+{tier.label === "Expert" ? "50" : "20"}% reputation bonus)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={sendWithReputation} disabled={payLoading}
                  className={"w-full py-3 rounded-lg font-semibold text-sm transition-colors " +
                    (tier.label === "Expert" ? "bg-green-700 hover:bg-green-600" :
                     tier.label === "Verified" ? "bg-blue-700 hover:bg-blue-600" :
                     "bg-gray-700 hover:bg-gray-600") +
                    " disabled:bg-gray-700 disabled:cursor-not-allowed"}>
                  {payLoading ? "Processing..." : "Send " + getRate(parseFloat(amount) || 0, reputation) + " USDC with Reputation Bonus"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        {payResult && (
          <div className="bg-green-950 border border-green-800 rounded-xl p-5">
            <p className="font-semibold text-green-400 mb-3">✅ Payment Successful!</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Base amount</span>
                <span>{payResult.baseAmount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reputation bonus</span>
                <span className="text-green-400">+{payResult.bonus} USDC</span>
              </div>
              <div className="flex justify-between font-bold border-t border-green-900 pt-2">
                <span>Total paid</span>
                <span className="text-green-400">{payResult.adjustedAmount} USDC</span>
              </div>
              <div className="pt-2">
                <p className="text-gray-400 text-xs mb-1">TX Hash</p>
                <a href={"https://testnet.arcscan.app/tx/" + payResult.txHash}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 break-all">
                  {payResult.txHash} →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
