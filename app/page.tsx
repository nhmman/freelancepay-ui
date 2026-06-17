"use client";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, isAddress } from "viem";
import Layout from "./components/Layout";
import Link from "next/link";

const USDC     = "0x3600000000000000000000000000000000000000" as const;
const REGISTRY = "0xe5f0beff4b982d59b93ee80204888d4a0406eb33" as const;
const ARC_ID   = 5042002;
const BASE     = "https://earn.arcstation.xyz/pay/";
const short    = (a:string) => a.slice(0,6)+"..."+a.slice(-4);
const M: React.CSSProperties = { fontFamily:"IBM Plex Mono,monospace" };

const USDC_ABI = [{ name:"transfer", type:"function", stateMutability:"nonpayable", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] }] as const;

const REGISTRY_ABI = [
  {"name":"claim","type":"function","stateMutability":"nonpayable","inputs":[{"name":"username","type":"string"}],"outputs":[]},
  {"name":"release","type":"function","stateMutability":"nonpayable","inputs":[],"outputs":[]},
  {"name":"getAddress","type":"function","stateMutability":"view","inputs":[{"name":"username","type":"string"}],"outputs":[{"name":"","type":"address"}]},
  {"name":"getUsername","type":"function","stateMutability":"view","inputs":[{"name":"owner","type":"address"}],"outputs":[{"name":"","type":"string"}]},
  {"name":"isAvailable","type":"function","stateMutability":"view","inputs":[{"name":"username","type":"string"}],"outputs":[{"name":"","type":"bool"}]}
] as const;

