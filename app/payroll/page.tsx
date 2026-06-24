"use client";
import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseUnits, isAddress } from "viem";

const USDC = "0x3600000000000000000000000000000000000000" as `0x${string}`;
const TRANSFER_ABI = [{
  name: "transfer", type: "function", stateMutability: "nonpayable",
  inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
  outputs: [{ name: "", type: "bool" }],
}] as const;

interface Employee { id: string; name: string; wallet: string; amount: string; }
interface PayrollRun {
  id: string; date: string; total: string;
  count: number; txHashes: string[];
}

const DEMO_TEAM: Employee[] = [
  { id: "1", name: "Leo", wallet: "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c", amount: "5.00" },
  { id: "2", name: "Nam", wallet: "0x30Bd48CC5f4C3d4A166b79A6e0D5Fc8dB0083248", amount: "3.00" },
  { id: "3", name: "Linh", wallet: "0x93c8dc4755580a3820e564d89caa273773515c8d", amount: "4.00" },
];

const VND_RATE = 25400;
const mono = "JetBrains Mono, IBM Plex Mono, monospace";
const C = {
  bg: "#F4F7FD", card: "#FFFFFF", border: "#E2EAF8",
  text: "#0A1628", muted: "#4A6B8A", dim: "#6B8DB8",
  green: "#1A7A4A", blue: "#2775CA", red: "#DC2626", yellow: "#D97706",
};

