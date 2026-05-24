"use client";
import { useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";

const SERVICES = [
  { id: "translate", name: "Translation API", description: "Translate text to English", price: "0.001", unit: "per 100 words", icon: "🌐" },
  { id: "analyze", name: "Data Analysis API", description: "Analyze and summarize data", price: "0.005", unit: "per query", icon: "📊" },
  { id: "review", name: "Code Review API", description: "Review and score code quality", price: "0.010", unit: "per function", icon: "🔍" },
];

interface Transaction {
  id: string;
  service: string;
  amount: string;
  txHash: string;
  timestamp: string;
  result: string;
}

export default function NanopayPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({
    translate: "Xin chao, toi la freelancer Viet Nam",
    analyze: "Sales: Jan 100, Feb 120, Mar 95, Apr 140",
    review: "function add(a, b) { return a + b; }",
  });
  const [totalSpent, setTotalSpent] = useState(0);

  const callService = async (serviceId: string, price: string, serviceName: string) => {
    setLoading(serviceId);
    try {
      const res = await fetch("/api/nanopay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, input: inputs[serviceId], amount: price }),
      });
      const data = await res.json();
      if (data.success) {
        setTransactions((prev) => [{
          id: Date.now().toString(),
          service: serviceName,
          amount: price,
          txHash: data.txHash,
          timestamp: new Date().toLocaleTimeString(),
          result: data.result,
        }, ...prev]);
        setTotalSpent((prev) => prev + parseFloat(price));
      } else {
        alert("Error: " + data.error);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <Layout>
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">Back</Link>
          <div>
            <h1 className="text-2xl font-bold">Nanopayments</h1>
            <p className="text-gray-400 text-sm">Pay-per-use API · Arc x402 Protocol</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Total Spent</p>
            <p className="text-yellow-400 font-bold text-lg">{totalSpent.toFixed(4)} USDC</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">API Calls</p>
            <p className="text-blue-400 font-bold text-lg">{transactions.length}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Protocol</p>
            <p className="text-green-400 font-bold text-lg">x402</p>
            <p className="text-gray-500 text-xs">Arc Testnet</p>
          </div>
        </div>

        <div className="grid gap-4 mb-8">
          {SERVICES.map((service) => (
            <div key={service.id} className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{service.icon}</span>
                  <div>
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-gray-400 text-sm">{service.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold">{service.price} USDC</p>
                  <p className="text-gray-500 text-xs">{service.unit}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  value={inputs[service.id]}
                  onChange={(e) => setInputs({ ...inputs, [service.id]: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => callService(service.id, service.price, service.name)}
                  disabled={loading === service.id}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                >
                  {loading === service.id ? "Paying..." : "Pay & Call"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {transactions.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="font-semibold mb-4">Payment History</h2>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-400 text-sm font-medium">✅ {tx.service} · {tx.timestamp}</span>
                    <span className="text-yellow-400 text-sm font-bold">-{tx.amount} USDC</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2 bg-gray-900 rounded p-2">{tx.result}</p>
                  <a href={"https://testnet.arcscan.app/tx/" + tx.txHash}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300">
                    {tx.txHash.slice(0, 20)}... view on ArcScan
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
