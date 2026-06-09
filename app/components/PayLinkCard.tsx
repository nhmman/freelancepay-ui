"use client";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

const BASE = "https://earn.arcstation.xyz/pay/";
const shortAddr = (a: string) => a.slice(0,6)+"..."+a.slice(-4);

export default function PayLinkCard() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const link = isConnected && address ? BASE + address.toLowerCase() : null;
  const copy = () => { if(!link) return; navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div style={{ background:"linear-gradient(135deg,#111F16,#0E1A12)", border:"1px solid #7FB99A33", borderRadius:20, padding:"28px 32px", marginBottom:24, display:"flex", alignItems:"center", justifyContent:"space-between", gap:24, flexWrap:"wrap" as const }}>
      <div style={{ flex:1 }}>
        <div style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:10, color:"#7FB99A", letterSpacing:"0.12em", marginBottom:8 }}>YOUR PAY LINK</div>
        {isConnected && link ? (
          <>
            <div style={{ fontSize:16, fontWeight:800, color:"#E8EDE9", marginBottom:6 }}>
              earn.arcstation.xyz/pay/<span style={{ color:"#7FB99A" }}>{shortAddr(address!)}</span>
            </div>
            <div style={{ fontSize:13, color:"#6A8E7A" }}>Share this link — anyone can pay you in USDC instantly. No sign-up. No fees.</div>
          </>
        ) : (
          <>
            <div style={{ fontSize:18, fontWeight:800, color:"#E8EDE9", marginBottom:6 }}>Get your personal Pay Link</div>
            <div style={{ fontSize:13, color:"#6A8E7A" }}>Connect wallet to generate your link and receive USDC from anyone.</div>
          </>
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column" as const, gap:10, alignItems:"flex-end" }}>
        {isConnected && link ? (
          <>
            <button onClick={copy} style={{ padding:"12px 24px", borderRadius:12, border:"none", cursor:"pointer", background:copied?"#7FB99A22":"linear-gradient(135deg,#7FB99A,#5A9A7A)", color:copied?"#7FB99A":"#0A0F0C", fontSize:13, fontWeight:700, transition:"all 0.2s" }}>
              {copied ? "✓ Copied!" : "📋 Copy Link"}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontFamily:"IBM Plex Mono,monospace", fontSize:11, color:"#4A7A5A" }}>Preview ↗</a>
          </>
        ) : (
          <ConnectButton label="Connect to Get Link" />
        )}
      </div>
    </div>
  );
}
