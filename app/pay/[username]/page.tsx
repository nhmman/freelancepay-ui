"use client";
import { useState, useEffect, use } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, useSwitchChain } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { parseUnits, isAddress } from "viem";
import { buildTransfer, validateMemo, MEMO_ENABLED } from "../../../lib/memo";

const USDC     = "0x3600000000000000000000000000000000000000" as const;
const REGISTRY = "0xe5f0beff4b982d59b93ee80204888d4a0406eb33" as const;
const ARC_ID   = 5042002;
const USDC_ABI = [{ name:"transfer", type:"function", stateMutability:"nonpayable", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] }] as const;
const REGISTRY_ABI = [
  { name:"getAddress",  type:"function", stateMutability:"view", inputs:[{name:"username",type:"string"}],  outputs:[{name:"",type:"address"}] },
  { name:"getUsername", type:"function", stateMutability:"view", inputs:[{name:"owner",type:"address"}],    outputs:[{name:"",type:"string"}]  },
] as const;
const ERC20_ABI = [{ name:"balanceOf", type:"function", stateMutability:"view", inputs:[{name:"account",type:"address"}], outputs:[{name:"",type:"uint256"}] }] as const;
const FALLBACK_MAP: Record<string, string> = { "leo": "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c" };
const short = (a: string) => a.slice(0,6)+"..."+a.slice(-4);
const clr   = (s: string) => ["#2775CA","#7FA8C9","#C4CFBE","#6B8DB8","#9B8EC4","#C4A882"][s.charCodeAt(0)%6];
const M: React.CSSProperties = { fontFamily:"IBM Plex Mono,monospace" };