const FEATURES = [
  { href:"/milestones", icon:"📋", title:"Multi-Milestone Escrow", tag:"ESCROW"   },
  { href:"/nanopay",    icon:"⚡", title:"Nanopayments x402",      tag:"x402"     },
  { href:"/reputation", icon:"⭐", title:"Reputation Pricing",     tag:"ERC-8004" },
  { href:"/jobs",       icon:"🤖", title:"Smart Jobs",             tag:"ERC-8183" },
  { href:"/invoice",    icon:"🧾", title:"AI Invoice",             tag:"AI"       },
  { href:"/portfolio",  icon:"📊", title:"Portfolio & FX",         tag:"FX"       },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const chainId                   = useChainId();
  const { switchChain }          = useSwitchChain();
  const [inputUsername, setInputUsername] = useState("");
  const [copied, setCopied]       = useState(false);
  const [amount, setAmount]       = useState("5");
  const [recipient, setRecipient] = useState("");
  const [mounted, setMounted]     = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const onArc   = chainId === ARC_ID;
  const agentId = isConnected && address ? "#"+address.slice(2,7).toUpperCase() : "—";

  const claimSlug = inputUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const claimValid = claimSlug.length >= 2 && claimSlug.length <= 30;

  // Read on-chain username for connected wallet
  const { data: onChainUsername, refetch: refetchUsername } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "getUsername",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 3000 },
  });

  // Check if username is available
  const { data: isAvailable } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "isAvailable",
    args: inputUsername.trim() ? [inputUsername.trim().toLowerCase()] : undefined,
    query: { enabled: !!inputUsername.trim() && claimValid },
  });

  // Claim username
  const { writeContract: claimUsername, data: claimHash, isPending: claiming } = useWriteContract();
  const { isSuccess: claimSuccess } = useWaitForTransactionReceipt({ hash: claimHash });
  useEffect(() => { if (claimSuccess) { refetchUsername(); setInputUsername(""); setTimeout(() => refetchUsername(), 2000); setTimeout(() => refetchUsername(), 5000); } }, [claimSuccess, refetchUsername]);

  // Release username
  const { writeContract: releaseUsername, data: releaseHash, isPending: releasing } = useWriteContract();
  const { isSuccess: releaseSuccess } = useWaitForTransactionReceipt({ hash: releaseHash });
  useEffect(() => { if (releaseSuccess) refetchUsername(); }, [releaseSuccess]);

  const currentSlug = (onChainUsername as string) || address?.toLowerCase() || "";
  const link = currentSlug ? BASE + currentSlug : null;

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick Send
  const { writeContract: sendUSDC, data: txHash, isPending, isError: writeErr, reset } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  // Resolve recipient from contract if it's a username/pay link
  const recipientSlug = (() => {
    const t = recipient.trim();
    if (isAddress(t)) return null;
    const match = t.match(/pay\/([^/\s]+)/);
    return match ? match[1] : (t.length >= 2 && t.length <= 30 ? t.toLowerCase() : null);
  })();

  const { data: resolvedFromChain } = useReadContract({
    address: REGISTRY,
    abi: REGISTRY_ABI,
    functionName: "getAddress",
    args: recipientSlug ? [recipientSlug] : undefined,
    query: { enabled: !!recipientSlug },
  });

  const resolvedAddr = isAddress(recipient)
    ? recipient
    : (resolvedFromChain && resolvedFromChain !== "0x0000000000000000000000000000000000000000"
        ? resolvedFromChain as string
        : "");

  const addrOk = isAddress(resolvedAddr);

  const handleClaim = () => {
    if (!claimSlug || !claimValid) return;
    claimUsername({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "claim", args: [claimSlug], gas: BigInt(300000) });
  };

  const btnLabel = () => {
    if (isPending) return "Confirm in MetaMask...";
    if (!onArc)   return "Switch to Arc Testnet";
    return `Send ${amount} USDC →`;
  };
  const btnAction = () => !onArc ? switchChain({ chainId: ARC_ID }) : (reset(), sendUSDC({ address: USDC, abi: USDC_ABI, functionName: "transfer", args: [resolvedAddr as `0x${string}`, parseUnits(amount, 6)] }));

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html:`
        *{box-sizing:border-box} input{color:#E8EDE9!important} input::placeholder{color:#4A6A5A} input:focus{outline:none}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        .fc{transition:all 0.18s} .fc:hover{transform:translateY(-2px);border-color:#7FB99A55!important}
        @keyframes spin{to{transform:rotate(360deg)}} @keyframes pop{0%{opacity:0;transform:translateY(8px)}100%{opacity:1;transform:translateY(0)}}
        .pop{animation:pop 0.3s ease}
      `}}/>
      <div style={{ maxWidth:960, margin:"0 auto", padding:"40px 24px", color:"#E8EDE9" }}>

        {/* HERO */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#7FB99A12", border:"1px solid #7FB99A33", borderRadius:99, padding:"6px 18px", fontSize:13, color:"#7FB99A", ...M, marginBottom:20 }}>
            BUILT ON ARC · ERC-8004 · CIRCLE USDC
          </div>
          <h1 style={{ fontSize:52, fontWeight:900, letterSpacing:"-2px", lineHeight:1.05, color:"#E8EDE9", marginBottom:14 }}>
            Get Paid in USDC.<br/>
            <span style={{ background:"linear-gradient(135deg,#7FB99A,#A8C4B0)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Instantly. Globally. Free.
            </span>
          </h1>
          <p style={{ color:"#A8C4B0", fontSize:18, lineHeight:1.7, maxWidth:480, margin:"0 auto" }}>
            Create your Pay Link — clients send USDC in seconds. No sign-up. No fees.
          </p>
        </div>

        {/* PAY LINK */}
        <div style={{ background:"linear-gradient(135deg,#111F16,#0D1710)", border:"1px solid #7FB99A55", borderRadius:24, padding:"32px 36px", marginBottom:28 }}>
          <div style={{ ...M, fontSize:13, color:"#7FB99A", letterSpacing:"0.14em", marginBottom:24 }}>// YOUR PAY LINK · ON-CHAIN</div>

          {!mounted || !isConnected ? (
            <div style={{ display:"flex", flexDirection:"column" as const, alignItems:"center", gap:16, padding:"16px 0 24px" }}>
              <div style={{ fontSize:48 }}>🔗</div>
              <h2 style={{ fontSize:24, fontWeight:800, color:"#E8EDE9" }}>Connect wallet to get your Pay Link</h2>
              <p style={{ color:"#7A9E8A", fontSize:15, marginBottom:8 }}>Your username will be stored permanently on Arc chain</p>
              <ConnectButton label="Connect Wallet" />
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:28, alignItems:"center" }}>
              <div>
                {/* Current username */}
                <div style={{ background:"#0A1208", border:"1px solid #7FB99A44", borderRadius:14, padding:"16px 20px", marginBottom:16 }}>
                  <div style={{ ...M, fontSize:11, color:"#4A6A5A", marginBottom:8 }}>YOUR LINK · ON-CHAIN ✓</div>
                  <div style={{ fontSize:18, fontWeight:800, color:"#E8EDE9" }}>
                    earn.arcstation.xyz/pay/<span style={{ color:"#7FB99A" }}>
                      {onChainUsername ? (onChainUsername as string) : short(address!)}
                    </span>
                  </div>
                  <div style={{ ...M, fontSize:12, color:"#4A6A5A", marginTop:8 }}>
                    {onChainUsername ? `Username: ${onChainUsername} · ` : "Wallet address · "}Agent {agentId}
                  </div>
                </div>

                {/* Claim / change username */}
                <div style={{ marginBottom:12 }}>
                  <div style={{ ...M, fontSize:12, color:"#7A9E8A", marginBottom:8 }}>
                    {onChainUsername ? "CHANGE USERNAME" : "CLAIM USERNAME (optional)"}
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <input value={inputUsername} onChange={e => setInputUsername(e.target.value)} placeholder="yourname"
                      style={{ flex:1, background:"#0E1110", border:"1px solid #2A3830", borderRadius:10, padding:"12px 16px", fontSize:16, fontWeight:600, ...M }}/>
                    <button onClick={handleClaim} disabled={claiming || !claimValid || !onArc || isAvailable === false || isAvailable === undefined}
                      style={{
                      padding:"12px 20px", borderRadius:10, border:"none", fontWeight:700, fontSize:14, ...M,
                      background: (claimValid && isAvailable === true && onArc && !claiming)
                        ? "linear-gradient(135deg,#7FB99A,#5A9A7A)"
                        : "#1A2420",
                      color: (claimValid && isAvailable === true && onArc && !claiming)
                        ? "#0A0F0C" : "#4A6A5A",
                      cursor: (claimValid && isAvailable === true && onArc && !claiming)
                        ? "pointer" : "not-allowed",
                    }}>
                      {claiming ? "Confirming..." : onChainUsername ? "Change Username" : "Claim"}
                    </button>
                    {onChainUsername && (
                      <button onClick={() => releaseUsername({ address: REGISTRY, abi: REGISTRY_ABI, functionName: "release", gas: BigInt(200000) })} disabled={releasing}
                        style={{ padding:"12px 16px", borderRadius:10, border:"1px solid #3A2020", background:"transparent", color:"#6A4A4A", fontSize:13, cursor:"pointer", ...M }}>
                        Release
                      </button>
                    )}
                  </div>
                  {inputUsername && (
                    <div style={{ ...M, fontSize:12, marginTop:6,
                      color: !claimValid ? "#6A8E7A" : isAvailable === false ? "#C47A7A" : "#7FB99A"
                    }}>
                      {!claimValid
                        ? `✗ Min 2 characters (a-z, 0-9, _)`
                        : isAvailable === true
                        ? `✓ "${claimSlug}" is available!`
                        : isAvailable === false
                        ? `✗ "${claimSlug}" is already taken`
                        : ""}
                    </div>
                  )}
                  {claimHash && !claimSuccess && <div style={{ ...M, fontSize:12, color:"#7FA8C9", marginTop:6 }}>⏳ Confirming on-chain...</div>}
                  {claimSuccess && <div style={{ ...M, fontSize:12, color:"#7FB99A", marginTop:6 }}>✓ Claimed! Link updating...</div>}
                  {!onArc && <div style={{ ...M, fontSize:12, color:"#C4A23A", marginTop:6 }}>Switch to Arc Testnet to claim</div>}
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column" as const, gap:12, minWidth:160 }}>
                <button onClick={copy} style={{ padding:"16px 28px", borderRadius:14, border:"none", cursor:"pointer", background:copied?"#7FB99A22":"linear-gradient(135deg,#7FB99A,#5A9A7A)", color:copied?"#7FB99A":"#0A0F0C", fontSize:16, fontWeight:800, transition:"all 0.2s", whiteSpace:"nowrap" as const }}>
                  {copied ? "✓ Copied!" : "📋 Copy Link"}
                </button>
                {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ ...M, fontSize:12, color:"#5A8A6A", textAlign:"center" as const, textDecoration:"none" }}>Preview ↗</a>}
              </div>
            </div>
          )}
        </div>

        {/* STATS */}
        {mounted && isConnected && (
          <div className="pop" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:28 }}>
            {([["Agent ID",agentId,"ERC-8004 Identity","#7FB99A"],["Reputation","95/100","Expert Tier ⭐","#7FA8C9"],["Network",onArc?"Arc ✓":"Wrong Network",onArc?"Testnet · 5042002":"Switch!",onArc?"#C4CFBE":"#C47A7A"],["Wallet",short(address!),"Connected ✓","#A8B5A2"]] as const).map(([l,v,sub,c])=>(
              <div key={l} style={{ background:"#111813", border:`1px solid ${l==="Network"&&!onArc?"#C47A7A33":"#1E2820"}`, borderRadius:14, padding:"16px 18px" }}>
                <div style={{ ...M, fontSize:12, color:"#4A6A5A", marginBottom:8 }}>{l}</div>
                <div style={{ fontSize:20, fontWeight:800, color:c, marginBottom:4 }}>{v}</div>
                <div style={{ ...M, fontSize:12, color:"#4A6A5A" }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* QUICK SEND + FEATURES */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24 }}>
          <div style={{ background:"#111813", border:"1px solid #1E2820", borderRadius:20, padding:28 }}>
            <div style={{ ...M, fontSize:13, color:"#7FB99A", marginBottom:14 }}>// quick send</div>
            <h3 style={{ fontSize:20, fontWeight:800, color:"#E8EDE9", marginBottom:6 }}>Send USDC</h3>
            <p style={{ color:"#6A8E7A", fontSize:14, marginBottom:20 }}>From your wallet · No intermediary</p>
            <div style={{ marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
              <div style={{ ...M, fontSize:12, color:"#6A8E7A" }}>RECIPIENT</div>
              <div style={{ ...M, fontSize:11, color:"#4A6A5A" }}>
                Accepts: <span style={{color:"#7FB99A"}}>0x... address</span> or <span style={{color:"#7FB99A"}}>pay link</span>
              </div>
            </div>
              <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x... or earn.arcstation.xyz/pay/username"
                style={{ width:"100%", background:"#0E1110", border:`1px solid ${recipient&&!addrOk?"#C47A7A55":recipient&&addrOk?"#7FB99A55":"#1E2820"}`, borderRadius:10, padding:"12px 14px", fontSize:13, ...M }}/>
              {recipient && addrOk && (
              <div style={{ ...M, fontSize:12, color:"#7FB99A", marginTop:4 }}>
                ✓ {resolvedAddr !== recipient ? `Resolved: ${resolvedAddr.slice(0,10)}...${resolvedAddr.slice(-6)}` : "Valid address"}
              </div>
            )}
            {recipient && !addrOk && recipient.length > 2 && (
              <div style={{ ...M, fontSize:12, color:"#C47A7A", marginTop:4 }}>
                ✗ Address not found on-chain
              </div>
            )}
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ ...M, fontSize:12, color:"#6A8E7A", marginBottom:8 }}>AMOUNT (USDC)</div>
              <input value={amount} onChange={e=>setAmount(e.target.value)} type="number" step="0.01"
                style={{ width:"100%", background:"#0E1110", border:"1px solid #1E2820", borderRadius:10, padding:"12px 14px", fontSize:26, fontWeight:800, color:"#E8EDE9", marginBottom:10 }}/>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {["1","5","10","50"].map(v=>(
                  <button key={v} onClick={()=>setAmount(v)} style={{ padding:"9px 0", borderRadius:8, border:`1px solid ${amount===v?"#7FB99A55":"#1E2820"}`, background:amount===v?"#7FB99A22":"#0E1110", color:amount===v?"#7FB99A":"#7A9E8A", fontSize:14, fontWeight:700, cursor:"pointer" }}>
                    ${v}
                  </button>
                ))}
              </div>
            </div>
            {!mounted||!isConnected ? (
              <div style={{ display:"flex", justifyContent:"center" }}><ConnectButton label="Connect Wallet to Send" /></div>
            ) : (
              <button onClick={btnAction} disabled={isPending||(!onArc?false:!addrOk||!amount)}
                style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:"pointer", background:!onArc?"linear-gradient(135deg,#C4A23A,#A07A20)":addrOk?"linear-gradient(135deg,#7FB99A,#3A8A5A)":"#1A2420", color:!onArc?"#FFF8E0":addrOk?"#FFFFFF":"#4A6A5A", fontSize:15, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:addrOk&&onArc?"0 4px 20px #7FB99A33":"none" }}>
                {isPending?(<><div style={{ width:17, height:17, border:"2px solid #ffffff44", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>Confirm in MetaMask...</>):btnLabel()}
              </button>
            )}
            {isSuccess&&txHash&&<div style={{ marginTop:12, padding:"14px", background:"#0A1A10", border:"1px solid #7FB99A44", borderRadius:12, ...M, fontSize:13, color:"#7FB99A", fontWeight:700 }}>🎉 Sent! <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color:"#7FA8C9" }}>ArcScan ↗</a></div>}
            {writeErr&&<div style={{ marginTop:10, ...M, fontSize:12, color:"#C47A7A" }}>✗ Rejected</div>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gridTemplateRows:"repeat(2,1fr)", gap:10 }}>
            {FEATURES.map(f=>(
              <div key={f.href} title="Coming soon" style={{ background:"#0D120F", border:"1px solid #161E18", borderRadius:14, padding:18, display:"flex", flexDirection:"column" as const, opacity:0.6, position:"relative" as const }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                  <span style={{ fontSize:24, filter:"grayscale(0.4)" }}>{f.icon}</span>
                  <span style={{ ...M, fontSize:9, color:"#C4A23A", background:"#C4A23A12", border:"1px solid #C4A23A33", padding:"2px 8px", borderRadius:20 }}>SOON</span>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:"#A8B5A2", lineHeight:1.4 }}>{f.title}</div>
                <div style={{ ...M, fontSize:9, color:"#3A5040", marginTop:4 }}>{f.tag}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...M, fontSize:12, color:"#2A3A30", textAlign:"center" as const }}>
          FreelancePay · ArcStation · Arc Testnet · Circle USDC · ERC-8004 · ERC-8183
        </div>
      </div>
    </Layout>
  );
}
