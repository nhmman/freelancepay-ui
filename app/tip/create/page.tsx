"use client";
import { useState } from "react";
import Link from "next/link";

export default function CreatePage() {
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [wallet, setWallet] = useState("");

  const previewUrl = handle ? `/tip/${handle}` : null;

  return (
    <div className="min-h-screen bg-[#0a0b0d]">
      <nav className="border-b border-white/5 bg-[#0a0b0d]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm">💸</div>
            <span className="font-bold text-lg">ArcTip</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create Your Tip Page</h1>
          <p className="text-gray-500">Set up your page and start receiving USDC tips on Arc</p>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Handle *</label>
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-yellow-500/50 transition-colors">
              <span className="px-3 text-gray-600 text-sm border-r border-white/10 py-3">arctip.app/tip/</span>
              <input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="flex-1 bg-transparent px-3 py-3 text-sm focus:outline-none"
                placeholder="yourname" />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Display Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 transition-colors"
              placeholder="Your Name" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-500/50 resize-none transition-colors"
              placeholder="What do you create? (optional)" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 block">Your Arc Wallet Address *</label>
            <input value={wallet} onChange={(e) => setWallet(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
              placeholder="0x..." />
            <p className="text-xs text-gray-600 mt-1">Tips will be sent directly to this wallet on Arc Testnet</p>
          </div>

          {previewUrl && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-xs text-yellow-400 font-medium mb-1">Your tip page URL</p>
              <p className="text-sm font-mono text-gray-300">arctip.vercel.app{previewUrl}</p>
            </div>
          )}

          <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 text-xs text-gray-400">
            <p className="text-blue-400 font-medium mb-1">⚠️ Testnet Demo</p>
            This is a demo on Arc Testnet. Wallets are added by the developer. In production, you'd sign and save your profile on-chain.
          </div>

          <Link href={previewUrl || "#"}
            className={"w-full block text-center py-3 rounded-xl font-bold text-sm transition-all " +
              (handle && name && wallet
                ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90"
                : "bg-white/10 text-gray-500 cursor-not-allowed")}>
            Preview My Tip Page →
          </Link>
        </div>
      </div>
    </div>
  );
}
