"use client";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import Link from "next/link";

type Entry = { rank:number; address:string; name:string; score:number; jobs:number; earned:string; tier:"Expert"|"Verified"|"Beginner" };

const DATA: Entry[] = [
  { rank:1, address:"0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c", name:"leo",       score:95, jobs:12, earned:"142.50", tier:"Expert" },
  { rank:2, address:"0x30Bd48CC5f4C3d4A166b79A6e0D5Fc8dB0083248", name:"agent_02",  score:88, jobs:9,  earned:"98.00",  tier:"Expert" },
  { rank:3, address:"0x93c8dc4755580a3820e564d89caa273773515c8d", name:"arc_dev",   score:76, jobs:6,  earned:"55.00",  tier:"Verified" },
  { rank:4, address:"0x1234567890123456789012345678901234567890", name:"builder_04",score:71, jobs:5,  earned:"44.00",  tier:"Verified" },
  { rank:5, address:"0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", name:"dev_05",    score:65, jobs:4,  earned:"30.00",  tier:"Verified" },
  { rank:6, address:"0x9999999999999999999999999999999999999999", name:"newbie_06", score:42, jobs:2,  earned:"12.00",  tier:"Beginner" },
];

const C: Record<string,string> = { Expert:"#7FB99A", Verified:"#7FA8C9", Beginner:"#8A8A8A" };
const short = (a:string) => a.slice(0,6)+"..."+a.slice(-4);

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"score"|"jobs"|"earned">("score");
  const [rows, setRows] = useState(DATA);

  useEffect(() => {
    const s = [...DATA].sort((a,b) => tab==="score" ? b.score-a.score : tab==="jobs" ? b.jobs-a.jobs : parseFloat(b.earned)-parseFloat(a.earned));
    setRows(s.map((e,i) => ({...e, rank:i+1})));
  }, [tab]);

  return (
    <Layout>
      <div style={{ maxWidth:700, margin:"0 auto", padding:"40px 24px", fontFamily:"sans-serif" }}>
        <div style={{ marginBottom:28 }}>
          <div style={{ fontFamily:"monospace", fontSize:10, color:"#7FB99A", letterSpacing:"0.14em", marginBottom:10 }}>ERC-8004 · ARC TESTNET</div>
          <h1 style={{ fontSize:30, fontWeight:800, color:"#E8EDE9", marginBottom:8, letterSpacing:"-0.8px" }}>Freelancer Leaderboard</h1>
          <p style={{ color:"#6A8E7A", fontSize:13 }}>Top performers ranked by on-chain reputation, jobs completed, and USDC earned.</p>
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:24, background:"#111813", border:"1px solid #1E2820", borderRadius:12, padding:4 }}>
          {[["score","Reputation"],["jobs","Jobs Done"],["earned","USDC Earned"]].map(([k,l]) => (
            <button key={k} onClick={()=>setTab(k as typeof tab)} style={{ flex:1, padding:"8px 0", borderRadius:9, border:"none", cursor:"pointer", background:tab===k?"#1E2820":"transparent", color:tab===k?"#E8EDE9":"#6A8E7A", fontSize:13, fontWeight:tab===k?700:400, fontFamily:"monospace", transition:"all 0.15s" }}>{l}</button>
          ))}
        </div>

        <div style={{ background:"#111813", border:"1px solid #1E2820", borderRadius:16, overflow:"hidden", marginBottom:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"52px 1fr 80px 70px 90px 90px", padding:"10px 20px", borderBottom:"1px solid #1E2820" }}>
            {["#","Freelancer","Score","Jobs","Earned",""].map((h,i) => <div key={i} style={{ fontFamily:"monospace", fontSize:10, color:"#4A6A5A" }}>{h}</div>)}
          </div>
          {rows.map((e,i) => (
            <div key={e.address} style={{ display:"grid", gridTemplateColumns:"52px 1fr 80px 70px 90px 90px", padding:"14px 20px", borderBottom:i<rows.length-1?"1px solid #1A2018":"none", alignItems:"center" }}>
              <div style={{ fontFamily:"monospace", fontSize:13, fontWeight:700, color:e.rank<=3?"#E8EDE9":"#4A6A5A" }}>
                {e.rank===1?"🥇":e.rank===2?"🥈":e.rank===3?"🥉":"#"+e.rank}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:C[e.tier]+"22", border:`1px solid ${C[e.tier]}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color:C[e.tier] }}>{e.name.charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:"#E8EDE9" }}>{e.name}</div>
                  <div style={{ fontFamily:"monospace", fontSize:10, color:"#4A6A5A" }}>{short(e.address)}</div>
                </div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:C[e.tier] }}>{e.score}<span style={{ fontSize:10, color:"#4A6A5A" }}>/100</span></div>
              <div style={{ fontSize:13, fontWeight:600, color:"#E8EDE9" }}>{e.jobs}</div>
              <div style={{ fontSize:13, fontWeight:600, color:"#7FB99A" }}>${e.earned}</div>
              <Link href={`/pay/${e.address}`} style={{ fontFamily:"monospace", fontSize:10, color:"#6A8E7A", background:"#1A2420", border:"1px solid #2A3830", borderRadius:8, padding:"5px 10px", textDecoration:"none" }}>Pay ↗</Link>
            </div>
          ))}
        </div>

        <div style={{ background:"#111813", border:"1px solid #1E2820", borderRadius:14, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"#E8EDE9", marginBottom:4 }}>Want to appear here?</div>
            <div style={{ fontSize:12, color:"#6A8E7A" }}>Complete jobs on Arc Testnet to build reputation.</div>
          </div>
          <Link href="/jobs" style={{ fontFamily:"monospace", fontSize:12, color:"#7FB99A", background:"#7FB99A12", border:"1px solid #7FB99A33", borderRadius:10, padding:"10px 18px", textDecoration:"none", fontWeight:600 }}>Browse Jobs ↗</Link>
        </div>
      </div>
    </Layout>
  );
}
