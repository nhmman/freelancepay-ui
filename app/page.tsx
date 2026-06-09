"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, isAddress } from "viem";
import Layout from "./components/Layout";
import Link from "next/link";

const USDC    = "0x3600000000000000000000000000000000000000" as const;
const USDC_ABI = [{ name:"transfer", type:"function", stateMutability:"nonpayable", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] }] as const;
const BASE    = "https://earn.arcstation.xyz/pay/";
const short   = (a: string) => a.slice(0,6)+"..."+a.slice(-4);
const M: React.CSSProperties = { fontFamily:"IBM Plex Mono,monospace" };

const FEATURES = [
  { href:"/milestones", icon:"📋", title:"Multi-Milestone Escrow", tag:"ESCROW"  },
  { href:"/nanopay",    icon:"⚡", title:"Nanopayments x402",      tag:"x402"    },
  { href:"/reputation", icon:"⭐", title:"Reputation Pricing",     tag:"ERC-8004"},
  { href:"/jobs",       icon:"🤖", title:"Smart Jobs",             tag:"ERC-8183"},
  { href:"/invoice",    icon:"🧾", title:"AI Invoice",             tag:"AI"      },
  { href:"/portfolio",  icon:"📊", title:"Portfolio & FX",         tag:"FX"      },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const [username, setUsername]   = useState("");
  const [saved, setSaved]         = useState(false);
  const [copied, setCopied]       = useState(false);
  const [amount, setAmount]       = useState("5");
  const [recipient, setRecipient] = useState("");

  // Client-side send from connected wallet
  const { writeContract, data: txHash, isPending, isError: writeErr } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const addrOk = isAddress(recipient);
  const agentId = isConnected && address ? "#"+address.slice(2,7).toUpperCase() : "—";

  // Pay link slug — updates immediately when address changes
  const slug = saved && username.trim()
    ? username.trim().toLowerCase().replace(/[^a-z0-9_]/g,"")
    : address?.toLowerCase() ?? "";
  const link = slug ? BASE + slug : null;

  const copy = () => {
    if(!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  const send = () => {
    if(!addrOk || !amount) return;
    writeContract({
      address: USDC,
      abi: USDC_ABI,
      functionName: "transfer",
      args: [recipient as `0x${string}`, parseUnits(amount, 6)],
    });
  };

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{__html:`
        *{box-sizing:border-box}
        .fc{transition:all 0.18s} .fc:hover{transform:translateY(-2px);border-color:#7FB99A55!important}
        input{color:#E8EDE9!important} input::placeholder{color:#4A6A5A} input:focus{outline:none}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        .pop{animation:pop 0.3s ease}
      `}}/>
      <div style={{maxWidth:960,margin:"0 auto",padding:"40px 24px",color:"#E8EDE9"}}>

        {/* HERO */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"#7FB99A12",border:"1px solid #7FB99A33",borderRadius:99,padding:"6px 18px",fontSize:12,color:"#7FB99A",...M,marginBottom:20}}>
            BUILT ON ARC · ERC-8004 · CIRCLE USDC
          </div>
          <h1 style={{fontSize:52,fontWeight:900,letterSpacing:"-2px",lineHeight:1.05,color:"#E8EDE9",marginBottom:14}}>
            Get Paid in USDC.<br/>
            <span style={{background:"linear-gradient(135deg,#7FB99A,#A8C4B0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
              Instantly. Globally. Free.
            </span>
          </h1>
          <p style={{color:"#A8C4B0",fontSize:18,lineHeight:1.7,maxWidth:480,margin:"0 auto",fontWeight:400}}>
            Create your Pay Link — clients send USDC in seconds. No sign-up. No fees.
          </p>
        </div>

        {/* PAY LINK — MAIN FEATURE */}
        <div style={{background:"linear-gradient(135deg,#111F16,#0D1710)",border:"1px solid #7FB99A55",borderRadius:24,padding:"32px 36px",marginBottom:28}}>
          <div style={{...M,fontSize:11,color:"#7FB99A",letterSpacing:"0.14em",marginBottom:24}}>// YOUR PAY LINK</div>

          {!isConnected ? (
            <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",gap:16,padding:"16px 0 24px"}}>
              <div style={{fontSize:48}}>🔗</div>
              <h2 style={{fontSize:24,fontWeight:800,color:"#E8EDE9"}}>Connect wallet to get your Pay Link</h2>
              <p style={{color:"#7A9E8A",fontSize:15,marginBottom:8}}>Your personal payment link will be ready in seconds</p>
              <ConnectButton label="Connect Wallet" />
            </div>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:28,alignItems:"center"}}>
              <div>
                <div style={{marginBottom:20}}>
                  <div style={{...M,fontSize:11,color:"#7A9E8A",marginBottom:8,fontWeight:600}}>CUSTOM USERNAME (optional)</div>
                  <div style={{display:"flex",gap:10}}>
                    <input value={username} onChange={e=>{setUsername(e.target.value);setSaved(false);}} placeholder="yourname"
                      style={{flex:1,background:"#0E1110",border:"1px solid #2A3830",borderRadius:10,padding:"12px 16px",fontSize:16,fontWeight:600,...M}}/>
                    <button onClick={()=>setSaved(true)} style={{padding:"12px 20px",borderRadius:10,border:"none",background:"#7FB99A22",color:"#7FB99A",fontSize:14,fontWeight:700,cursor:"pointer",...M}}>
                      Save
                    </button>
                  </div>
                  <div style={{...M,fontSize:11,color:"#4A6A5A",marginTop:6}}>Letters, numbers, underscore only. Leave blank to use wallet address.</div>
                </div>

                <div style={{background:"#0A1208",border:"1px solid #7FB99A44",borderRadius:14,padding:"16px 20px"}}>
                  <div style={{...M,fontSize:11,color:"#4A6A5A",marginBottom:8}}>YOUR LINK</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#E8EDE9",wordBreak:"break-all" as const}}>
                    earn.arcstation.xyz/pay/
                    <span style={{color:"#7FB99A"}}>{slug ? (slug.startsWith("0x") ? short(slug) : slug) : "..."}</span>
                  </div>
                  <div style={{...M,fontSize:11,color:"#4A6A5A",marginTop:8}}>
                    Wallet: {short(address)} · Agent {agentId}
                  </div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column" as const,gap:12,minWidth:160}}>
                <button onClick={copy} style={{padding:"16px 28px",borderRadius:14,border:"none",cursor:"pointer",background:copied?"#7FB99A22":"linear-gradient(135deg,#7FB99A,#5A9A7A)",color:copied?"#7FB99A":"#0A0F0C",fontSize:16,fontWeight:800,transition:"all 0.2s",whiteSpace:"nowrap" as const}}>
                  {copied?"✓ Copied!":"📋 Copy Link"}
                </button>
                {link&&(
                  <a href={link} target="_blank" rel="noopener noreferrer" style={{...M,fontSize:12,color:"#5A8A6A",textAlign:"center" as const,textDecoration:"none"}}>
                    Preview my page ↗
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AGENT STATS */}
        {isConnected && (
          <div className="pop" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
            {([
              ["Agent ID",   agentId,          "ERC-8004 Identity","#7FB99A"],
              ["Reputation", "95/100",          "Expert Tier ⭐",  "#7FA8C9"],
              ["Network",    "Arc",             "Testnet · 5042002","#C4CFBE"],
              ["Wallet",     short(address!),   "Connected ✓",     "#A8B5A2"],
            ] as const).map(([l,v,sub,c])=>(
              <div key={l} style={{background:"#111813",border:"1px solid #1E2820",borderRadius:14,padding:"16px 18px"}}>
                <div style={{...M,fontSize:11,color:"#4A6A5A",marginBottom:8}}>{l}</div>
                <div style={{fontSize:20,fontWeight:800,color:c,marginBottom:4}}>{v}</div>
                <div style={{...M,fontSize:11,color:"#4A6A5A"}}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* QUICK SEND + FEATURES */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:24}}>

          {/* Quick Send — from connected wallet */}
          <div style={{background:"#111813",border:"1px solid #1E2820",borderRadius:20,padding:28}}>
            <div style={{...M,fontSize:11,color:"#7FB99A",marginBottom:14}}>// quick send</div>
            <h3 style={{fontSize:20,fontWeight:800,color:"#E8EDE9",marginBottom:6}}>Send USDC</h3>
            <p style={{color:"#6A8E7A",fontSize:14,marginBottom:20}}>From your wallet · Instant settlement on Arc</p>

            <div style={{marginBottom:14}}>
              <div style={{...M,fontSize:11,color:"#6A8E7A",marginBottom:8,fontWeight:600}}>RECIPIENT ADDRESS</div>
              <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x..."
                style={{width:"100%",background:"#0E1110",border:`1px solid ${recipient&&!addrOk?"#C47A7A55":recipient&&addrOk?"#7FB99A55":"#1E2820"}`,borderRadius:10,padding:"12px 14px",fontSize:13,...M}}/>
              {recipient&&!addrOk&&<div style={{...M,fontSize:11,color:"#C47A7A",marginTop:4}}>✗ Invalid address</div>}
              {recipient&&addrOk&&<div style={{...M,fontSize:11,color:"#7FB99A",marginTop:4}}>✓ Valid address</div>}
            </div>

            <div style={{marginBottom:20}}>
              <div style={{...M,fontSize:11,color:"#6A8E7A",marginBottom:8,fontWeight:600}}>AMOUNT (USDC)</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01"
                style={{width:"100%",background:"#0E1110",border:"1px solid #1E2820",borderRadius:10,padding:"12px 14px",fontSize:24,fontWeight:800,color:"#E8EDE9",marginBottom:10}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {["1","5","10","50"].map(v=>(
                  <button key={v} onClick={()=>setAmount(v)} style={{padding:"8px 0",borderRadius:8,border:`1px solid ${amount===v?"#7FB99A55":"#1E2820"}`,background:amount===v?"#7FB99A18":"#0E1110",color:amount===v?"#7FB99A":"#7A9E8A",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {!isConnected ? (
              <div style={{display:"flex",justifyContent:"center"}}><ConnectButton label="Connect to Send" /></div>
            ) : (
              <button onClick={send} disabled={isPending||!addrOk||!amount}
                style={{width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:addrOk?"pointer":"not-allowed",background:addrOk?"linear-gradient(135deg,#7FB99A,#5A9A7A)":"#1A2420",color:addrOk?"#0A0F0C":"#4A6A5A",fontSize:15,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {isPending?(<><div style={{width:17,height:17,border:"2px solid #0A0F0C33",borderTopColor:"#0A0F0C",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Sending...</>):`Send ${amount} USDC from my wallet`}
              </button>
            )}

            {isSuccess&&txHash&&(
              <div style={{marginTop:12,padding:"14px",background:"#0A1A10",border:"1px solid #7FB99A44",borderRadius:12}}>
                <div style={{...M,fontSize:12,color:"#7FB99A",fontWeight:700,marginBottom:6}}>✓ Payment confirmed!</div>
                <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{...M,fontSize:11,color:"#7FA8C9"}}>View on ArcScan ↗</a>
              </div>
            )}
            {writeErr&&<div style={{marginTop:10,...M,fontSize:12,color:"#C47A7A"}}>✗ Transaction rejected</div>}
          </div>

          {/* Feature Grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gridTemplateRows:"repeat(2,1fr)",gap:10}}>
            {FEATURES.map(f=>(
              <Link key={f.href} href={f.href} className="fc"
                style={{background:"#111813",border:"1px solid #1E2820",borderRadius:14,padding:18,textDecoration:"none",display:"flex",flexDirection:"column" as const}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <span style={{fontSize:24}}>{f.icon}</span>
                  <span style={{...M,fontSize:9,color:"#7FB99A",background:"#7FB99A12",border:"1px solid #7FB99A22",padding:"2px 8px",borderRadius:20,letterSpacing:"0.08em"}}>{f.tag}</span>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:"#E8EDE9",lineHeight:1.4}}>{f.title}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{...M,fontSize:12,color:"#2A3A30",textAlign:"center" as const}}>
          FreelancePay · ArcStation · Arc Testnet · Circle USDC · ERC-8004 · ERC-8183
        </div>
      </div>
    </Layout>
  );
}
