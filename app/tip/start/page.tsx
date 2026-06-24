"use client";
import { useState } from "react";
import Link from "next/link";

const STEPS = [
  {
    id: 1,
    icon: "🦊",
    title: "Install MetaMask",
    desc: "Download MetaMask browser extension if you don't have it yet.",
    action: { label: "Get MetaMask →", url: "https://metamask.io/download/" },
    detail: "MetaMask is the most popular Web3 wallet. It takes 2 minutes to set up.",
  },
  {
    id: 2,
    icon: "⚙️",
    title: "Add Arc Testnet to MetaMask",
    desc: "Configure your wallet to connect to Arc Testnet.",
    action: null,
    detail: null,
    config: {
      "Network name": "Arc Testnet",
      "RPC URL": "https://rpc.testnet.arc.network",
      "Chain ID": "5042002",
      "Currency symbol": "USDC",
      "Explorer": "https://testnet.arcscan.app",
    },
    steps: [
      "Open MetaMask",
      "Click Settings → Networks → Add network",
      "Click \"Add a network manually\"",
      "Fill in the details below",
      "Click Save → Switch to Arc Testnet",
    ],
  },
  {
    id: 3,
    icon: "🚰",
    title: "Get free test USDC",
    desc: "Request free USDC from the Circle Faucet to use for tips.",
    action: { label: "Go to Faucet →", url: "https://faucet.circle.com" },
    detail: "Select Arc Testnet + USDC → Paste your wallet address → Get free USDC in seconds.",
  },
  {
    id: 4,
    icon: "💸",
    title: "Send your first tip!",
    desc: "Go to a creator page and send a USDC tip. It arrives in under 1 second.",
    action: { label: "Tip @leo →", url: "/tip/leo" },
    detail: "No gas fees. No waiting. Tips settle instantly on Arc.",
  },
];

export default function StartPage() {
  const [completed, setCompleted] = useState<number[]>([]);
  const [copied, setCopied] = useState<string>("");

  const copyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(value);
    setTimeout(() => setCopied(""), 2000);
  };

  const toggleStep = (id: number) => {
    setCompleted((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-[#0a0b0d]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm">💸</div>
            <span className="font-bold text-lg">ArcTip</span>
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">TESTNET</span>
          </Link>
          <Link href="/tip/leo" className="text-sm bg-gradient-to-r from-yellow-500 to-orange-500 px-4 py-2 rounded-xl font-medium">
            Try it now →
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-1.5 text-yellow-400 text-xs font-medium mb-4">
            ⚡ Takes about 5 minutes
          </div>
          <h1 className="text-3xl font-bold mb-2">Get Started with ArcTip</h1>
          <p className="text-gray-400">Follow these 4 steps to send your first USDC tip on Arc</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={"w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all " +
                (completed.includes(s.id)
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-white/5 border-white/20 text-gray-400")}>
                {completed.includes(s.id) ? "✓" : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={"flex-1 h-0.5 " + (completed.includes(s.id) ? "bg-green-500" : "bg-white/10")} />
              )}
            </div>
          ))}
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {STEPS.map((step) => (
            <div key={step.id}
              className={"border rounded-2xl p-6 transition-all " +
                (completed.includes(step.id)
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-white/3 border-white/8")}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{step.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Step {step.id}</span>
                      {completed.includes(step.id) && (
                        <span className="text-xs text-green-400 font-medium">✓ Done</span>
                      )}
                    </div>
                    <h2 className="font-semibold">{step.title}</h2>
                  </div>
                </div>
                <button onClick={() => toggleStep(step.id)}
                  className={"text-xs px-3 py-1.5 rounded-lg border transition-all " +
                    (completed.includes(step.id)
                      ? "bg-green-500/20 border-green-500/30 text-green-400"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20")}>
                  {completed.includes(step.id) ? "Completed ✓" : "Mark done"}
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-4">{step.desc}</p>

              {/* Step-by-step instructions */}
              {step.steps && (
                <div className="mb-4">
                  <ol className="space-y-1">
                    {step.steps.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-xs flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Config table */}
              {step.config && (
                <div className="bg-black/30 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Network settings</p>
                  <div className="space-y-2">
                    {Object.entries(step.config).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-200">{value}</span>
                          <button onClick={() => copyValue(value)}
                            className="text-xs text-gray-600 hover:text-yellow-400 transition-colors">
                            {copied === value ? "✓" : "copy"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detail note */}
              {step.detail && (
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-300">{step.detail}</p>
                </div>
              )}

              {/* Action button */}
              {step.action && (
                <a href={step.action.url}
                  target={step.action.url.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 px-4 py-2 rounded-xl text-sm font-medium transition-all">
                  {step.action.label}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Done! */}
        {completed.length === STEPS.length && (
          <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">🎉</p>
            <h3 className="font-bold text-green-400 text-lg mb-1">You're ready!</h3>
            <p className="text-gray-400 text-sm mb-4">You can now send USDC tips on Arc Testnet</p>
            <Link href="/tip/leo"
              className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-3 rounded-xl font-bold text-sm">
              Send Your First Tip →
            </Link>
          </div>
        )}

        {/* Share guide */}
        <div className="mt-8 bg-white/3 border border-white/8 rounded-2xl p-5 text-center">
          <p className="text-sm text-gray-400 mb-3">Share this guide with friends</p>
          <div className="flex gap-3 justify-center">
            <a href="https://twitter.com/intent/tweet?text=Try%20ArcTip%20-%20instant%20USDC%20tips%20on%20Arc%20Testnet!%20Get%20started%20in%205%20minutes&url=https://arctip.vercel.app/start"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-sm transition-all">
              🐦 Share on X
            </a>
            <Link href="/tip/leo"
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 px-4 py-2 rounded-xl text-sm font-medium transition-all">
              💸 Try ArcTip
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
