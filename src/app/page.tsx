"use client";
import { useState } from "react";

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
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl">💸</div>
          <div>
            <h1 className="text-2xl font-bold">FreelancePay</h1>
            <p className="text-gray-400 text-sm">AI Payment Agent on Arc · Built with Circle USDC</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Agent ID</p>
            <p className="text-green-400 font-bold text-lg">15994</p>
            <p className="text-gray-500 text-xs">ERC-8004 ✓</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Reputation</p>
            <p className="text-blue-400 font-bold text-lg">95/100</p>
            <p className="text-gray-500 text-xs">On-chain ✓</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Network</p>
            <p className="text-purple-400 font-bold text-lg">Arc</p>
            <p className="text-gray-500 text-xs">Testnet ✓</p>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
          <h2 className="font-semibold mb-5">💰 Release Milestone Payment</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Freelancer Wallet Address</label>
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-blue-500"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Amount (USDC)</label>
              <div className="flex gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
                  placeholder="1.00"
                  type="number"
                  step="0.01"
                />
                {["1.00","5.00","10.00"].map((v) => (
                  <button key={v} onClick={() => setAmount(v)}
                    className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm hover:border-blue-500 transition-colors">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handlePayout} disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Processing...</>
              ) : (<>💸 Release {amount} USDC to Freelancer</>)}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 mb-4 text-red-400 text-sm">❌ {error}</div>
        )}

        {result && (
          <div className="bg-green-950 border border-green-800 rounded-xl p-5">
            <p className="font-semibold text-green-400 mb-3">✅ Payment Successful!</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount</span>
                <span>{amount} USDC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">State</span>
                <span className="text-green-400">{result.state}</span>
              </div>
              <div className="pt-2 border-t border-green-900">
                <p className="text-gray-400 text-xs mb-1">TX Hash</p>
                <p className="font-mono text-xs text-blue-400 break-all">{result.txHash}</p>
              </div>
              {result.explorerUrl && (
                <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer"
                  className="block text-center bg-green-900 hover:bg-green-800 rounded-lg py-2 text-sm text-green-300 mt-2">
                  View on ArcScan →
                </a>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-gray-600 text-xs">
          Built on Arc Testnet · ERC-8004 Identity · Circle USDC · Agent ID 15994
        </div>
      </div>
    </main>
  );
}