export default function Home() {
  const [tab, setTab] = useState<"payroll"|"team"|"history"|"forecast">("payroll");
  const [employees, setEmployees] = useState<Employee[]>(DEMO_TEAM);
  const [history, setHistory] = useState<PayrollRun[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [txHashes, setTxHashes] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [payDay, setPayDay] = useState("1");
  const [editAmounts, setEditAmounts] = useState<Record<string,string>>({});
  const getAmount = (emp: Employee) => editAmounts[emp.id] || emp.amount;

  const { address, isConnected } = useAccount();
  const { data: bal } = useBalance({ address, token: USDC });

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const totalPayroll = employees.reduce((s, e) => s + parseFloat(e.amount || "0"), 0);
  const monthsCanPay = bal ? Math.floor(parseFloat(bal.formatted) / totalPayroll) : 0;
  const daysUntilPayday = () => {
    const today = new Date().getDate();
    const day = parseInt(payDay);
    if (today <= day) return day - today;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    return daysInMonth - today + day;
  };

  // Gửi lần lượt từng người
  useEffect(() => {
    if (!isRunning || !isConnected) return;
    if (currentIdx >= employees.length) return;
    const emp = employees[currentIdx];
    if (isAddress(emp.wallet)) {
      writeContract({
        address: USDC, abi: TRANSFER_ABI, functionName: "transfer",
        args: [emp.wallet as `0x${string}`, parseUnits(getAmount(emp), 6)],
      });
    }
  }, [isRunning, currentIdx]);

  // Khi 1 tx thành công → gửi người tiếp theo
  useEffect(() => {
    if (!isSuccess || !txHash) return;
    const newHashes = [...txHashes, txHash];
    setTxHashes(newHashes);

    if (currentIdx + 1 < employees.length) {
      setCurrentIdx(currentIdx + 1);
      reset();
    } else {
      // Hoàn thành tất cả
      setIsRunning(false);
      setDone(true);
      const run: PayrollRun = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        total: totalPayroll.toFixed(2),
        count: employees.length,
        txHashes: newHashes,
      };
      const newHistory = [run, ...history];
      setHistory(newHistory);
      localStorage.setItem("arcpayroll_history", JSON.stringify(newHistory));
    }
  }, [isSuccess, txHash]);

  useEffect(() => {
    const saved = localStorage.getItem("arcpayroll_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const startPayroll = () => {
    setCurrentIdx(0);
    setTxHashes([]);
    setDone(false);
    setIsRunning(true);
    reset();
  };

  const resetPayroll = () => {
    setIsRunning(false);
    setDone(false);
    setCurrentIdx(0);
    setTxHashes([]);
    reset();
  };

  const addEmployee = () => {
    if (!newName || !isAddress(newWallet) || !newAmount) return;
    setEmployees([...employees, { id: Date.now().toString(), name: newName, wallet: newWallet, amount: newAmount }]);
    setNewName(""); setNewWallet(""); setNewAmount("");
  };

  const inp = {
    padding: "10px 12px", background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 8, color: C.text, fontSize: 13, outline: "none", width: "100%",
    boxSizing: "border-box" as const, fontFamily: "inherit",
  };

  const progress = isRunning ? Math.round((currentIdx / employees.length) * 100) : done ? 100 : 0;

  return (
    <Layout>
      <div style={{ paddingTop: 80, paddingBottom: 48 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap'); *{box-sizing:border-box;margin:0;padding:0} input::placeholder{color:#3d4251}`}</style>

      {/* NAV */}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* STATS */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:28 }}>
          {[
            { label:"TEAM SIZE", val:`${employees.length} people`, color:C.text },
            { label:"MONTHLY PAYROLL", val:`${totalPayroll.toFixed(2)} USDC`, color:C.blue },
            { label:"YOUR BALANCE", val: isConnected && bal ? `${parseFloat(bal.formatted).toFixed(2)} USDC` : "—", color: bal && parseFloat(bal.formatted) >= totalPayroll ? C.green : C.red },
            { label:"MONTHS RUNWAY", val: isConnected ? `${monthsCanPay} months` : "—", color: monthsCanPay >= 3 ? C.green : C.yellow },
          ].map(s => (
            <div key={s.label} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
              <div style={{ fontFamily:mono, fontSize:10, color:C.dim, letterSpacing:"0.1em", marginBottom:8 }}>{s.label}</div>
              <div suppressHydrationWarning style={{ fontSize:17, fontWeight:700, color:s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* PAYDAY ALERT */}
        {isConnected && (
          <div style={{ background:"#FEF3C7", border:`1px solid ${C.yellow}33`, borderRadius:10, padding:"12px 16px", marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <span style={{ fontFamily:mono, fontSize:11, color:C.yellow }}>// next payroll</span>
              <span style={{ fontSize:13, color:C.text, marginLeft:12 }}>
                Day {payDay} of each month · <strong suppressHydrationWarning style={{ color:C.yellow }}>{daysUntilPayday()} days away</strong>
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:C.muted }}>Pay day:</span>
              <select value={payDay} onChange={e => setPayDay(e.target.value)}
                style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:6, color:C.text, padding:"4px 8px", fontSize:12, cursor:"pointer" }}>
                {Array.from({length:28}, (_, i) => i+1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* TABS */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, marginBottom:24 }}>
          {[["payroll","// run payroll"],["team","// manage team"],["history","// history"],["forecast","// budget forecast"]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              style={{ padding:"9px 18px", background:"none", border:"none", borderBottom:`2px solid ${tab===k ? C.text : "transparent"}`, color:tab===k ? C.text : C.muted, fontSize:13, cursor:"pointer", fontFamily:mono, marginBottom:-1 }}>
              {l}
            </button>
          ))}
        </div>

        {/* ══ TAB: RUN PAYROLL ══ */}
        {tab === "payroll" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:20 }}>
            <div>
              {done ? (
                <div>
                  <div style={{ fontFamily:mono, fontSize:11, color:C.green, marginBottom:12 }}>{"{ payroll.completed }"}</div>
                  <div style={{ fontSize:22, fontWeight:700, marginBottom:6 }}>{txHashes.length}/{employees.length} payments sent ✓</div>
                  <div style={{ color:C.muted, fontSize:14, marginBottom:20 }}>{totalPayroll.toFixed(2)} USDC · {new Date().toLocaleString()}</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
                    {employees.map((emp, i) => (
                      <div key={emp.id} style={{ background:C.card, border:`1px solid ${txHashes[i] ? "#3fb95033" : "#f8514933"}`, borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontWeight:600, marginBottom:4 }}>{emp.name}</div>
                          {txHashes[i] && (
                            <a href={`https://testnet.arcscan.app/tx/${txHashes[i]}`} target="_blank" rel="noopener noreferrer"
                              style={{ fontFamily:mono, fontSize:11, color:C.blue, textDecoration:"none" }}>
                              {txHashes[i].slice(0,18)}... ↗
                            </a>
                          )}
                        </div>
                        <div style={{ fontWeight:700, color:txHashes[i] ? C.green : C.red }}>
                          {txHashes[i] ? `+${emp.amount} USDC` : "—"}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={resetPayroll} style={{ padding:"12px 20px", background:C.card, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, cursor:"pointer" }}>
                    ← Run Another Payroll
                  </button>
                </div>
              ) : isRunning ? (
                <div>
                  <div style={{ fontFamily:mono, fontSize:11, color:C.blue, marginBottom:16 }}>{"{ payroll.running... }"}</div>
                  <div style={{ background:C.card, borderRadius:8, height:6, marginBottom:20, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:C.green, width:`${progress}%`, transition:"width 0.3s" }} />
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {employees.map((emp, i) => {
                      const sent = i < txHashes.length;
                      const active = i === currentIdx;
                      return (
                        <div key={emp.id} style={{ background:C.card, border:`1px solid ${sent ? "#3fb95033" : active ? "#388bfd44" : C.border}`, borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontWeight:600 }}>{emp.name}</div>
                          <div style={{ fontFamily:mono, fontSize:12, color:sent ? C.green : active ? C.blue : C.dim }}>
                            {sent ? "✓ sent" : active ? (isPending ? "⏳ confirm..." : "⏳ sending...") : "waiting"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontFamily:mono, fontSize:11, color:C.dim, marginBottom:16 }}>// {employees.length} employees · ready to pay</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {employees.map(emp => (
                      <div key={emp.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <div>
                          <div style={{ fontWeight:600, marginBottom:2 }}>{emp.name}</div>
                          <div style={{ fontFamily:mono, fontSize:11, color:C.dim }}>{emp.wallet.slice(0,14)}...{emp.wallet.slice(-6)}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <input
                              value={editAmounts[emp.id] || emp.amount}
                              onChange={e => setEditAmounts({...editAmounts, [emp.id]: e.target.value})}
                              style={{ width:80, padding:"4px 8px", background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, color:C.blue, fontSize:13, fontWeight:700, textAlign:"right", outline:"none" }}
                            />
                            <span style={{ color:C.muted, fontSize:12 }}>USDC</span>
                          </div>
                          <div style={{ fontFamily:mono, fontSize:10, color:C.dim, textAlign:"right" }}>₫{(parseFloat(getAmount(emp))*VND_RATE).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL */}
            {!done && !isRunning && (
              <div style={{ position:"sticky", top:80 }}>
                <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
                  <div style={{ fontFamily:mono, fontSize:10, color:C.dim, letterSpacing:"0.1em", marginBottom:16 }}>// summary</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
                    {[
                      ["Employees", employees.length.toString()],
                      ["Total USDC", totalPayroll.toFixed(2)],
                      ["Est. gas", `~$${(employees.length*0.01).toFixed(2)}`],
                      ["VND equiv.", `₫${(totalPayroll*VND_RATE).toLocaleString()}`],
                    ].map(([l,v]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
                        <span style={{ color:C.muted, fontSize:13 }}>{l}</span>
                        <span style={{ fontWeight:700, color: l==="Total USDC" ? C.blue : l==="VND equiv." ? C.yellow : C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>

                  {!isConnected ? (
                    <div style={{ textAlign:"center" }}>
                      <p style={{ color:C.muted, fontSize:13, marginBottom:14 }}>Connect wallet to run payroll</p>
                      <ConnectButton />
                    </div>
                  ) : bal && parseFloat(bal.formatted) < totalPayroll ? (
                    <div style={{ background:"#FEF2F2", border:`1px solid ${C.red}33`, borderRadius:8, padding:"12px", marginBottom:12 }}>
                      <p style={{ color:C.red, fontSize:13 }}>⚠ Insufficient USDC</p>
                      <p style={{ color:C.muted, fontSize:11, marginTop:4 }}>Need {totalPayroll.toFixed(2)}, have {parseFloat(bal.formatted).toFixed(2)}</p>
                      <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
                        style={{ fontSize:11, color:C.blue, textDecoration:"none" }}>Get test USDC →</a>
                    </div>
                  ) : null}

                  <button onClick={startPayroll} disabled={!isConnected || (!!bal && parseFloat(bal.formatted) < totalPayroll)}
                    style={{ width:"100%", padding:"14px", background: isConnected ? C.green : C.card, border:`1px solid ${isConnected ? C.green : C.border}`, borderRadius:8, color: isConnected ? "#fff" : C.muted, fontSize:15, fontWeight:700, cursor: isConnected ? "pointer" : "not-allowed" }}>
                    ▶ Run Payroll
                  </button>

                  <div style={{ marginTop:14, background:"#D1FAE5", border:`1px solid #3fb95022`, borderRadius:8, padding:"10px 12px" }}>
                    <div style={{ fontFamily:mono, fontSize:10, color:C.green, marginBottom:4 }}>// why arc?</div>
                    <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
                      Each payment settles in &lt;1s. Total gas ≈ ${(employees.length*0.01).toFixed(2)} USDC. Verified on-chain.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: TEAM ══ */}
        {tab === "team" && (
          <div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
              <div style={{ fontFamily:mono, fontSize:10, color:C.dim, marginBottom:14 }}>// add employee</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 100px auto", gap:10, alignItems:"end" }}>
                <div>
                  <div style={{ fontFamily:mono, fontSize:10, color:C.dim, marginBottom:6 }}>NAME</div>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Leo" style={inp} />
                </div>
                <div>
                  <div style={{ fontFamily:mono, fontSize:10, color:C.dim, marginBottom:6 }}>WALLET (Arc Testnet)</div>
                  <input value={newWallet} onChange={e => setNewWallet(e.target.value)} placeholder="0x..." style={{ ...inp, fontFamily:mono, fontSize:12, borderColor: newWallet ? (isAddress(newWallet) ? C.green : C.red) : C.border }} />
                </div>
                <div>
                  <div style={{ fontFamily:mono, fontSize:10, color:C.dim, marginBottom:6 }}>USDC/MO</div>
                  <input value={newAmount} onChange={e => setNewAmount(e.target.value)} type="number" placeholder="100" style={inp} />
                </div>
                <button onClick={addEmployee} disabled={!newName || !isAddress(newWallet) || !newAmount}
                  style={{ padding:"10px 16px", background:C.blue, border:`1px solid ${C.blue}`, borderRadius:8, color:"#fff", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                  + Add
                </button>
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {employees.map(emp => (
                <div key={emp.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                    <div style={{ width:36, height:36, borderRadius:8, background:"#1f6feb22", border:"1px solid #388bfd44", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:C.blue, fontSize:16 }}>
                      {emp.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight:600 }}>{emp.name}</div>
                      <div style={{ fontFamily:mono, fontSize:11, color:C.dim }}>{emp.wallet.slice(0,18)}...{emp.wallet.slice(-6)}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:700, color:C.blue }}>{emp.amount} USDC/mo</div>
                      <div style={{ fontFamily:mono, fontSize:10, color:C.dim }}>₫{(parseFloat(emp.amount)*VND_RATE).toLocaleString()}</div>
                    </div>
                    <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))}
                      style={{ background:"#FEF2F2", border:`1px solid ${C.red}33`, borderRadius:6, color:C.red, cursor:"pointer", padding:"6px 12px", fontSize:12 }}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: HISTORY ══ */}
        {tab === "history" && (
          <div>
            {history.length === 0 ? (
              <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:40, textAlign:"center", color:C.dim }}>
                No payroll runs yet.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {history.map(run => (
                  <div key={run.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:"16px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:600, marginBottom:2 }}>{new Date(run.date).toLocaleString()}</div>
                        <div style={{ fontFamily:mono, fontSize:11, color:C.dim }}>{run.count} employees · {run.total} USDC</div>
                      </div>
                      <span style={{ fontFamily:mono, fontSize:11, color:C.green, background:"#3fb95015", border:"1px solid #3fb95033", padding:"4px 10px", borderRadius:6 }}>✓ Completed</span>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                      {(run.txHashes || []).map((h, i) => (
                        <a key={i} href={`https://testnet.arcscan.app/tx/${h}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily:mono, fontSize:10, color:C.blue, background:C.bg, border:`1px solid ${C.border}`, padding:"3px 8px", borderRadius:4, textDecoration:"none" }}>
                          tx[{i}] ↗
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: BUDGET FORECAST ══ */}
        {tab === "forecast" && (
          <div>
            <div style={{ fontFamily:mono, fontSize:11, color:C.dim, marginBottom:20 }}>// 6-month budget forecast</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
              {Array.from({length:6}, (_, i) => {
                const date = new Date();
                date.setMonth(date.getMonth() + i);
                return { month: date.toLocaleString("en", {month:"short", year:"numeric"}), usdc: totalPayroll, vnd: totalPayroll * VND_RATE };
              }).map(m => (
                <div key={m.month} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:16 }}>
                  <div style={{ fontFamily:mono, fontSize:10, color:C.dim, marginBottom:8 }}>{m.month}</div>
                  <div style={{ fontSize:17, fontWeight:700, color:C.blue, marginBottom:4 }}>{m.usdc.toFixed(2)} USDC</div>
                  <div style={{ fontFamily:mono, fontSize:11, color:C.yellow }}>₫{m.vnd.toLocaleString()}</div>
                </div>
              ))}
            </div>
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, padding:20 }}>
              <div style={{ fontFamily:mono, fontSize:10, color:C.dim, marginBottom:14 }}>// 6-month summary</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
                <div>
                  <div style={{ color:C.muted, fontSize:13, marginBottom:4 }}>Total payout</div>
                  <div style={{ fontSize:20, fontWeight:700, color:C.blue }}>{(totalPayroll*6).toFixed(2)} USDC</div>
                </div>
                <div>
                  <div style={{ color:C.muted, fontSize:13, marginBottom:4 }}>Est. gas cost</div>
                  <div style={{ fontSize:20, fontWeight:700, color:C.green }}>${(employees.length*0.01*6).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ color:C.muted, fontSize:13, marginBottom:4 }}>VND total</div>
                  <div style={{ fontSize:18, fontWeight:700, color:C.yellow }}>₫{(totalPayroll*VND_RATE*6).toLocaleString()}</div>
                </div>
              </div>
              {isConnected && bal && (
                <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}` }}>
                  <div style={{ color:C.muted, fontSize:13, marginBottom:4 }}>Your runway</div>
                  <div style={{ fontSize:16, fontWeight:700, color: monthsCanPay >= 6 ? C.green : monthsCanPay >= 3 ? C.yellow : C.red }}>
                    {monthsCanPay} months at current balance
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </Layout>
  );
}
