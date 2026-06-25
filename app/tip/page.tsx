"use client";
import Layout from "../components/Layout";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, isAddress } from "viem";

const USDC = "0x3600000000000000000000000000000000000000" as `0x${string}`;
const ABI = [{ name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }] as const;

const FEATURED = [
  { name: "Leo", tag: "Builder · Vietnam 🇻🇳", wallet: "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c" as `0x${string}` },
  { name: "Arc Builder", tag: "Developer", wallet: "0x93c8dc4755580a3820e564d89caa273773515c8d" as `0x${string}` },
  { name: "Viet Dev", tag: "Developer · Vietnam 🇻🇳", wallet: "0x30Bd48CC5f4C3d4A166b79A6e0D5Fc8dB0083248" as `0x${string}` },
];

const AMOUNTS = ["1", "3", "5", "10"];

function App() {
  const params = useSearchParams();
  const urlWallet = params.get("to") || "";
  const urlName = params.get("name") || "";

  const [tab, setTab] = useState<"tip"|"create">("tip");
  const [mode, setMode] = useState<"featured"|"custom">(urlWallet ? "custom" : "featured");
  const [selected, setSelected] = useState(FEATURED[0]);
  const [customWallet, setCustomWallet] = useState(urlWallet);
  const [customName, setCustomName] = useState(urlName);
  const [amount, setAmount] = useState("3");
  const [note, setNote] = useState("");
  const [myWallet, setMyWallet] = useState("");
  const [myName, setMyName] = useState("");
  const [copied, setCopied] = useState(false);


  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address, token: USDC });
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const toWallet = mode === "custom" ? customWallet as `0x${string}` : selected.wallet;
  const toName = mode === "custom" ? (customName || customWallet.slice(0,8)+"...") : selected.name;
  const canSend = isAddress(toWallet) && !!amount && parseFloat(amount) > 0;

  const tip = () => { if (canSend) writeContract({ address: USDC, abi: ABI, functionName: "transfer", args: [toWallet, parseUnits(amount, 6)] }); };

  const myLink = myWallet && isAddress(myWallet)
    ? `https://arcstation.xyz/tip?to=${myWallet}&name=${encodeURIComponent(myName)}`
    : "";
  const copyLink = () => {
    if (myLink) {
      navigator.clipboard.writeText(myLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const F = {
    page: { paddingTop: 8, background: "#F4F7FD", color: "#0A1628" } as React.CSSProperties,
    mono: { fontFamily: "'IBM Plex Mono', 'SF Mono', monospace" },
    sans: { fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  };

  return (
    <Layout>
      <div style={{ ...F.page, ...F.sans, paddingTop: 0 }} suppressHydrationWarning>

      {/* NAV */}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px 48px" }}>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 40, background: "#FFFFFF", borderRadius: 10, padding: 4, width: "fit-content" }}>
          {[["tip", "💸 Send a tip"], ["create", "🔗 My tip link"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as "tip"|"create")}
              style={{ padding: "8px 18px", background: tab === key ? "#E2EAF8" : "none", border: tab === key ? "1px solid #E2EAF8" : "1px solid transparent", borderRadius: 8, color: tab === key ? "#0A1628" : "#4A6B8A", fontSize: 14, cursor: "pointer", fontWeight: tab === key ? 600 : 400, transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ═══ TIP TAB ═══ */}
        {tab === "tip" && (
          <>
            {isSuccess ? (
              // SUCCESS
              <div style={{ textAlign: "center", paddingTop: 32 }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✓</div>
                <h2 style={{ fontSize: 26, fontWeight: 700, color: "#0A1628", marginBottom: 8 }}>Sent!</h2>
                <p style={{ color: "#4A6B8A", fontSize: 15, marginBottom: 28 }}>
                  <strong style={{ color: "#0A1628" }}>${amount} USDC</strong> → {toName}
                  {note && <span style={{ color: "#4A6B8A" }}> · "{note}"</span>}
                </p>
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "block", background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 8, padding: "12px 16px", marginBottom: 20, color: "#2775CA", fontSize: 12, ...F.mono, wordBreak: "break-all", textDecoration: "none" }}>
                  {txHash} ↗
                </a>
                <button onClick={() => { reset(); setNote(""); }}
                  style={{ width: "100%", padding: "14px", background: "#E2EAF8", border: "1px solid #E2EAF8", borderRadius: 10, color: "#0A1628", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  Send another →
                </button>
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: "#0A1628", marginBottom: 6, lineHeight: 1.2 }}>
                  Tip with USDC ⚡
                </h1>
                <p style={{ color: "#4A6B8A", fontSize: 14, marginBottom: 36 }}>
                  Settles in under 1 second on Arc · No fees
                </p>

                {/* ── WHO ARE YOU TIPPING? ── */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4A6B8A", marginBottom: 14, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Who are you tipping?</div>

                  {/* Featured creators */}
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 14 }}>
                    {FEATURED.map((c) => {
                      const isSelected = mode === "featured" && selected.wallet === c.wallet;
                      return (
                        <button key={c.wallet} onClick={() => { setMode("featured"); setSelected(c); }}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: isSelected ? "#FFFFFF" : "#F4F7FD", border: `1px solid ${isSelected ? "#2775CA" : "#E2EAF8"}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s", textAlign: "left" as const }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: isSelected ? "#0A1628" : "#4A6B8A" }}>{c.name}</div>
                            <div style={{ fontSize: 12, color: "#6B8DB8", marginTop: 2 }}>{c.tag}</div>
                          </div>
                          <div style={{ fontSize: 12, color: isSelected ? "#2775CA" : "#E2EAF8", fontWeight: 600 }}>
                            {isSelected ? "● selected" : "tip →"}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* TIP ANY WALLET — prominent */}
                  <div style={{ background: mode === "custom" ? "#FFFFFF" : "#F4F7FD", border: `2px solid ${mode === "custom" ? "#2775CA" : "#1A7A4A"}`, borderRadius: 12, padding: "16px", transition: "all 0.2s" }}>
                    <button onClick={() => setMode(mode === "custom" ? "featured" : "custom")}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: mode === "custom" ? 14 : 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1A7A4A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🎯</div>
                        <div style={{ textAlign: "left" as const }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#1A7A4A" }}>Tip any wallet address</div>
                          <div style={{ fontSize: 12, color: "#6B8DB8", marginTop: 1 }}>Enter any Arc Testnet address</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 18, color: "#1A7A4A" }}>{mode === "custom" ? "▲" : "▼"}</span>
                    </button>

                    {mode === "custom" && (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                        <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Recipient name (optional)"
                          style={{ padding: "12px 14px", background: "#F4F7FD", border: "1px solid #E2EAF8", borderRadius: 8, color: "#0A1628", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                        <input value={customWallet} onChange={(e) => setCustomWallet(e.target.value)} placeholder="0x... wallet address on Arc Testnet"
                          style={{ padding: "12px 14px", background: "#F4F7FD", border: `1px solid ${customWallet ? (isAddress(customWallet) ? "#1A7A4A" : "#DC2626") : "#E2EAF8"}`, borderRadius: 8, color: "#0A1628", fontSize: 13, ...F.mono, outline: "none", width: "100%", boxSizing: "border-box" as const }} />
                        {isAddress(customWallet) && <div style={{ fontSize: 13, color: "#1A7A4A" }}>✓ Valid address</div>}
                        {customWallet && !isAddress(customWallet) && <div style={{ fontSize: 13, color: "#DC2626" }}>✗ Invalid address</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── AMOUNT ── */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4A6B8A", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Amount (USDC)</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {AMOUNTS.map((v) => (
                      <button key={v} onClick={() => setAmount(v)}
                        style={{ flex: 1, padding: "12px 8px", background: amount === v ? "#2775CA" : "#FFFFFF", border: `1px solid ${amount === v ? "#2775CA" : "#E2EAF8"}`, borderRadius: 8, color: amount === v ? "#fff" : "#4A6B8A", fontSize: 16, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                        ${v}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input value={!AMOUNTS.includes(amount) ? amount : ""} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Custom amount"
                      style={{ flex: 1, padding: "12px 14px", background: "#FFFFFF", border: `1px solid ${!AMOUNTS.includes(amount) && amount ? "#2775CA" : "#E2EAF8"}`, borderRadius: 8, color: "#0A1628", fontSize: 14, outline: "none" }} />
                    {amount && parseFloat(amount) > 0 && (
                      <span style={{ fontSize: 13, color: "#6B8DB8", whiteSpace: "nowrap" as const }}>
                        ≈ ₫{Math.round(parseFloat(amount) * 25400).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── MESSAGE ── */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#4A6B8A", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>
                    Message <span style={{ color: "#6B8DB8", textTransform: "none" as const, fontWeight: 400, letterSpacing: 0 }}>— optional</span>
                  </div>
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Say something to ${toName}...`}
                    style={{ width: "100%", padding: "12px 14px", background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 8, color: "#0A1628", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
                </div>

                {/* ── BALANCE ── */}
                {isConnected && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#FFFFFF", border: "1px solid #21262d", borderRadius: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 14, color: "#4A6B8A" }}>Your USDC balance</span>
                    <div style={{ textAlign: "right" as const }}>
                      <span suppressHydrationWarning style={{ fontSize: 16, fontWeight: 700, color: bal && parseFloat(bal.formatted) > 0 ? "#1A7A4A" : "#DC2626" }}>
                        {bal ? parseFloat(bal.formatted).toFixed(2) : "0.00"} USDC
                      </span>
                      {(!bal || parseFloat(bal.formatted) === 0) && (
                        <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                          style={{ display: "block", fontSize: 12, color: "#2775CA", textDecoration: "none" }}>
                          Get free test USDC →
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* ── ERROR ── */}
                {error && (
                  <div style={{ padding: "12px 16px", background: "#FEF2F2", border: "1px solid #f8514933", borderRadius: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 13, color: "#DC2626" }}>
                      {error.message?.includes("chain") ? "⚠ Switch to Arc Testnet in MetaMask"
                        : error.message?.includes("insufficient") ? "⚠ Insufficient USDC — get some from the faucet"
                        : "⚠ Transaction failed. Try again."}
                    </span>
                  </div>
                )}

                {/* ── CTA ── */}
                {!isConnected ? (
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 12, padding: "24px", textAlign: "center" as const }}>
                    <p style={{ color: "#4A6B8A", fontSize: 14, marginBottom: 16 }}>Connect your wallet to send a tip</p>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><ConnectButton /></div>
                    <a href="/start" style={{ fontSize: 13, color: "#2775CA", textDecoration: "none" }}>First time? Setup guide →</a>
                  </div>
                ) : (
                  <button onClick={tip} disabled={isPending || confirming || !canSend}
                    style={{ width: "100%", padding: "16px", background: canSend && !isPending && !confirming ? "#1A7A4A" : "#FFFFFF", border: `1px solid ${canSend ? "#1A7A4A" : "#E2EAF8"}`, borderRadius: 10, color: canSend ? "#fff" : "#6B8DB8", fontSize: 16, fontWeight: 700, cursor: !canSend ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {isPending ? "⏳ Confirm in MetaMask..."
                      : confirming ? "⏳ Settling on Arc..."
                      : `💸 Send $${amount} USDC → ${toName}`}
                  </button>
                )}

                <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", fontSize: 12, color: "#E2EAF8" }}>
                  <span style={{ ...F.mono }}>ARC_TESTNET · 5042002</span>
                  <span>&lt;1s finality · ~$0.01 gas</span>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ CREATE TAB ═══ */}
        {tab === "create" && (
          <>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0A1628", marginBottom: 8 }}>Your tip link 🔗</h1>
            <p style={{ color: "#4A6B8A", fontSize: 14, marginBottom: 36 }}>
              Share your link. Anyone can tip you USDC instantly on Arc.
            </p>

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4A6B8A", marginBottom: 12, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Your name</div>
              <input value={myName} onChange={(e) => setMyName(e.target.value)} placeholder="e.g. Leo, Viet Dev..."
                style={{ width: "100%", padding: "13px 16px", background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 8, color: "#0A1628", fontSize: 15, outline: "none", boxSizing: "border-box" as const }} />
            </div>

            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#4A6B8A", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Your wallet</div>
                {isConnected && (
                  <button onClick={() => setMyWallet(address || "")}
                    style={{ background: "#1f6feb22", border: "1px solid #388bfd44", borderRadius: 6, color: "#2775CA", fontSize: 12, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}>
                    Use connected wallet
                  </button>
                )}
              </div>
              <input value={myWallet} onChange={(e) => setMyWallet(e.target.value)} placeholder="0x... your Arc Testnet wallet"
                style={{ width: "100%", padding: "13px 16px", background: "#FFFFFF", border: `1px solid ${myWallet ? (isAddress(myWallet) ? "#1A7A4A" : "#DC2626") : "#E2EAF8"}`, borderRadius: 8, color: "#0A1628", fontSize: 13, ...F.mono, outline: "none", boxSizing: "border-box" as const }} />
              {isAddress(myWallet) && <div style={{ fontSize: 13, color: "#1A7A4A", marginTop: 8 }}>✓ Valid address</div>}
              {myWallet && !isAddress(myWallet) && <div style={{ fontSize: 13, color: "#DC2626", marginTop: 8 }}>✗ Invalid address</div>}
            </div>

            {myLink ? (
              <>
                <div style={{ background: "#F4F7FD", border: "1px solid #3fb95044", borderRadius: 10, padding: "16px", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: "#1A7A4A", marginBottom: 8, fontWeight: 600, ...F.mono }}>// your tip link</div>
                  <div style={{ fontSize: 12, color: "#4A6B8A", wordBreak: "break-all", lineHeight: 1.6, ...F.mono }}>{myLink}</div>
                </div>
                <button onClick={copyLink}
                  style={{ width: "100%", padding: "15px", background: copied ? "#D1FAE5" : "#1A7A4A", border: `1px solid ${copied ? "#3fb95044" : "#1A7A4A"}`, borderRadius: 10, color: copied ? "#1A7A4A" : "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginBottom: 12, transition: "all 0.2s" }}>
                  {copied ? "✓ Copied to clipboard!" : "📋 Copy your tip link"}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={`https://twitter.com/intent/tweet?text=Tip%20me%20USDC%20on%20Arc!%20${encodeURIComponent(myLink)}`} target="_blank" rel="noopener noreferrer"
                    style={{ flex: 1, padding: "11px", background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 8, color: "#4A6B8A", fontSize: 13, textDecoration: "none", textAlign: "center" as const, fontWeight: 500 }}>
                    Share on X →
                  </a>
                </div>
              </>
            ) : (
              <div style={{ padding: "28px", background: "#FFFFFF", border: "1px solid #21262d", borderRadius: 10, textAlign: "center" as const, color: "#6B8DB8", fontSize: 14 }}>
                Enter your name + wallet above to generate your link
              </div>
            )}

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #21262d" }}>
              <p style={{ fontSize: 13, color: "#6B8DB8", marginBottom: 8 }}>No testnet USDC yet?</p>
              <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 14, color: "#2775CA", textDecoration: "none" }}>
                Get free USDC from Circle Faucet →
              </a>
            </div>
          </>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #30363d; }
        button { font-family: inherit; }
        a:hover { opacity: 0.8; }
      `}</style>
    </div>
    </Layout>
  );
}

export default function Home() {
  return <Suspense fallback={<div style={{ background: "#F4F7FD", minHeight: "100vh" }} />}><App /></Suspense>;
}
