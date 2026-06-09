"use client";
import { useState } from "react";
import { useAccount } from "wagmi";
import Layout from "./components/Layout";
import Link from "next/link";
import PayLinkCard from "./components/PayLinkCard";

const FEATURES = [
  { href:"/milestones", icon:"📋", title:"Multi-Milestone", desc:"Project-based escrow with automatic USDC release", tag:"ESCROW" },
  { href:"/nanopay",    icon:"⚡", title:"Nanopayments",    desc:"Pay-per-use API calls via Arc x402 protocol",     tag:"x402"    },
  { href:"/reputation", icon:"⭐", title:"Reputation",      desc:"ERC-8004 score unlocks better rates and instant settlement", tag:"ERC-8004" },
  { href:"/jobs",       icon:"🤖", title:"Smart Jobs",      desc:"On-chain job contracts with deliverable verification", tag:"ERC-8183" },
  { href:"/invoice",    icon:"🧾", title:"AI Invoice",      desc:"AI-generated invoices with one-click USDC payment", tag:"AI" },
  { href:"/portfolio",  icon:"📊", title:"Portfolio",       desc:"Multi-currency balance, FX rates, payout history", tag:"FX" },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount]       = useState("1.00");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<any>(null);
  const [error, setError]         = useState("");
  const addrOk = /^0x[a-fA-F0-9]{40}$/.test(recipient);

  const handlePayout = async () => {
    if (!addrOk) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res  = await fetch("/api/send", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ amount, recipientAddress: recipient }) });
      const data = await res.json();
      if (data.success) setResult(data.data); else setError(data.error);
    } catch(e:any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const S: React.CSSProperties = { fontFamily:"IBM Plex Mono,monospace" };

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{__html:".fc{transition:all 0.18s ease} .fc:hover{transform:translateY(-2px);border-color:#7FB99A44!important} @keyframes spin{to{transform:rotate(360deg)}}"}} />
      <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 24px"}}>

        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#7FB99A12",border:"1px solid #7FB99A33",borderRadius:99,padding:"5px 16px",fontSize:11,color:"#7FB99A",...S,marginBottom:20}}>
            BUILT ON ARC · ERC-8004 · CIRCLE USDC
          </div>
          <h1 style={{fontSize:46,fontWeight:900,letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:14,color:"#E8EDE9"}}>
            The Payment Layer for<br/>
            <span style={{background:"linear-gradient(135deg,#7FB99A,#A8C4B0,#D7E1D4)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Remote Freelancers Worldwide
            </span>
          </h1>
          <p style={{color:"#7A9E8A",fontSize:16,lineHeight:1.7,maxWidth:520,margin:"0 auto"}}>
            Trustless escrow, instant USDC payouts, on-chain reputation — no PayPal, no Upwork fees, no middlemen.
          </p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:32}}>
          {[
            ["Agent ID",   isConnected&&address ? "#"+address.slice(2,7).toUpperCase() : "—", isConnected?"ERC-8004 ✓":"Connect wallet", "#7FB99A"],
            ["Reputation", isConnected?"95/100":"—", isConnected?"Expert Tier ⭐":"Connect to check","#7FA8C9"],
            ["Network",    "Arc",   "Testnet · 5042002","#C4CFBE"],
            ["Protocol",   "USDC",  "Circle Native","#A8B5A2"],
          ].map(([l,v,sub,c])=>(
            <div key={l as string} style={{background:"#111813",border:"1px solid #1E2820",borderRadius:16,padding:"18px 20px"}}>
              <div style={{...S,fontSize:10,color:"#4A6A5A",marginBottom:8}}>{l}</div>
              <div style={{fontSize:22,fontWeight:800,color:c as string,marginBottom:4}}>{v}</div>
              <div style={{...S,fontSize:10,color:"#4A6A5A"}}>{sub}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:20,marginBottom:20}}>
          <div style={{background:"#111813",border:"1px solid #1E2820",borderRadius:20,padding:24}}>
            <div style={{...S,fontSize:10,color:"#7FB99A",marginBottom:14}}>// quick send</div>
            <h2 style={{fontSize:17,fontWeight:800,color:"#E8EDE9",marginBottom:4}}>Quick Send</h2>
            <p style={{color:"#6A8E7A",fontSize:13,marginBottom:20}}>Release USDC to any freelancer instantly</p>
            <div style={{marginBottom:14}}>
              <div style={{...S,fontSize:10,color:"#6A8E7A",marginBottom:6}}>RECIPIENT</div>
              <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x..."
                style={{width:"100%",background:"#0E1110",border:`1px solid ${recipient&&!addrOk?"#C47A7A44":recipient&&addrOk?"#7FB99A44":"#1E2820"}`,borderRadius:10,padding:"10px 12px",fontSize:12,...S,color:"#E8EDE9",outline:"none",boxSizing:"border-box"}} />
              {recipient&&!addrOk&&<div style={{...S,fontSize:10,color:"#C47A7A",marginTop:4}}>✗ Invalid address</div>}
            </div>
            <div style={{marginBottom:18}}>
              <div style={{...S,fontSize:10,color:"#6A8E7A",marginBottom:6}}>AMOUNT (USDC)</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01"
                style={{width:"100%",background:"#0E1110",border:"1px solid #1E2820",borderRadius:10,padding:"10px 12px",fontSize:20,fontWeight:700,color:"#E8EDE9",outline:"none",marginBottom:8,boxSizing:"border-box"}} />
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                {["1","5","10","50"].map(v=>(
                  <button key={v} onClick={()=>setAmount(v)} style={{padding:"7px 0",borderRadius:8,border:`1px solid ${amount===v?"#7FB99A44":"#1E2820"}`,background:amount===v?"#7FB99A18":"#0E1110",color:amount===v?"#7FB99A":"#6A8E7A",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handlePayout} disabled={loading||!addrOk}
              style={{width:"100%",padding:"13px",borderRadius:12,border:"none",cursor:addrOk?"pointer":"not-allowed",background:addrOk?"linear-gradient(135deg,#7FB99A,#5A9A7A)":"#1A2420",color:addrOk?"#0A0F0C":"#4A6A5A",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {loading?(<><div style={{width:16,height:16,border:"2px solid #0A0F0C33",borderTopColor:"#0A0F0C",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Sending...</>):`Send ${amount} USDC →`}
            </button>
            {error&&<div style={{marginTop:10,padding:"10px 12px",background:"#1A0E0E",border:"1px solid #3A1818",borderRadius:10,...S,fontSize:11,color:"#C47A7A"}}>✗ {error}</div>}
            {result&&(
              <div style={{marginTop:10,padding:"14px",background:"#0A1A10",border:"1px solid #7FB99A33",borderRadius:12}}>
                <div style={{...S,fontSize:10,color:"#7FB99A",marginBottom:6}}>✓ CONFIRMED</div>
                <div style={{...S,fontSize:10,color:"#4A6A5A",marginBottom:2}}>TX HASH</div>
                <div style={{...S,fontSize:10,color:"#7FA8C9",wordBreak:"break-all",marginBottom:6}}>{result.txHash}</div>
                {result.explorerUrl&&<a href={result.explorerUrl} target="_blank" rel="noopener noreferrer" style={{...S,fontSize:10,color:"#7FB99A"}}>View on ArcScan ↗</a>}
              </div>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(2,1fr)",gap:12}}>
            {FEATURES.map(f=>(
              <Link key={f.href} href={f.href} className="fc"
                style={{background:"#111813",border:"1px solid #1E2820",borderRadius:16,padding:20,textDecoration:"none",display:"flex",flexDirection:"column"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <span style={{fontSize:22}}>{f.icon}</span>
                  <span style={{...S,fontSize:9,color:"#7FB99A",background:"#7FB99A12",border:"1px solid #7FB99A22",padding:"2px 8px",borderRadius:20}}>{f.tag}</span>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#E8EDE9",marginBottom:6}}>{f.title}</div>
                <div style={{fontSize:12,color:"#6A8E7A",lineHeight:1.6,flex:1}}>{f.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        <PayLinkCard />

        <div style={{background:"#111813",border:"1px solid #1E2820",borderRadius:14,padding:"20px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#E8EDE9",marginBottom:4}}>2 billion remote workers deserve better payment rails</div>
            <div style={{fontSize:13,color:"#6A8E7A"}}>No PayPal freezes · No 20% Upwork fees · Instant USDC settlement</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {["Arc Testnet","Circle USDC","ERC-8004"].map(t=>(
              <span key={t} style={{...S,fontSize:11,color:"#6A8E7A",background:"#1A2420",border:"1px solid #1E2820",borderRadius:8,padding:"6px 12px"}}>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