export default function PayPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const slug = username.toLowerCase();
  const [amount, setAmount]   = useState("5");
  const [note, setNote]       = useState("");
  const [copied, setCopied]   = useState(false);
  const [step, setStep]       = useState<"idle"|"sending"|"success"|"error">("idle");
  const [mounted, setMounted] = useState(false);
  const [showQR, setShowQR] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { address, isConnected } = useAccount();
  const chainId         = useChainId();
  const { switchChain } = useSwitchChain();
  const onArc           = chainId === ARC_ID;
  const isAddr = isAddress(slug);
  const usdc = parseFloat(amount) || 0;

  // Sender's USDC balance
  const { data: balanceRaw } = useReadContract({
    address: USDC, abi: ERC20_ABI, functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 } });
  const balance = balanceRaw ? Number(balanceRaw) / 1e6 : 0;
  const insufficient = usdc > 0 && balance > 0 && usdc > balance;

  // Sender's username
  const { data: senderUsername } = useReadContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getUsername",
    args: address ? [address] : undefined,
    query: { enabled: !!address } });

  const { data: chainAddr, isLoading: resolving } = useReadContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAddress",
    args: !isAddr ? [slug] : undefined,
    query: { enabled: !isAddr } });

  const recipient = isAddr ? slug
    : chainAddr && chainAddr !== "0x0000000000000000000000000000000000000000"
    ? (chainAddr as string)
    : FALLBACK_MAP[slug] ?? null;

  const displayName = isAddr ? short(slug) : slug.charAt(0).toUpperCase()+slug.slice(1);

  const { writeContract, data: txHash, isPending, isError: writeErr, reset } = useWriteContract();
  const { isSuccess, isError: waitErr } = useWaitForTransactionReceipt({ hash: txHash });
  useEffect(() => { if(isPending) setStep("sending"); }, [isPending]);
  useEffect(() => { if(isSuccess) setStep("success"); }, [isSuccess]);
  useEffect(() => { if(writeErr||waitErr) setStep("error"); }, [writeErr, waitErr]);

  const send = () => {
    if(!recipient||!usdc) return;
    const memoCheck = validateMemo(note);
    if(!memoCheck.ok){ setStep("error"); return; }
    reset();
    const tx = buildTransfer({ to: recipient as `0x${string}`, amountUsdc: amount, memo: note });
    writeContract(tx as any);
  };
  const copyLink = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  if (!isAddr && resolving) return (
    <div style={{minHeight:"100vh",background:"#0A1628",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:44,height:44,border:"3px solid #E2EAF8",borderTopColor:"#2775CA",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
        <div style={{...M,fontSize:15,color:"#6B8DB8"}}>Resolving @{slug}...</div>
        <style dangerouslySetInnerHTML={{__html:"@keyframes spin{to{transform:rotate(360deg)}}"}}/>
      </div>
    </div>
  );

  if (!recipient) return (
    <div style={{minHeight:"100vh",background:"#F4F7FD",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{textAlign:"center",color:"#0A1628",maxWidth:380}}>
        <div style={{fontSize:52,marginBottom:16}}>🔍</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:10}}>@{slug} not found</div>
        <div style={{color:"#6B8DB8",fontSize:15,marginBottom:28,lineHeight:1.7}}>This username has not been claimed on Arc Testnet yet.</div>
        <a href="/" style={{display:"inline-block",background:"linear-gradient(135deg,#2775CA,#1855A0)",color:"#0A1628",padding:"14px 32px",borderRadius:14,fontSize:15,fontWeight:800,textDecoration:"none"}}>
          Claim your Pay Link →
        </a>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0A1628",color:"#0A1628",fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
      <style dangerouslySetInnerHTML={{__html:`
        *{box-sizing:border-box;margin:0;padding:0}
        input{color:#0A1628!important;background:transparent;border:none} input:focus{outline:none}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pop{animation:pop 0.4s ease} .float{animation:float 3s ease-in-out infinite}
        .ab:hover{border-color:#2775CA66!important;background:#2775CA22!important}
      `}}/>

      <div style={{width:"100%",maxWidth:460,background:"#FFFFFF",border:"1px solid #E2EAF8",borderRadius:28,overflow:"hidden",boxShadow:"0 20px 60px rgba(39,117,202,0.15)"}}>

        {/* HEADER */}
        <div style={{background:"linear-gradient(135deg,#2775CA,#1855A0)",padding:"32px 28px 24px",textAlign:"center",borderBottom:"1px solid #E2EAF8",position:"relative"}}>
          {/* ArcStation badge */}
          <a href="/" style={{position:"absolute",top:14,left:14,display:"flex",alignItems:"center",gap:6,textDecoration:"none",...M,fontSize:13,color:"#FFFFFF",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",padding:"4px 12px",borderRadius:20}}>
            <Image src="/arcstation-logo.svg" alt="ArcStation" width={16} height={16} style={{filter:"brightness(0) invert(1)"}}/>
            ArcStation
          </a>

          {/* Wallet status top-right */}
          {mounted && (
            <div style={{position:"absolute",top:12,right:12}}>
              <ConnectButton
                accountStatus="avatar"
                showBalance={false}
                chainStatus="none"
                label="Connect"
              />
            </div>
          )}

          <div className="float" style={{display:"inline-flex",marginBottom:14,marginTop:8}}>
            <div style={{width:80,height:80,borderRadius:22,background:clr(username)+"22",border:`3px solid ${clr(username)}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:900,color:clr(username)}}>
              {displayName.charAt(0)}
            </div>
          </div>
          <div style={{fontSize:24,fontWeight:900,marginBottom:4,letterSpacing:"-0.5px",color:"#FFFFFF"}}>{displayName}</div>
          <div style={{...M,fontSize:12,color:"rgba(255,255,255,0.7)",marginBottom:4}}>{short(recipient)}</div>
          <div style={{...M,fontSize:13,color:"rgba(255,255,255,0.7)",marginBottom:14}}>Arc Testnet · Circle USDC</div>
          <button onClick={copyLink} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,padding:"7px 16px",fontSize:14,color:copied?"#FFFFFF":"rgba(255,255,255,0.8)",cursor:"pointer",transition:"all 0.2s",...M}}>
            {copied?"✓ Link copied!":"🔗 Copy Pay Link"}
          </button>
          <button onClick={() => setShowQR(v => !v)} style={{marginLeft:8,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:10,padding:"7px 16px",fontSize:14,color:"#6B8DB8",cursor:"pointer",...M}}>
            {showQR ? "Hide QR" : "📱 QR"}
          </button>
          {showQR && (
            <div style={{marginTop:16,display:"flex",justifyContent:"center"}}>
              <div style={{background:"#fff",padding:14,borderRadius:16,boxShadow:"0 8px 20px rgba(39,117,202,0.12)"}}>
                <QRCodeSVG value={`https://arcstation.xyz/pay/${slug}`} size={168} bgColor="#FFFFFF" fgColor="#0A1628" />
              </div>
            </div>
          )}
        </div>

        {step==="success" ? (
          <div className="pop" style={{padding:"44px 28px",textAlign:"center"}}>
            <div style={{fontSize:60,marginBottom:12}}>🎉</div>
            <div style={{fontSize:28,fontWeight:900,color:"#2775CA",marginBottom:8,letterSpacing:"-0.5px"}}>${amount} USDC sent!</div>
            <div style={{color:"#6B8DB8",fontSize:16,marginBottom:8}}>{displayName} receives it in seconds</div>
            <div style={{...M,fontSize:13,color:"#6B8DB8",marginBottom:24}}>Settled on Arc · Sub-second finality</div>
            {txHash&&(
              <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                style={{display:"inline-block",...M,fontSize:12,color:"#7FA8C9",background:"#7FA8C912",border:"1px solid #7FA8C933",padding:"10px 20px",borderRadius:12,marginBottom:16}}>
                View on ArcScan ↗
              </a>
            )}
            <button onClick={()=>{setStep("idle");setAmount("5");setNote("");reset();}}
              style={{display:"block",width:"100%",padding:"14px",background:"#EBF2FD",border:"1px solid #2A3830",borderRadius:14,color:"#B8C8C0",fontSize:16,cursor:"pointer",...M}}>
              Send again
            </button>
          </div>
        ) : (
          <div style={{padding:"26px 28px 28px"}}>

            {/* Not connected */}
            {mounted&&!isConnected&&(
              <div style={{background:"#F4F7FD",border:"1px solid #2775CA44",borderRadius:18,padding:"24px 20px",textAlign:"center",marginBottom:22}}>
                <div style={{fontSize:32,marginBottom:10}}>👛</div>
                <div style={{fontSize:18,fontWeight:800,color:"#0A1628",marginBottom:8}}>Connect your wallet to pay</div>
                <div style={{...M,fontSize:13,color:"#6B8DB8",marginBottom:18,lineHeight:1.6}}>MetaMask · WalletConnect · Any Web3 wallet</div>
                <div style={{display:"flex",justifyContent:"center"}}>
                  <ConnectButton label="Connect Wallet"/>
                </div>
              </div>
            )}

            {/* Wrong chain */}
            {mounted&&isConnected&&!onArc&&(
              <div style={{background:"#FFFBEB",border:"1.5px solid #FDE68A",borderRadius:14,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{...M,fontSize:14,color:"#D97706",fontWeight:700,marginBottom:2}}>⚠️ Wrong network</div>
                  <div style={{...M,fontSize:13,color:"#92400E"}}>Switch to Arc Testnet to send USDC</div>
                </div>
                <button onClick={()=>switchChain({chainId:ARC_ID})}
                  style={{...M,fontSize:14,color:"#D97706",background:"#D9770622",border:"1px solid #D9770655",borderRadius:10,padding:"8px 16px",cursor:"pointer",fontWeight:700}}>
                  Switch →
                </button>
              </div>
            )}

            {/* Connected info */}
            {mounted&&isConnected&&onArc&&address&&(
              <div style={{background:"#F4F7FD",border:"1px solid #2775CA22",borderRadius:12,padding:"10px 14px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{...M,fontSize:12,color:"#2775CA",fontWeight:700}}>
                    {senderUsername ? `@${senderUsername}` : short(address)}
                  </div>
                  {senderUsername && <div style={{...M,fontSize:12,color:"#6B8DB8"}}>{short(address)}</div>}
                </div>
                <ConnectButton accountStatus="avatar" showBalance={false} chainStatus="none"/>
              </div>
            )}

            {/* AMOUNT */}
            <div style={{...M,fontSize:14,color:"#9AB8A8",letterSpacing:"0.1em",marginBottom:10,fontWeight:700}}>AMOUNT (USDC)</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"20px 16px",background:"#F4F7FD",borderRadius:18,border:"1px solid #C5D9F5",marginBottom:12}}>
              <span style={{fontSize:40,fontWeight:900,color:usdc>0?"#0A1628":"#9BB5C8"}}>$</span>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                style={{fontSize:56,fontWeight:900,color:usdc>0?"#0A1628":"#9BB5C8",width:180,textAlign:"center",letterSpacing:"-2px"}}
                placeholder="0" min="0.01" step="0.01"/>
              <span style={{...M,fontSize:14,color:"#5A7A6A",fontWeight:600}}>USDC</span>
            </div>

            {/* Balance info */}
            {mounted && isConnected && address && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{...M,fontSize:14,color:insufficient?"#E89090":"#6B8DB8"}}>
                  {insufficient ? `✗ Insufficient balance` : `Balance: $${balance.toFixed(2)} USDC`}
                </div>
                {balance > 0 && !insufficient && (
                  <button onClick={()=>setAmount(balance.toFixed(2))}
                    style={{...M,fontSize:13,color:"#FFFFFF",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"3px 10px",cursor:"pointer"}}>
                    Max
                  </button>
                )}
              </div>
            )}

            {/* Quick amounts */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
              {["1","5","10","50"].map(v=>(
                <button key={v} onClick={()=>setAmount(v)} className="ab"
                  style={{padding:"11px 0",borderRadius:12,border:`1px solid ${amount===v?"#2775CA55":"#E2EAF8"}`,background:amount===v?"#2775CA22":"#F4F7FD",color:amount===v?"#2775CA":"#6B8DB8",fontSize:15,fontWeight:700,cursor:"pointer",transition:"all 0.15s"}}>
                  ${v}
                </button>
              ))}
            </div>

            {/* Note */}
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note... (optional)"
              style={{width:"100%",padding:"13px 16px",background:"#F4F7FD",border:"1px solid #E2EAF8",borderRadius:14,fontSize:15,color:"#C8D8D0",marginBottom:18,...M}}/>

            {/* PAY BUTTON */}
            {mounted&&isConnected&&onArc ? (
              <button onClick={send} disabled={step==="sending"||!usdc||insufficient}
                style={{width:"100%",padding:"18px",borderRadius:16,border:"none",
                  background:usdc>0&&!insufficient?"linear-gradient(135deg,#2775CA,#4A9A6A)":"#EBF2FD",
                  color:usdc>0&&!insufficient?"#0A1628":"#9BB5C8",fontSize:17,fontWeight:900,
                  cursor:usdc>0&&!insufficient?"pointer":"not-allowed",letterSpacing:"-0.3px",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  boxShadow:usdc>0&&!insufficient?"0 6px 24px #2775CA44":"none",transition:"all 0.2s"}}>
                {step==="sending"
                  ?(<><div style={{width:20,height:20,border:"2px solid #0A162844",borderTopColor:"#0A1628",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Confirming in wallet...</>)
                  :`Pay $${usdc||"0"} USDC to ${displayName} →`}
              </button>
            ) : mounted&&isConnected&&!onArc ? null : null}

            {step==="error"&&(
              <div style={{marginTop:14,padding:"12px 16px",background:"#FFF5F5",border:"1px solid #FECACA",borderRadius:12,...M,fontSize:12,color:"#E89090",textAlign:"center"}}>
                ✗ Transaction failed or rejected. Please try again.
              </div>
            )}

            <div style={{marginTop:18,textAlign:"center",...M,fontSize:13,color:"#5A7A6A"}}>
              Powered by ArcStation · Arc Testnet · Circle USDC
            </div>
          </div>
        )}
      </div>

      <a href="/" style={{marginTop:18,...M,fontSize:13,color:"#6B8DB8",textDecoration:"none"}}>
        Get your own Pay Link at arcstation.xyz →
      </a>
    </div>
  );
}
