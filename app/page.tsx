"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Layout from "./components/Layout";
import Link from "next/link";

const BASE = "https://earn.arcstation.xyz/pay/";
const short = (a: string) => a.slice(0,6)+"..."+a.slice(-4);
const M: React.CSSProperties = { fontFamily:"IBM Plex Mono,monospace" };

const FEATURES = [
  { href:"/milestones", icon:"📋", title:"Multi-Milestone Escrow", tag:"ESCROW" },
  { href:"/nanopay",    icon:"⚡", title:"Nanopayments x402",      tag:"x402"    },
  { href:"/reputation", icon:"⭐", title:"Reputation Pricing",     tag:"ERC-8004" },
  { href:"/jobs",       icon:"🤖", title:"Smart Jobs",             tag:"ERC-8183" },
  { href:"/invoice",    icon:"🧾", title:"AI Invoice",             tag:"AI"       },
  { href:"/portfolio",  icon:"📊", title:"Portfolio & FX",         tag:"FX"       },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const [username, setUsername]   = useState("");
  const [saved, setSaved]         = useState(false);
  const [copied, setCopied]       = useState(false);
  const [amount, setAmount]       = useState("5");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState("");

  const addrOk = /^0x[a-fA-F0-9]{40}$/.test(recipient);
  const slug   = saved && username.trim() ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g,"") : address?.toLowerCase() ?? "";
  const link   = slug ? BASE + slug : null;
  const agentId = isConnected && address ? "#"+address.slice(2,7).toUpperCase() : "—";

  const copy = () => { if(!link) return; navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const send = async () => {
    if (!addrOk) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await fetch("/api/send",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({amount,recipientAddress:recipient})});
      const data = await res.json();
      if(data.success) setResult(data.data); else setError(data.error);
    } catch(e:any){ setError(e.message); } finally { setLoading(false); }
  };

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{__html:`
        *{box-sizing:border-box}
        .fc{transition:all 0.18s} .fc:hover{transform:translateY(-2px);border-color:#7FB99A55!important}
        input{color:#E8EDE9} input::placeholder{color:#4A6A5A} input:focus{outline:none}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{transform:scale(0.95);opacity:0}100%{transform:scale(1);opacity:1}}
        .pop{animation:pop 0.25s ease}
      `}}/>
      <div style={{maxWidth:960,margin:"0 auto",padding:"36px 24px"}}>

        {/* ── HERO ── */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#7FB99A12",border:"1px solid #7FB99A33",borderRadius:99,padding:"5px 16px",fontSize:11,color:"#7FB99A",...M,marginBottom:16}}>
            BUILT ON ARC · ERC-8004 · CIRCLE USDC
          </div>
          <h1 style={{fontSize:38,fontWeight:900,letterSpacing:"-1.2px",lineHeight:1.1,color:"#E8EDE9",marginBottom:10}}>
            Get Paid in USDC.<br/>
            <span style={{background:"linear-gradient(135deg,#7FB99A,#A8C4B0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Instantly. Globally. Free.
            </span>
          </h1>
          <p style={{color:"#7A9E8A",fontSize:15,lineHeight:1.7,maxWidth:440,margin:"0 auto"}}>
            Create your Pay Link, share it anywhere — clients send you USDC in seconds.
          </p>
        </div>

        {/* ── PAY LINK CARD (MAIN) ── */}
        <div style={{background:"linear-gradient(135deg,#111F16,#0E1A12)",border:"1px solid #7FB99A44",borderRadius:24,padding:32,marginBottom:24}}>
          <div style={{...M,fontSize:10,color:"#7FB99A",letterSpacing:"0.14em",marginBottom:20}}>// YOUR PAY LINK</div>

          {!isConnected ? (
            <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:16,padding:"24px 0"}}>
              <div style={{fontSize:40}}>🔗</div>
              <div style={{fontSize:18,fontWeight:800,color:"#E8EDE9"}}>Connect your wallet to get started</div>
              <div style={{color:"#6A8E7A",fontSize:14,marginBottom:8}}>Your personal Pay Link will be created instantly</div>
              <ConnectButton label="Connect Wallet" />
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:24,alignItems:"center"}}>
              <div>
                <div style={{marginBottom:16}}>
                  <div style={{...M,fontSize:10,color:"#6A8E7A",marginBottom:8}}>CUSTOM USERNAME (optional)</div>
                  <div style={{display:"flex",gap:8}}>
                    <input
                      value={username} onChange={e=>setUsername(e.target.value)} placeholder="yourname"
                      style={{flex:1,background:"#0E1110",border:"1px solid #1E2820",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#E8EDE9",...M}}
                    />
                    <button onClick={()=>{setSaved(true);}} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"#7FB99A22",color:"#7FB99A",fontSize:13,fontWeight:700,cursor:"pointer",...M}}>
                      Save
                    </button>
                  </div>
                  <div style={{...M,fontSize:10,color:"#4A6A5A",marginTop:6}}>
                    Only letters, numbers, underscore. Leave blank to use wallet address.
                  </div>
                </div>
                <div style={{background:"#0E1110",border:"1px solid #7FB99A33",borderRadius:12,padding:"14px 18px"}}>
                  <div style={{...M,fontSize:10,color:"#4A6A5A",marginBottom:6}}>YOUR LINK</div>
                  <div style={{fontSize:16,fontWeight:700,color:"#E8EDE9"}}>
                    earn.arcstation.xyz/pay/<span style={{color:"#7FB99A"}}>{slug ? (slug.startsWith("0x") ? short(slug) : slug) : "..."}</span>
                  </div>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column" as const,gap:10,minWidth:140}}>
                <button onClick={copy} style={{padding:"13px 24px",borderRadius:12,border:"none",cursor:"pointer",background:copied?"#7FB99A22":"linear-gradient(135deg,#7FB99A,#5A9A7A)",color:copied?"#7FB99A":"#0A0F0C",fontSize:14,fontWeight:800,transition:"all 0.2s",whiteSpace:"nowrap" as const}}>
                  {copied?"✓ Copied!":"📋 Copy Link"}
                </button>
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" style={{...M,fontSize:11,color:"#4A7A5A",textAlign:"center" as const,textDecoration:"none"}}>
                    Preview ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── AGENT STATS ── */}
        {isConnected && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}} className="pop">
            {[
              ["Agent ID",   agentId,    "ERC-8004 Identity","#7FB99A"],
              ["Reputation", "95/100",   "Expert Tier ⭐",   "#7FA8C9"],
              ["Network",    "Arc",      "Testnet · 5042002","#C4CFBE"],
              ["Wallet",     short(address!), "Connected ✓", "#A8B5A2"],
            ].map(([l,v,sub,c])=>(
              <div key={l as string} style={{background:"#111813",border:"1px solid #1E2820",borderRadius:14,padding:"14px 16px"}}>
                <div style={{...M,fontSize:10,color:"#4A6A5A",marginBottom:6}}>{l}</div>
                <div style={{fontSize:18,fontWeight:800,color:c as string,marginBottom:2}}>{v}</div>
                <div style={{...M,fontSize:10,color:"#4A6A5A"}}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── QUICK SEND ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>
          <div style={{background:"#111813",border:"1px solid #1E2820",borderRadius:20,padding:24}}>
            <div style={{...M,fontSize:10,color:"#7FB99A",marginBottom:12}}>// quick send</div>
            <h3 style={{fontSize:16,fontWeight:800,color:"#E8EDE9",marginBottom:16}}>Send USDC to Anyone</h3>
            <div style={{marginBottom:12}}>
              <div style={{...M,fontSize:10,color:"#6A8E7A",marginBottom:6}}>RECIPIENT ADDRESS</div>
              <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x..."
                style={{width:"100%",background:"#0E1110",border:`1px solid ${recipient&&!addrOk?"#C47A7A44":recipient&&addrOk?"#7FB99A44":"#1E2820"}`,borderRadius:10,padding:"10px 12px",fontSize:12,...M}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{...M,fontSize:10,color:"#6A8E7A",marginBottom:6}}>AMOUNT</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01"
                style={{width:"100%",background:"#0E1110",border:"1px solid #1E2820",borderRadius:10,padding:"10px 12px",fontSize:20,fontWeight:700,color:"#E8EDE9",marginBottom:8}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                {["1","5","10","50"].map(v=>(
                  <button key={v} onClick={()=>setAmount(v)} style={{padding:"7px 0",borderRadius:8,border:`1px solid ${amount===v?"#7FB99A44":"#1E2820"}`,background:amount===v?"#7FB99A18":"#0E1110",color:amount===v?"#7FB99A":"#6A8E7A",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={send} disabled={loading||!addrOk}
              style={{width:"100%",padding:"12px",borderRadius:12,border:"none",cursor:addrOk?"pointer":"not-allowed",background:addrOk?"linear-gradient(135deg,#7FB99A,#5A9A7A)":"#1A2420",color:addrOk?"#0A0F0C":"#4A6A5A",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?(<><div style={{width:15,height:15,border:"2px solid #0A0F0C33",borderTopColor:"#0A0F0C",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Sending...</>):`Send ${amount} USDC →`}
            </button>
            {error&&<div style={{marginTop:10,...M,fontSize:11,color:"#C47A7A"}}>✗ {error}</div>}
            {result&&<div style={{marginTop:10,padding:"12px",background:"#0A1A10",border:"1px solid #7FB99A33",borderRadius:10,...M,fontSize:11,color:"#7FB99A"}}>✓ Sent! <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{color:"#7FA8C9"}}>ArcScan ↗</a></div>}
          </div>

          {/* Features */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(2,1fr)",gap:10}}>
            {FEATURES.map(f=>(
              <Link key={f.href} href={f.href} className="fc"
                style={{background:"#111813",border:"1px solid #1E2820",borderRadius:14,padding:16,textDecoration:"none",display:"flex",flexDirection:"column" as const}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <span style={{fontSize:20}}>{f.icon}</span>
                  <span style={{...M,fontSize:9,color:"#7FB99A",background:"#7FB99A12",border:"1px solid #7FB99A22",padding:"2px 7px",borderRadius:20}}>{f.tag}</span>
                </div>
                <div style={{fontSize:12,fontWeight:700,color:"#E8EDE9",lineHeight:1.4}}>{f.title}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{...M,fontSize:11,color:"#2A3A30",textAlign:"center" as const}}>
          FreelancePay · ArcStation · Arc Testnet · Circle USDC · ERC-8004 · ERC-8183
        </div>
      </div>
    </Layout>
  );
}
