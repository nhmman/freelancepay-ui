"use client";
import { useState, useEffect, use } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, isAddress } from "viem";
import { useReadContract } from "wagmi";

const USDC = "0x3600000000000000000000000000000000000000" as const;
const USDC_ABI = [{ name:"transfer", type:"function", stateMutability:"nonpayable", inputs:[{name:"to",type:"address"},{name:"amount",type:"uint256"}], outputs:[{name:"",type:"bool"}] }] as const;

const REGISTRY = "0xe5f0beff4b982d59b93ee80204888d4a0406eb33" as const;
const REGISTRY_ABI = [
  {"name":"getAddress","type":"function","stateMutability":"view","inputs":[{"name":"username","type":"string"}],"outputs":[{"name":"","type":"address"}]},
] as const;
const USERNAME_MAP: Record<string, string> = {
  "leo": "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c",
};

const shortAddr = (a: string) => a.slice(0,6)+"..."+a.slice(-4);
const getColor = (s: string) => ["#7FB99A","#7FA8C9","#C4CFBE","#A8B5A2","#9B8EC4","#C4A882"][s.charCodeAt(0)%6];
const toVND = (u: number) => (u*25400).toLocaleString("en-US")+" ₫";

export default function PayPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<"idle"|"sending"|"success"|"error">("idle");
  const { isConnected } = useAccount();

  const slug = username.toLowerCase();
  const recipientAddress = isAddress(slug) ? slug : (USERNAME_MAP[slug] ?? null);
  const displayName = isAddress(slug) ? shortAddr(slug) : slug.charAt(0).toUpperCase()+slug.slice(1);
  const color = getColor(username);
  const usdc = parseFloat(amount)||0;

  const { writeContract, data: txHash, isPending, isError: writeError } = useWriteContract();
  const { isSuccess, isError: waitError } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if(isPending) setStep("sending"); }, [isPending]);
  useEffect(() => { if(isSuccess) setStep("success"); }, [isSuccess]);
  useEffect(() => { if(writeError||waitError) setStep("error"); }, [writeError,waitError]);

  const send = () => {
    if(!recipientAddress||!usdc) return;
    writeContract({ address: USDC, abi: USDC_ABI, functionName:"transfer", args:[recipientAddress as `0x${string}`, parseUnits(amount,6)] });
  };

  const copy = () => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  if(!recipientAddress) return (
    <div style={{minHeight:"100vh",background:"#0A0F0C",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif"}}>
      <div style={{textAlign:"center",color:"#E8EDE9"}}>
        <div style={{fontSize:48,marginBottom:16}}>404</div>
        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>User not found</div>
        <a href="/" style={{color:"#7FB99A",fontSize:13}}>Go to FreelancePay</a>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#0A0F0C",color:"#E8EDE9",fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 16px"}}>
      <style dangerouslySetInnerHTML={{__html:`*{box-sizing:border-box;margin:0;padding:0} input{color:#E8EDE9;background:transparent;border:none} input:focus{outline:none} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none} @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}} @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}} @keyframes spin{to{transform:rotate(360deg)}} .pop{animation:pop 0.4s ease} .float{animation:float 3s ease-in-out infinite}`}} />

      <div style={{width:"100%",maxWidth:400,background:"#111813",border:"1px solid #1E2820",borderRadius:24,overflow:"hidden",boxShadow:"0 32px 80px rgba(0,0,0,0.6)"}}>

        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#1A2820,#131F18)",padding:"32px 28px 24px",textAlign:"center",borderBottom:"1px solid #1E2820",position:"relative"}}>
          <div style={{position:"absolute",top:14,right:14,fontFamily:"monospace",fontSize:10,color:"#7FB99A",background:"#7FB99A12",border:"1px solid #7FB99A33",padding:"3px 10px",borderRadius:20}}>ArcStation</div>
          <div className="float" style={{display:"inline-flex",marginBottom:16}}>
            <div style={{width:80,height:80,borderRadius:24,background:color+"22",border:`3px solid ${color}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,fontWeight:800,color:color}}>
              {displayName.charAt(0)}
            </div>
          </div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:4}}>{displayName}</div>
          <div style={{fontFamily:"monospace",fontSize:11,color:"#6A8E7A",marginBottom:14}}>{shortAddr(recipientAddress)}</div>
          <button onClick={copy} style={{background:"#1E2820",border:"1px solid #2A3830",borderRadius:10,padding:"6px 14px",fontSize:12,color:copied?"#7FB99A":"#8A9E90",cursor:"pointer",transition:"all 0.2s"}}>
            {copied?"✓ Copied!":"🔗 Copy Pay Link"}
          </button>
        </div>

        {step==="success" ? (
          <div className="pop" style={{padding:"40px 28px",textAlign:"center"}}>
            <div style={{fontSize:56,marginBottom:12}}>🎉</div>
            <div style={{fontSize:22,fontWeight:800,color:"#7FB99A",marginBottom:6}}>${amount} USDC sent!</div>
            <div style={{color:"#6A8E7A",fontSize:13,marginBottom:20}}>{displayName} receives it in seconds</div>
            {txHash && <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",fontFamily:"monospace",fontSize:11,color:"#7FA8C9",background:"#7FA8C912",border:"1px solid #7FA8C933",padding:"8px 16px",borderRadius:10}}>View on ArcScan ↗</a>}
            <button onClick={()=>{setStep("idle");setAmount("5");}} style={{display:"block",width:"100%",marginTop:14,padding:"12px",background:"#1A2420",border:"1px solid #1E2820",borderRadius:12,color:"#A8B5A2",fontSize:13,cursor:"pointer"}}>Send again</button>
          </div>
        ) : (
          <div style={{padding:"24px 28px 28px"}}>
            <div style={{fontFamily:"monospace",fontSize:10,color:"#6A8E7A",letterSpacing:"0.1em",marginBottom:10}}>AMOUNT (USDC)</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"16px",background:"#0E1110",borderRadius:14,border:"1px solid #1E2820",marginBottom:8}}>
              <span style={{fontSize:36,fontWeight:800,color:usdc>0?"#E8EDE9":"#3A5040"}}>$</span>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} style={{fontSize:48,fontWeight:800,color:usdc>0?"#E8EDE9":"#3A5040",width:160,textAlign:"center",letterSpacing:"-2px"}} placeholder="0" min="0.01" step="0.01" />
              <span style={{fontFamily:"monospace",fontSize:13,color:"#4A6A5A"}}>USDC</span>
            </div>
            {usdc>0 && <div style={{textAlign:"center",fontFamily:"monospace",fontSize:11,color:"#4A6A5A",marginBottom:14}}>≈ {toVND(usdc)}</div>}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:18}}>
              {["1","5","10","50"].map(v=>(
                <button key={v} onClick={()=>setAmount(v)} style={{padding:"10px 0",borderRadius:10,border:`1px solid ${amount===v?"#7FB99A44":"#1E2820"}`,background:amount===v?"#7FB99A18":"#0E1110",color:amount===v?"#7FB99A":"#6A8E7A",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>${v}</button>
              ))}
            </div>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note... (optional)" style={{width:"100%",padding:"12px 14px",background:"#0E1110",border:"1px solid #1E2820",borderRadius:12,fontSize:13,color:"#A8B5A2",marginBottom:18}} />
            {!isConnected ? (
              <div style={{display:"flex",justifyContent:"center"}}><ConnectButton label="Connect Wallet to Pay" /></div>
            ) : (
              <button onClick={send} disabled={step==="sending"||!usdc} style={{width:"100%",padding:"16px",borderRadius:14,border:"none",background:usdc>0?"linear-gradient(135deg,#7FB99A,#5A9A7A)":"#1A2420",color:usdc>0?"#0A0F0C":"#4A6A5A",fontSize:15,fontWeight:800,cursor:usdc>0?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all 0.2s"}}>
                {step==="sending"?(<><div style={{width:18,height:18,border:"2px solid #0A0F0C44",borderTopColor:"#0A0F0C",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Sending...</>):`Pay $${usdc||0} USDC to ${displayName}`}
              </button>
            )}
            {step==="error"&&<div style={{marginTop:12,padding:"10px 14px",background:"#1A0E0E",border:"1px solid #3A1818",borderRadius:10,fontFamily:"monospace",fontSize:11,color:"#C47A7A",textAlign:"center"}}>Transaction failed. Please try again.</div>}
            <div style={{marginTop:18,textAlign:"center",fontFamily:"monospace",fontSize:10,color:"#2A3A30"}}>Powered by ArcStation · Arc Testnet · Circle USDC</div>
          </div>
        )}
      </div>

      <a href="/" style={{marginTop:18,fontFamily:"monospace",fontSize:11,color:"#3A5040",textDecoration:"none"}}>Get your own Pay Link at earn.arcstation.xyz →</a>
    </div>
  );
}
