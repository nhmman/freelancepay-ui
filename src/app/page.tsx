"use client";
import { useState } from "react";

const LOGO_URL = "https://arcstation.xyz/favicon.png";

type TxRecord = {
  id: string;
  recipient: string;
  amount: string;
  state: string;
  txHash: string;
  explorerUrl?: string;
  timestamp: Date;
};

function shortAddr(addr: string) {
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function isValidAddress(addr: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function isValidAmount(amt: string) {
  const n = parseFloat(amt);
  return !isNaN(n) && n > 0 && n <= 10000;
}

export default function Home() {
  const [amount, setAmount] = useState("1.00");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TxRecord | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<TxRecord[]>([]);

  const addrValid = recipient === "" || isValidAddress(recipient);
  const amtValid = amount === "" || isValidAmount(amount);
  const canSubmit = isValidAddress(recipient) && isValidAmount(amount) && !loading;

  const handlePayout = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, recipientAddress: recipient }),
      });
      const data = await res.json();
      if (data.success) {
        const record: TxRecord = {
          id: Math.random().toString(36).slice(2),
          recipient,
          amount,
          state: data.data?.state ?? "CONFIRMED",
          txHash: data.data?.txHash ?? "",
          explorerUrl: data.data?.explorerUrl,
          timestamp: new Date(),
        };
        setResult(record);
        setHistory(prev => [record, ...prev]);
      } else {
        setError(data.error ?? "Unknown error");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const vnd = (usdc: string) => {
    const n = parseFloat(usdc);
    if (isNaN(n)) return "";
    return "≈ " + (n * 25400).toLocaleString("vi-VN") + " ₫";
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0E1110", color:"#E8EDE9", fontFamily:"-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        *{box-sizing:border-box;margin:0;padding:0}
        a{text-decoration:none}
        input{color:#E8EDE9}
        input::placeholder{color:#4A6A5A}
        input:focus{outline:none}
        .fade-in{animation:fadeIn 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}} />

      {/* NAV */}
      <nav style={{ padding:"0 32px", height:60, borderBottom:"1px solid #1E2820", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, background:"#0E1110CC", backdropFilter:"blur(12px)", zIndex:100 }}>
        <a href="https://arcstation.xyz" style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ background:"#1A2420", borderRadius:10, padding:4, display:"flex" }}>
            <img src={LOGO_URL} alt="Statio" width={32} height={32} style={{ borderRadius:6, objectFit:"cover", display:"block" }} />
          </div>
          <div>
            <span style={{ fontWeight:700, fontSize:14, color:"#E8EDE9" }}>FreelancePay</span>
            <span style={{ fontSize:12, color:"#6A8E7A", marginLeft:8, fontFamily:"IBM Plex Mono, monospace" }}>by Statio</span>
          </div>
        </a>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#7FB99A", background:"#7FB99A12", border:"1px solid #7FB99A33", padding:"4px 12px", borderRadius:20 }}>
            Arc Testnet
          </div>
          <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#A8C4B8" }}>
            Agent #15994
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"48px 24px" }}>

        {/* HEADER */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#7FB99A", letterSpacing:"0.14em", marginBottom:12 }}>
            ERC-8183 ESCROW · CIRCLE USDC
          </div>
          <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:"-0.8px", color:"#E8EDE9", marginBottom:8 }}>
            Release Milestone Payment
          </h1>
          <p style={{ color:"#7A9E8A", fontSize:14, lineHeight:1.6 }}>
            Send USDC instantly to any freelancer on Arc Testnet
          </p>
        </div>

        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:28 }}>
          {[
            ["Agent ID", "15994", "#7FB99A", "ERC-8004 ✓"],
            ["Reputation", "95/100", "#7FA8C9", "On-chain ✓"],
            ["Finality", "< 1s", "#C4CFBE", "Arc Testnet"],
          ].map(([l,v,c,sub]) => (
            <div key={l} style={{ background:"#111813", border:"1px solid #1E2820", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#6A8E7A", marginBottom:6 }}>{l}</div>
              <div style={{ fontSize:18, fontWeight:700, color:c, marginBottom:4 }}>{v}</div>
              <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#4A6A5A" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* FORM */}
        <div style={{ background:"#111813", border:"1px solid #1E2820", borderRadius:14, padding:24, marginBottom:20 }}>
          <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#7FB99A", letterSpacing:"0.12em", marginBottom:20 }}>
            // payment details
          </div>

          {/* Recipient */}
          <div style={{ marginBottom:18 }}>
            <label style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#6A8E7A", display:"block", marginBottom:8 }}>
              FREELANCER WALLET ADDRESS
            </label>
            <input
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              placeholder="0x..."
              style={{
                width:"100%", background:"#0E1110", border:`1px solid ${!addrValid ? "#C47A7A" : recipient && addrValid ? "#7FB99A44" : "#1E2820"}`,
                borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"IBM Plex Mono, monospace",
                color:"#E8EDE9", transition:"border 0.2s"
              }}
            />
            {!addrValid && (
              <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#C47A7A", marginTop:6 }}>
                ✗ Invalid address format
              </div>
            )}
            {recipient && addrValid && (
              <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#7FB99A", marginTop:6 }}>
                ✓ Valid address
              </div>
            )}
          </div>

          {/* Amount */}
          <div style={{ marginBottom:24 }}>
            <label style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#6A8E7A", display:"block", marginBottom:8 }}>
              AMOUNT (USDC)
            </label>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <input
                value={amount}
                onChange={e => setAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                style={{
                  flex:1, background:"#0E1110", border:`1px solid ${!amtValid ? "#C47A7A" : "#1E2820"}`,
                  borderRadius:10, padding:"12px 14px", fontSize:16, fontWeight:700, color:"#E8EDE9"
                }}
              />
              {["1","5","10","50"].map(v => (
                <button key={v} onClick={() => setAmount(v + ".00")}
                  style={{ padding:"0 14px", background: amount === v+".00" ? "#7FB99A22" : "#0E1110", border:`1px solid ${amount === v+".00" ? "#7FB99A44" : "#1E2820"}`, borderRadius:10, fontSize:13, color:amount === v+".00" ? "#7FB99A" : "#6A8E7A", cursor:"pointer", fontWeight:600, transition:"all 0.15s" }}>
                  ${v}
                </button>
              ))}
            </div>
            {amount && amtValid && (
              <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#6A8E7A" }}>
                {vnd(amount)}
              </div>
            )}
            {!amtValid && amount && (
              <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#C47A7A", marginTop:4 }}>
                ✗ Amount must be between 0.01 and 10,000
              </div>
            )}
          </div>

          {/* Button */}
          <button
            onClick={handlePayout}
            disabled={!canSubmit}
            style={{
              width:"100%", padding:"14px", borderRadius:10, border:"none", cursor: canSubmit ? "pointer" : "not-allowed",
              background: canSubmit ? "linear-gradient(135deg, #7FB99A, #5A9A7A)" : "#1A2420",
              color: canSubmit ? "#0E1110" : "#4A6A5A", fontSize:14, fontWeight:700,
              display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s"
            }}>
            {loading ? (
              <>
                <div style={{ width:16, height:16, border:"2px solid #0E1110", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
                Processing...
              </>
            ) : (
              <>&#x24; Release {amount || "0.00"} USDC &#x2192;</>
            )}
          </button>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin{to{transform:rotate(360deg)}}` }} />
        </div>

        {/* ERROR */}
        {error && (
          <div className="fade-in" style={{ background:"#2A1010", border:"1px solid #4A2020", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
            <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#C47A7A" }}>&#x2717; ERROR</div>
            <div style={{ fontSize:13, color:"#E8A0A0", marginTop:4 }}>{error}</div>
          </div>
        )}

        {/* SUCCESS */}
        {result && (
          <div className="fade-in" style={{ background:"#0A1A12", border:"1px solid #7FB99A44", borderRadius:14, padding:20, marginBottom:20 }}>
            <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#7FB99A", letterSpacing:"0.12em", marginBottom:14 }}>
              &#x2714; PAYMENT CONFIRMED
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
              <div>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#6A8E7A", marginBottom:4 }}>AMOUNT</div>
                <div style={{ fontSize:20, fontWeight:700, color:"#7FB99A" }}>{result.amount} USDC</div>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#4A6A5A" }}>{vnd(result.amount)}</div>
              </div>
              <div>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#6A8E7A", marginBottom:4 }}>RECIPIENT</div>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:13, color:"#E8EDE9" }}>{shortAddr(result.recipient)}</div>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#7FB99A" }}>{result.state}</div>
              </div>
            </div>
            {result.txHash && (
              <div style={{ background:"#0E1110", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#6A8E7A", marginBottom:4 }}>TX HASH</div>
                <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#7FA8C9", wordBreak:"break-all" }}>{result.txHash}</div>
              </div>
            )}
            {result.explorerUrl && (
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:"block", textAlign:"center", background:"#7FB99A18", border:"1px solid #7FB99A33", borderRadius:8, padding:"10px", fontSize:13, color:"#7FB99A", fontWeight:600 }}>
                View on ArcScan &#x2197;
              </a>
            )}
          </div>
        )}

        {/* HISTORY */}
        {history.length > 0 && (
          <div style={{ background:"#111813", border:"1px solid #1E2820", borderRadius:14, padding:20 }}>
            <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#6A8E7A", letterSpacing:"0.12em", marginBottom:16 }}>
              // transaction history ({history.length})
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {history.map(tx => (
                <div key={tx.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:"#0E1110", borderRadius:8, border:"1px solid #1E2820" }}>
                  <div>
                    <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:12, color:"#E8EDE9" }}>{shortAddr(tx.recipient)}</div>
                    <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#4A6A5A", marginTop:2 }}>
                      {tx.timestamp.toLocaleTimeString("vi-VN")}
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"#7FB99A" }}>{tx.amount} USDC</div>
                    <div style={{ fontFamily:"IBM Plex Mono, monospace", fontSize:10, color:"#7FB99A", marginTop:2 }}>{tx.state}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop:40, textAlign:"center", fontFamily:"IBM Plex Mono, monospace", fontSize:11, color:"#4A6A5A" }}>
          FreelancePay · Statio · Arc Testnet · ERC-8004 · ERC-8183
        </div>

      </div>
    </div>
  );
}
