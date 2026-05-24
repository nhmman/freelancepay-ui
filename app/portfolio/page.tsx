"use client";
import { useState } from "react";
import Layout from "../components/Layout";

const VND_RATE = 25400;
const EUR_RATE = 0.92;

interface SwapResult {
  txHash: string;
  amountIn: string;
  amountOut: string;
  tokenIn: string;
  tokenOut: string;
}

const BALANCES = [
  { token: "USDC", amount: "125.50", icon: "💵", color: "text-blue-400", chain: "Arc Testnet" },
  { token: "EURC", amount: "48.23", icon: "💶", color: "text-purple-400", chain: "Arc Testnet" },
];

export default function PortfolioPage() {
  const [balances, setBalances] = useState(BALANCES);
  const [swapAmount, setSwapAmount] = useState("10");
  const [swapFrom, setSwapFrom] = useState("USDC");
  const [swapTo, setSwapTo] = useState("EURC");
  const [slippage, setSlippage] = useState("0.5");
  const [showConfirm, setShowConfirm] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [showVND, setShowVND] = useState(false);
  const [txHistory, setTxHistory] = useState<SwapResult[]>([]);

  const rate = swapFrom === "USDC" ? EUR_RATE : 1 / EUR_RATE;
  const estimatedOut = (parseFloat(swapAmount || "0") * rate * (1 - 0.0002)).toFixed(4);
  const priceImpact = "0.01";
  const totalUSD = balances.reduce((sum, b) => {
    const usd = b.token === "USDC" ? parseFloat(b.amount) : parseFloat(b.amount) / EUR_RATE;
    return sum + usd;
  }, 0);

  const doSwap = async () => {
    setSwapping(true);
    setSwapResult(null);
    setShowConfirm(false);
    try {
      const res = await fetch("/api/portfolio/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: swapAmount, tokenIn: swapFrom, tokenOut: swapTo }),
      });
      const data = await res.json();
      if (data.success) {
        setSwapResult(data);
        setTxHistory((prev) => [data, ...prev]);
        setBalances((prev) => prev.map((b) => {
          if (b.token === swapFrom) return { ...b, amount: (parseFloat(b.amount) - parseFloat(swapAmount)).toFixed(2) };
          if (b.token === swapTo) return { ...b, amount: (parseFloat(b.amount) + parseFloat(data.amountOut)).toFixed(4) };
          return b;
        }));
      } else alert("Error: " + data.error);
    } finally {
      setSwapping(false);
    }
  };

  return (
    <Layout>
      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13141a] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-lg mb-4">Confirm Swap</h3>
            <div className="space-y-3 mb-6">
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">You pay</p>
                <p className="text-2xl font-bold">{swapAmount} <span className="text-blue-400">{swapFrom}</span></p>
              </div>
              <div className="flex justify-center -my-1 z-10 relative">
                <div className="w-8 h-8 rounded-full bg-[#13141a] border border-white/10 flex items-center justify-center">↓</div>
              </div>
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">You receive (estimated)</p>
                <p className="text-2xl font-bold">{estimatedOut} <span className="text-purple-400">{swapTo}</span></p>
              </div>
            </div>
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Rate</span>
                <span>1 {swapFrom} = {rate.toFixed(4)} {swapTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Price impact</span>
                <span className="text-green-400">{"<"}{priceImpact}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Slippage tolerance</span>
                <span>{slippage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Provider fee</span>
                <span>0.02%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Network</span>
                <span className="text-cyan-400">Arc Testnet</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-medium">
                Cancel
              </button>
              <button onClick={doSwap}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 rounded-xl py-3 text-sm font-semibold">
                Confirm Swap
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono">MULTI-CURRENCY</span>
            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full font-mono">ARC FX</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">Portfolio Dashboard</h1>
          <p className="text-gray-500">USDC + EURC · Real-time VND conversion · Arc Testnet</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left — Balances + History */}
          <div className="col-span-2 space-y-4">
            {/* Total */}
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/5 border border-cyan-500/20 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Portfolio Value</p>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-bold">
                      {showVND ? "₫" + Math.round(totalUSD * VND_RATE).toLocaleString() : "$" + totalUSD.toFixed(2)}
                    </p>
                    <button onClick={() => setShowVND(!showVND)}
                      className="mb-1 text-xs bg-white/10 hover:bg-white/20 border border-white/10 px-2 py-1 rounded-lg">
                      {showVND ? "USD" : "VND"}
                    </button>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-cyan-400 font-medium">Arc Testnet</p>
                  <p className="text-xs text-gray-600 mt-0.5">Chain: 5042002</p>
                </div>
              </div>
              <div className="flex rounded-full overflow-hidden h-1.5 mb-2">
                {balances.map((b) => {
                  const usd = b.token === "USDC" ? parseFloat(b.amount) : parseFloat(b.amount) / EUR_RATE;
                  return <div key={b.token} style={{ width: (usd / totalUSD * 100) + "%" }}
                    className={"h-full " + (b.token === "USDC" ? "bg-blue-500" : "bg-purple-500")} />;
                })}
              </div>
              <div className="flex gap-4">
                {balances.map((b) => {
                  const usd = b.token === "USDC" ? parseFloat(b.amount) : parseFloat(b.amount) / EUR_RATE;
                  return <div key={b.token} className="flex items-center gap-1.5">
                    <div className={"w-2 h-2 rounded-full " + (b.token === "USDC" ? "bg-blue-500" : "bg-purple-500")} />
                    <span className="text-xs text-gray-400">{b.token}: {(usd / totalUSD * 100).toFixed(1)}%</span>
                  </div>;
                })}
              </div>
            </div>

            {/* Token Cards */}
            <div className="grid grid-cols-2 gap-4">
              {balances.map((b) => {
                const usd = b.token === "USDC" ? parseFloat(b.amount) : parseFloat(b.amount) / EUR_RATE;
                return (
                  <div key={b.token} className="bg-white/3 border border-white/8 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{b.icon}</span>
                        <div>
                          <p className="font-semibold">{b.token}</p>
                          <p className="text-xs text-gray-500">{b.chain}</p>
                        </div>
                      </div>
                      <div className={"w-2 h-2 rounded-full " + (b.token === "USDC" ? "bg-blue-500" : "bg-purple-500")} />
                    </div>
                    <p className={"text-3xl font-bold mb-1 " + b.color}>{b.amount}</p>
                    <p className="text-gray-500 text-sm">${usd.toFixed(2)} USD</p>
                    <p className="text-gray-600 text-xs">≈ ₫{Math.round(usd * VND_RATE).toLocaleString()} VND</p>
                  </div>
                );
              })}
            </div>

            {/* Swap Result */}
            {swapping && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Executing swap on Arc Testnet...</p>
              </div>
            )}

            {swapResult && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-green-400">✓</span>
                  <p className="text-green-400 font-semibold">Swap Successful</p>
                </div>
                <div className="flex items-center gap-3 text-sm mb-3">
                  <div className="bg-white/5 rounded-xl px-4 py-2.5 flex-1 text-center">
                    <p className="text-gray-500 text-xs mb-0.5">Sold</p>
                    <p className="font-bold">{swapResult.amountIn} {swapResult.tokenIn}</p>
                  </div>
                  <span className="text-gray-600 text-lg">→</span>
                  <div className="bg-white/5 rounded-xl px-4 py-2.5 flex-1 text-center">
                    <p className="text-gray-500 text-xs mb-0.5">Received</p>
                    <p className="font-bold text-green-400">{swapResult.amountOut} {swapResult.tokenOut}</p>
                  </div>
                </div>
                <a href={"https://testnet.arcscan.app/tx/" + swapResult.txHash}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 font-mono">
                  {swapResult.txHash?.slice(0, 28)}... view →
                </a>
              </div>
            )}

            {/* TX History */}
            {txHistory.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <h3 className="font-semibold mb-3 text-sm">Transaction History</h3>
                <div className="space-y-2">
                  {txHistory.map((tx, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-white/3 rounded-xl px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">SWAP</span>
                        <span className="text-gray-300">{tx.amountIn} {tx.tokenIn} → {tx.amountOut} {tx.tokenOut}</span>
                      </div>
                      <a href={"https://testnet.arcscan.app/tx/" + tx.txHash}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:text-blue-300">
                        {tx.txHash?.slice(0, 10)}... →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — Swap Panel */}
          <div className="col-span-1">
            <div className="bg-[#13141a] border border-white/8 rounded-2xl p-5 sticky top-20">
              {/* Swap Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Swap</h3>
                <button className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1 rounded-lg text-gray-400">
                  ⚙ {slippage}%
                </button>
              </div>

              {/* From Token */}
              <div className="bg-white/5 rounded-xl p-4 mb-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">You pay</p>
                  <p className="text-xs text-gray-500">Balance: {balances.find(b => b.token === swapFrom)?.amount}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)}
                    className="flex-1 bg-transparent text-2xl font-bold focus:outline-none w-0"
                    type="number" placeholder="0.0" />
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-sm">{swapFrom === "USDC" ? "💵" : "💶"}</span>
                    <select value={swapFrom} onChange={(e) => { setSwapFrom(e.target.value); setSwapTo(e.target.value === "USDC" ? "EURC" : "USDC"); }}
                      className="bg-[#1a1b23] text-white text-sm font-semibold focus:outline-none cursor-pointer">
                      <option value="USDC">USDC</option>
                      <option value="EURC">EURC</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ≈ ${swapFrom === "USDC" ? parseFloat(swapAmount || "0").toFixed(2) : (parseFloat(swapAmount || "0") / EUR_RATE).toFixed(2)}
                </p>
              </div>

              {/* Swap direction button */}
              <div className="flex justify-center my-1">
                <button onClick={() => { setSwapFrom(swapTo); setSwapTo(swapFrom); }}
                  className="w-9 h-9 rounded-xl bg-[#13141a] border-2 border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all hover:rotate-180 duration-300">
                  ⇅
                </button>
              </div>

              {/* To Token */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-500">You receive</p>
                  <p className="text-xs text-gray-500">Balance: {balances.find(b => b.token === swapTo)?.amount}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-2xl font-bold text-cyan-400">{estimatedOut}</p>
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-1.5">
                    <span className="text-sm">{swapTo === "USDC" ? "💵" : "💶"}</span>
                    <span className="text-sm font-semibold">{swapTo}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ≈ ${swapTo === "USDC" ? parseFloat(estimatedOut).toFixed(2) : (parseFloat(estimatedOut) / EUR_RATE).toFixed(2)}
                </p>
              </div>

              {/* Rate info */}
              <div className="bg-white/3 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Rate</span>
                  <span>1 {swapFrom} = {rate.toFixed(4)} {swapTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price impact</span>
                  <span className="text-green-400">{"< 0.01%"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Min received</span>
                  <span>{(parseFloat(estimatedOut) * (1 - parseFloat(slippage) / 100)).toFixed(4)} {swapTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Fee</span>
                  <span>0.02% · Arc Testnet</span>
                </div>
              </div>

              {/* Slippage */}
              <div className="flex gap-2 mb-4">
                {["0.1", "0.5", "1.0"].map((s) => (
                  <button key={s} onClick={() => setSlippage(s)}
                    className={"flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all " +
                      (slippage === s
                        ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                        : "bg-white/3 border-white/8 text-gray-400 hover:border-white/20")}>
                    {s}%
                  </button>
                ))}
              </div>

              <button onClick={() => setShowConfirm(true)}
                disabled={swapping || !swapAmount || parseFloat(swapAmount) <= 0}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl py-3.5 font-semibold text-sm transition-all">
                {swapping ? "Swapping..." : `Swap ${swapAmount} ${swapFrom} → ${swapTo}`}
              </button>

              {/* VND Rates */}
              <div className="mt-4 bg-white/3 border border-white/5 rounded-xl p-3">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">VND Rates</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">1 USDC</span>
                    <span className="text-yellow-400">₫{VND_RATE.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">1 EURC</span>
                    <span className="text-purple-400">₫{Math.round(VND_RATE / EUR_RATE).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
