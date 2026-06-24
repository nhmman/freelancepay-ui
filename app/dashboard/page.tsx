"use client";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";

interface Payment {
  txHash: string;
  from: string;
  to: string;
  amount: string;
  type: string;
  label: string;
  timestamp: string;
}

interface Stats {
  totalReceived: string;
  totalPayments: number;
  totalSwaps: number;
  totalBridges: number;
}

const TYPE_CONFIG: Record<string, { color: string; icon: string; bg: string }> = {
  received: { color: "text-green-400", icon: "↓", bg: "bg-green-500/10 border-green-500/20" },
  swap: { color: "text-blue-400", icon: "⇄", bg: "bg-blue-500/10 border-blue-500/20" },
  bridge: { color: "text-purple-400", icon: "⇒", bg: "bg-purple-500/10 border-purple-500/20" },
  sent: { color: "text-yellow-400", icon: "↑", bg: "bg-yellow-500/10 border-yellow-500/20" } };

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (data.success) {
        setPayments(data.payments);
        setStats(data.stats);
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const short = (addr: string) => addr?.slice(0, 6) + "..." + addr?.slice(-4);
  const formatDate = (ts: string) => new Date(ts).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full font-mono">
                ON-CHAIN · ARC TESTNET
              </span>
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                VERIFIED
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Payment Dashboard</h1>
            <p className="text-gray-500">All on-chain transactions · Agent #15994 · ERC-8004</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            {lastUpdated && <p>Updated: {lastUpdated.toLocaleTimeString()}</p>}
            <button onClick={fetchData}
              className="mt-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1 rounded-lg transition-all">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Total Received</p>
            <p className="text-3xl font-bold text-green-400">{stats?.totalReceived || "—"}</p>
            <p className="text-gray-600 text-xs mt-1">USDC</p>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">All Transactions</p>
            <p className="text-3xl font-bold text-blue-400">{stats?.totalPayments || "—"}</p>
            <p className="text-gray-600 text-xs mt-1">on-chain</p>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Swaps</p>
            <p className="text-3xl font-bold text-blue-400">{stats?.totalSwaps || "—"}</p>
            <p className="text-gray-600 text-xs mt-1">USDC ⇄ EURC</p>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-gray-500 text-xs mb-2 uppercase tracking-wider">Bridges</p>
            <p className="text-3xl font-bold text-purple-400">{stats?.totalBridges || "—"}</p>
            <p className="text-gray-600 text-xs mt-1">cross-chain</p>
          </div>
        </div>

        {/* Transaction Feed */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Transaction History</h2>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
              <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((tx, i) => {
                const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.received;
                return (
                  <div key={i}
                    className="flex items-center justify-between bg-white/3 rounded-xl px-4 py-3 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                      <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs border " + cfg.bg + " " + cfg.color}>
                        {cfg.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.label}</p>
                        <p className="text-xs text-gray-500">
                          {short(tx.from)} → {short(tx.to)} · {formatDate(tx.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={"font-bold " + cfg.color}>
                        {tx.type === "received" ? "+" : ""}{parseFloat(tx.amount).toFixed(4)} USDC
                      </p>
                      <a href={"https://testnet.arcscan.app/tx/" + tx.txHash}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-mono">
                        {tx.txHash.slice(0, 14)}... →
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-700">
          All transactions verified on Arc Testnet · Chain ID 5042002
        </div>
      </div>
    </Layout>
  );
}
