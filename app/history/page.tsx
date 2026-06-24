"use client";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Layout from "../components/Layout";

const USDC = "0x3600000000000000000000000000000000000000".toLowerCase();
const EXPLORER = "https://testnet.arcscan.app";
const API = `${EXPLORER}/api/v2`;
const M: React.CSSProperties = { fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", fontWeight: 600 };

const short = (a: string) => a ? a.slice(0, 6) + "..." + a.slice(-4) : "";

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const s = Math.floor((Date.now() - then) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

type Tx = {
  hash: string;
  direction: "in" | "out";
  counterparty: string;
  amount: string;
  time: string;
};

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => { setMounted(true); }, []);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(false);
    const me = address.toLowerCase();
    try {
      const [ttRes, txRes] = await Promise.all([
        fetch(`${API}/addresses/${address}/token-transfers?type=ERC-20`),
        fetch(`${API}/addresses/${address}/transactions`),
      ]);
      const ttData = ttRes.ok ? await ttRes.json() : { items: [] };
      const txData = txRes.ok ? await txRes.json() : { items: [] };

      const erc20: Tx[] = (ttData?.items ?? [])
        .filter((it: any) => (it?.token?.address_hash ?? it?.token?.address ?? "").toLowerCase() === USDC || it?.token?.symbol === "USDC")
        .map((it: any) => {
          const decimals = parseInt(it?.token?.decimals ?? "6", 10);
          const raw = it?.total?.value ?? "0";
          const isOut = (it?.from?.hash ?? "").toLowerCase() === me;
          return {
            hash: it?.tx_hash ?? it?.transaction_hash ?? "",
            direction: isOut ? "out" : "in",
            counterparty: isOut ? (it?.to?.hash ?? "") : (it?.from?.hash ?? ""),
            amount: (Number(raw) / 10 ** decimals).toLocaleString("en-US", { maximumFractionDigits: 2 }),
            time: it?.timestamp ?? "",
          } as Tx;
        });

      const native: Tx[] = (txData?.items ?? [])
        .filter((it: any) => { const v = it?.value ?? "0"; return v !== "0" && v !== "" && v != null; })
        .map((it: any) => {
          const raw = it?.value ?? "0";
          const isOut = (it?.from?.hash ?? "").toLowerCase() === me;
          return {
            hash: it?.hash ?? "",
            direction: isOut ? "out" : "in",
            counterparty: isOut ? (it?.to?.hash ?? "") : (it?.from?.hash ?? ""),
            amount: (Number(raw) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 2 }),
            time: it?.timestamp ?? "",
          } as Tx;
        });

      const byHash = new Map<string, Tx>();
      [...erc20, ...native].forEach((t) => { if (t.hash) byHash.set(t.hash, t); });
      const merged = Array.from(byHash.values()).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      setTxs(merged);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { if (address) load(); }, [address, load]);

  const totalIn = txs.filter((t) => t.direction === "in").reduce((s, t) => s + parseFloat(t.amount.replace(/,/g, "")), 0);
  const totalOut = txs.filter((t) => t.direction === "out").reduce((s, t) => s + parseFloat(t.amount.replace(/,/g, "")), 0);

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg)}} .row:hover{background:#F4F7FD!important}` }} />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", color: "#0A1628" }}>

        <div style={{ ...M, fontSize: 15, color: "#2775CA", marginBottom: 8 }}>// payment history · on-chain</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", marginBottom: 6 }}>Your USDC Activity</h1>
        <p style={{ color: "#3B5878", fontWeight: 600, fontSize: 15, marginBottom: 28 }}>Real transactions read directly from Arc Testnet.</p>

        {!mounted || !isConnected ? (
          <div style={{ background: "#F4F7FD", border: "1px solid #2775CA33", borderRadius: 18, padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>&#128220;</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Connect wallet to see your history</div>
            <div style={{ ...M, fontSize: 15, color: "#3B5878", fontWeight: 600, marginBottom: 18 }}>Every USDC payment, on-chain and verifiable</div>
            <div style={{ display: "flex", justifyContent: "center" }}><ConnectButton label="Connect Wallet" /></div>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              <div style={{ background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#3B5878", fontWeight: 600, marginBottom: 6 }}>RECEIVED &#8595;</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#1A7A4A" }}>${totalIn.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
              </div>
              <div style={{ background: "#FFFBEB", border: "1px solid #2A2018", borderRadius: 16, padding: "18px 20px" }}>
                <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#A08868", marginBottom: 6 }}>SENT &#8593;</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: "#F59E0B" }}>${totalOut.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#3B5878", fontWeight: 600 }}>{txs.length} TRANSACTION{txs.length !== 1 ? "S" : ""}</div>
              <button onClick={load} disabled={loading} style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#2775CA", background: "#EBF2FD", border: "1px solid #2775CA33", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                {loading ? "Loading..." : "\u21bb Refresh"}
              </button>
            </div>

            {loading && txs.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ width: 36, height: 36, border: "3px solid #E2EAF8", borderTopColor: "#2775CA", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                <div style={{ ...M, fontSize: 15, color: "#3B5878", fontWeight: 600 }}>Reading the chain...</div>
              </div>
            ) : error ? (
              <div style={{ background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 14, padding: "20px", textAlign: "center", ...M, fontSize: 15, color: "#DC2626" }}>
                Couldn&apos;t load history. <button onClick={load} style={{ color: "#7FA8C9", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Try again</button>
              </div>
            ) : txs.length === 0 ? (
              <div style={{ background: "#F4F7FD", border: "1px solid #E2EAF8", borderRadius: 14, padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>&#127793;</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#3B5878", fontWeight: 600, marginBottom: 6 }}>No USDC transactions yet</div>
                <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#3B5878", fontWeight: 600 }}>Send or receive USDC to see it here</div>
              </div>
            ) : (
              <div style={{ background: "#F4F7FD", border: "1px solid #E2EAF8", borderRadius: 16, overflow: "hidden" }}>
                {txs.map((t, i) => (
                  <a key={t.hash + i} href={`${EXPLORER}/tx/${t.hash}`} target="_blank" rel="noopener noreferrer" className="row"
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderBottom: i < txs.length - 1 ? "1px solid #F0F5FF" : "none", textDecoration: "none", transition: "background 0.15s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
                      background: t.direction === "in" ? "#DCFCE7" : "#FEF3C7", color: t.direction === "in" ? "#1A7A4A" : "#2775CA" }}>
                      {t.direction === "in" ? "\u2193" : "\u2191"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#0A1628" }}>
                        {t.direction === "in" ? "Received" : "Sent"}
                      </div>
                      <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#3B5878", fontWeight: 600 }}>
                        {t.direction === "in" ? "from " : "to "}{short(t.counterparty)} · {timeAgo(t.time)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: t.direction === "in" ? "#1A7A4A" : "#2775CA" }}>
                        {t.direction === "in" ? "+" : "\u2212"}${t.amount}
                      </div>
                      <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#3B5878", fontWeight: 600, fontWeight: 500 }}>USDC ↗</div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            <div style={{ ...M, fontSize: 15, fontWeight: 600, fontWeight: 600, color: "#3B5878", fontWeight: 600, fontWeight: 500, textAlign: "center", marginTop: 20 }}>
              Data from Arc Testnet via Blockscout · arcstation.xyz
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
