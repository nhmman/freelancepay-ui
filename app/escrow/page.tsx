"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount, useReadContract, useChainId, useSwitchChain, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { TIMELOCK_ADDRESS, USDC_ADDRESS, TIMELOCK_ABI, USDC_APPROVE_ABI } from "../../lib/timelockEscrow";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Layout from "../components/Layout";
import { supabase } from "../../lib/supabase";
import { REGISTRY_ADDRESS as REGISTRY, REGISTRY_ABI } from "../../lib/registry";

const ZERO = "0x0000000000000000000000000000000000000000";
const ARC_ID = 5042002;
const ARBITER = "0x7ef0bc69160888ffb934619a6d595d0a8c0c9774";
const M: React.CSSProperties = { fontFamily: "JetBrains Mono, IBM Plex Mono, monospace", fontWeight: 600 };
const short = (a: string) => a ? a.slice(0, 6) + "..." + a.slice(-4) : "";

// Normalize a user-typed deliverable link: prepend https:// when the scheme is
// missing, then validate with the URL parser. Without this, a bare
// "drive.google.com/…" is treated as a relative path and <a href> resolves it
// against the current site (arcstation.xyz/drive.google.com/…).
const normalizeUrl = (raw: string): { ok: boolean; url?: string; error?: string } => {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Please enter a link." };
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".")) return { ok: false, error: "That doesn't look like a valid URL." };
    return { ok: true, url: u.toString() };
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }
};

type Agreement = {
  id: string;
  depositor_address: string;
  beneficiary_username: string;
  beneficiary_address: string;
  amount_usdc: number;
  terms: string;
  status: string;
  payment_id: number | null;
  deliverable_url: string | null;
  tx_hash_fund: string | null;
  tx_hash_release: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: "#FFFBEB", color: "#D97706", label: "Draft · not funded" },
  FUNDED:    { bg: "#EBF2FD", color: "#7FA8C9", label: "Funded · in progress" },
  SUBMITTED: { bg: "#FFFBEB", color: "#F59E0B", label: "Work submitted" },
  RELEASED:  { bg: "#FFFFFF", color: "#2775CA", label: "Released ✓" },
  REFUNDED:  { bg: "#FFF5F5", color: "#DC2626", label: "Refunded" } };

export default function MilestonesPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const onArc = chainId === ARC_ID;
  const [mounted, setMounted] = useState(false);

  const [bUsername, setBUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [terms, setTerms] = useState("");
  const [creating, setCreating] = useState(false);

  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retrySyncRef = useRef<(() => Promise<void>) | null>(null);
  const [deliverableEditId, setDeliverableEditId] = useState<string | null>(null);
  const [deliverableInput, setDeliverableInput] = useState("");
  const [deliverableError, setDeliverableError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Beneficiary accepts EITHER a raw wallet address (used directly, no registry
  // lookup) OR a username (resolved via the registry) — same as the Pay page.
  const bTrimmed = bUsername.trim();
  const isDirectAddr = isAddress(bTrimmed);
  const slug = isDirectAddr ? "" : bTrimmed.toLowerCase();
  const { data: resolved } = useReadContract({
    address: REGISTRY, abi: REGISTRY_ABI, functionName: "getAddress",
    args: slug.length >= 2 ? [slug] : undefined,
    query: { enabled: slug.length >= 2 } });
  const beneficiaryAddress = isDirectAddr
    ? bTrimmed
    : (resolved && resolved !== ZERO ? (resolved as string) : null);

  const me = address?.toLowerCase() ?? "";

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("escrow_agreements")
      .select("*")
      .or(`depositor_address.eq.${me},beneficiary_address.eq.${me}`)
      .order("created_at", { ascending: false });
    if (error) {
      setLoadError(`Couldn't load escrows — ${error.message}. Check your connection and Refresh.`);
    } else {
      setAgreements((data as Agreement[]) || []);
    }
    setLoading(false);
  }, [me]);

  useEffect(() => { if (me) load(); }, [me, load]);

  const createEscrow = async () => {
    if (!me || !beneficiaryAddress || !amount || !terms.trim()) return;
    setCreating(true);
    setCreateError(null);
    const { error } = await supabase.from("escrow_agreements").insert({
      depositor_address: me,
      beneficiary_username: isDirectAddr ? short(bTrimmed) : slug,
      beneficiary_address: beneficiaryAddress.toLowerCase(),
      amount_usdc: parseFloat(amount),
      terms: terms.trim(),
      status: "DRAFT" });
    setCreating(false);
    if (error) {
      // Surface the failure instead of silently clearing the form — keeps the
      // user's input so they can retry once the backend is reachable again.
      setCreateError(`Couldn't create escrow — ${error.message}`);
      return;
    }
    setBUsername(""); setAmount(""); setTerms("");
    load();
  };

  const setStatus = async (id: string, status: string, extra: Record<string, unknown> = {}): Promise<boolean> => {
    const { error } = await supabase.from("escrow_agreements")
      .update({ status, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id);
    if (error) { alert(`Couldn't save the update — ${error.message}. Please try again.`); return false; }
    load();
    return true;
  };

  const openDeliverableEditor = (a: Agreement) => {
    setDeliverableEditId(a.id);
    setDeliverableInput(a.deliverable_url ?? "");
    setDeliverableError(null);
  };
  const submitDeliverable = async (a: Agreement) => {
    const res = normalizeUrl(deliverableInput);
    if (!res.ok) { setDeliverableError(res.error ?? "Invalid link"); return; }
    const ok = await setStatus(a.id, "SUBMITTED", { deliverable_url: res.url });
    if (ok) { setDeliverableEditId(null); setDeliverableInput(""); setDeliverableError(null); }
  };

  // After a successful on-chain tx, persist the new status. The on-chain action is
  // already FINAL, so a DB-write failure must NOT read like a failure the user should
  // retry — repeating fund/release/refund could move funds twice. Instead we warn
  // loudly and offer "Retry sync", which only re-runs the DB write (never the tx).
  const persistAfterTx = useCallback(async (
    id: string, fields: Record<string, unknown>, label: string, txHash: string,
  ) => {
    const { error } = await supabase.from("escrow_agreements")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      retrySyncRef.current = () => persistAfterTx(id, fields, label, txHash);
      setSyncWarning(
        `On-chain ${label} succeeded and is FINAL (tx ${txHash.slice(0, 10)}…) — but saving the new ` +
        `status to the database failed: ${error.message}. Do NOT repeat the ${label}; the funds already ` +
        `moved. Press "Retry sync" to save the status again — this never re-runs the transaction.`,
      );
      return;
    }
    retrySyncRef.current = null;
    setSyncWarning(null);
    load();
  }, [load]);

  const retrySync = async () => {
    if (!retrySyncRef.current) return;
    setRetrying(true);
    await retrySyncRef.current();
    setRetrying(false);
  };

  const pc = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [fundingId, setFundingId] = useState<string | null>(null);
  const [fundStep, setFundStep] = useState("");

  const TIMELOCK_SECONDS = 7 * 24 * 60 * 60; // 7-day dispute window before auto-release

  const fundEscrow = async (a: Agreement) => {
    if (!pc || !address) return;
    try {
      setFundingId(a.id);
      const amt = parseUnits(String(a.amount_usdc), 6);
      setFundStep("Approving USDC...");
      const approveHash = await writeContractAsync({
        address: USDC_ADDRESS, abi: USDC_APPROVE_ABI, functionName: "approve",
        args: [TIMELOCK_ADDRESS, amt] });
      await pc.waitForTransactionReceipt({ hash: approveHash });

      setFundStep("Locking funds...");
      const idBefore = await pc.readContract({ address: TIMELOCK_ADDRESS, abi: TIMELOCK_ABI, functionName: "nonce" }) as bigint;
      const fundHash = await writeContractAsync({
        address: TIMELOCK_ADDRESS, abi: TIMELOCK_ABI, functionName: "fund",
        args: [a.beneficiary_address as `0x${string}`, amt, BigInt(TIMELOCK_SECONDS)] });
      await pc.waitForTransactionReceipt({ hash: fundHash });
      const paymentId = Number(idBefore);

      await persistAfterTx(a.id, { status: "FUNDED", payment_id: paymentId, tx_hash_fund: fundHash }, "funding", fundHash);
    } catch (e: any) {
      alert("Funding failed or rejected: " + (e?.shortMessage || e?.message || "unknown"));
    } finally {
      setFundingId(null); setFundStep("");
    }
  };

  const [actingId, setActingId] = useState<string | null>(null);
  const [actStep, setActStep] = useState("");
  const isArbiter = me === ARBITER;

  const releasePayment = async (a: Agreement) => {
    if (!pc || a.payment_id === null || a.payment_id === undefined) return;
    try {
      setActingId(a.id); setActStep("Releasing...");
      const hash = await writeContractAsync({
        address: TIMELOCK_ADDRESS, abi: TIMELOCK_ABI, functionName: "release",
        args: [BigInt(a.payment_id)] });
      await pc.waitForTransactionReceipt({ hash });
      await persistAfterTx(a.id, { status: "RELEASED", tx_hash_release: hash }, "release", hash);
    } catch (e: any) { alert("Release failed: " + (e?.shortMessage || e?.message || "")); }
    finally { setActingId(null); setActStep(""); }
  };

  const refundEscrow = async (a: Agreement) => {
    if (!pc || a.payment_id === null || a.payment_id === undefined) return;
    try {
      setActingId(a.id); setActStep("Refunding...");
      const hash = await writeContractAsync({
        address: TIMELOCK_ADDRESS, abi: TIMELOCK_ABI, functionName: "refund",
        args: [BigInt(a.payment_id)] });
      await pc.waitForTransactionReceipt({ hash });
      await persistAfterTx(a.id, { status: "REFUNDED", tx_hash_release: hash }, "refund", hash);
    } catch (e: any) { alert("Refund failed: " + (e?.shortMessage || e?.message || "")); }
    finally { setActingId(null); setActStep(""); }
  };

  const isDepositor = (a: Agreement) => a.depositor_address === me;
  const isBeneficiary = (a: Agreement) => a.beneficiary_address === me;

  const canCreate = !!beneficiaryAddress && !!amount && parseFloat(amount) > 0 && terms.trim().length > 0;

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{ __html: `
        input,textarea{color:#0A1628!important;background:#F4F7FD;border:1px solid #E2EAF8;border-radius:10px;padding:12px 14px;width:100%;font-size:14px}
        input:focus,textarea:focus{outline:none;border-color:#2775CA;box-shadow:0 0 0 3px rgba(39,117,202,0.1)}
        textarea{font-family:inherit;resize:vertical;min-height:80px}
      ` }} />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px", color: "#0A1628" }}>
        <div style={{ ...M, fontSize: 15, color: "#2775CA", marginBottom: 8 }}>// milestone escrow · on-chain</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: "-1px", marginBottom: 6 }}>Escrow Agreements</h1>
        <p style={{ color: "#3B5878", fontWeight: 600, fontSize: 15, marginBottom: 28 }}>
          Lock USDC for a job. Release when work is delivered, refund if not.
        </p>

        {!mounted || !isConnected ? (
          <div style={{ background: "#F4F7FD", border: "1px solid #2775CA33", borderRadius: 18, padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>Connect wallet to manage escrows</div>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}><ConnectButton label="Connect Wallet" /></div>
          </div>
        ) : (
          <>
            {syncWarning && (
              <div style={{ background: "#FFF7ED", border: "2px solid #F59E0B", borderRadius: 14, padding: "16px 18px", marginBottom: 20 }}>
                <div style={{ ...M, fontSize: 14, fontWeight: 700, color: "#B45309", lineHeight: 1.6, marginBottom: 12 }}>
                  ⚠️ {syncWarning}
                </div>
                <button onClick={retrySync} disabled={retrying}
                  style={{ ...M, fontSize: 14, fontWeight: 700, color: "#FFFFFF", background: "#B45309", border: "none", borderRadius: 10, padding: "10px 18px", cursor: retrying ? "wait" : "pointer" }}>
                  {retrying ? "Syncing..." : "↻ Retry sync"}
                </button>
              </div>
            )}

            <div style={{ background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 20, padding: 28, marginBottom: 28 }}>
              <div style={{ ...M, fontSize: 15, color: "#2775CA", marginBottom: 16 }}>// new escrow</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878", marginBottom: 8 }}>BENEFICIARY (username or wallet address)</div>
                <input value={bUsername} onChange={e => setBUsername(e.target.value)} placeholder="leo   or   0x1234…abcd" />
                {(isDirectAddr || slug.length >= 2) && (
                  <div style={{ ...M, fontSize: 15, fontWeight: 600, marginTop: 6, color: beneficiaryAddress ? "#2775CA" : "#DC2626" }}>
                    {beneficiaryAddress
                      ? (isDirectAddr ? `✓ ${short(beneficiaryAddress)} · wallet address` : `✓ ${short(beneficiaryAddress)}`)
                      : "✗ Not a claimed username or a valid 0x address"}
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878", marginBottom: 8 }}>AMOUNT (USDC)</div>
                  <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" />
                </div>
                <div>
                  <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878", marginBottom: 8 }}>TERMS / ACCEPTANCE CRITERIA</div>
                  <input value={terms} onChange={e => setTerms(e.target.value)} placeholder="e.g. Deliver 3 logo concepts in PNG" />
                </div>
              </div>
              <button onClick={createEscrow} disabled={!canCreate || creating}
                style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", fontSize: 15, fontWeight: 800,
                  background: canCreate && !creating ? "linear-gradient(135deg,#2775CA,#1855A0)" : "#EBF2FD",
                  color: canCreate && !creating ? "#0A1628" : "#9BB5C8",
                  cursor: canCreate && !creating ? "pointer" : "not-allowed" }}>
                {creating ? "Creating..." : "Create Escrow Agreement"}
              </button>
              {createError && (
                <div style={{ ...M, fontSize: 13, fontWeight: 600, color: "#DC2626", background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginTop: 12, lineHeight: 1.5 }}>
                  ✗ {createError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878" }}>{agreements.length} AGREEMENT{agreements.length !== 1 ? "S" : ""}</div>
              <button onClick={load} disabled={loading} style={{ ...M, fontSize: 15, fontWeight: 600, color: "#2775CA", background: "#EBF2FD", border: "1px solid #2775CA33", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>
                {loading ? "..." : "↻ Refresh"}
              </button>
            </div>

            {loadError && (
              <div style={{ ...M, fontSize: 13, fontWeight: 600, color: "#DC2626", background: "#FFF5F5", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 14, lineHeight: 1.5 }}>
                ✗ {loadError}
              </div>
            )}

            {agreements.length === 0 ? (
              <div style={{ background: "#F4F7FD", border: "1px solid #E2EAF8", borderRadius: 14, padding: "40px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#3B5878" }}>No escrows yet</div>
                <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878", marginTop: 6 }}>Create one above to get started</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {agreements.map(a => {
                  const st = STATUS_STYLE[a.status] ?? STATUS_STYLE.DRAFT;
                  const dep = isDepositor(a);
                  const ben = isBeneficiary(a);
                  return (
                    <div key={a.id} style={{ background: "#FFFFFF", border: "1px solid #E2EAF8", borderRadius: 16, padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800 }}>${a.amount_usdc} USDC</div>
                          <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878", marginTop: 2 }}>
                            {dep ? `to @${a.beneficiary_username}` : `from ${short(a.depositor_address)}`} · {dep ? "you pay" : "you receive"}
                          </div>
                        </div>
                        <span style={{ ...M, fontSize: 15, fontWeight: 600, color: st.color, background: st.bg, border: `1px solid ${st.color}33`, padding: "4px 12px", borderRadius: 20 }}>
                          {st.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 15, color: "#3B5878", fontWeight: 600, lineHeight: 1.5, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #F0F5FF" }}>
                        {a.terms}
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {dep && a.status === "DRAFT" && (
                          <button onClick={() => fundEscrow(a)} disabled={fundingId === a.id} style={btnPrimary}>{fundingId === a.id ? fundStep || "Processing..." : "Fund Escrow →"}</button>
                        )}
                        {ben && a.status === "FUNDED" && deliverableEditId !== a.id && (
                          <button onClick={() => openDeliverableEditor(a)} style={btnGhost}>Submit Work</button>
                        )}
                        {ben && a.status === "SUBMITTED" && deliverableEditId !== a.id && (
                          <button onClick={() => openDeliverableEditor(a)} style={btnGhost}>Edit link</button>
                        )}
                        {a.deliverable_url && (a.status === "SUBMITTED" || a.status === "RELEASED") && (() => {
                          const dl = normalizeUrl(a.deliverable_url);
                          return dl.ok ? (
                            <a href={dl.url} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, textDecoration: "none" }}>View deliverable ↗</a>
                          ) : null;
                        })()}
                        {dep && a.status === "SUBMITTED" && a.payment_id !== null && (
                          <button onClick={() => releasePayment(a)} disabled={actingId === a.id} style={btnPrimary}>
                            {actingId === a.id ? actStep || "Processing..." : "Approve & Release"}
                          </button>
                        )}

                        {isArbiter && a.payment_id !== null && (a.status === "FUNDED" || a.status === "SUBMITTED") && (
                          <button onClick={() => refundEscrow(a)} disabled={actingId === a.id} style={btnDanger}>{actingId === a.id ? actStep || "Processing..." : "Refund to depositor"}</button>
                        )}
                        {(a.status === "RELEASED" || a.status === "REFUNDED") && (
                          <span style={{ ...M, fontSize: 15, fontWeight: 600, color: "#3B5878" }}>
                            {a.status === "RELEASED" ? "✓ Paid out" : "Refunded"}
                            {a.tx_hash_release ? <> · <a href={`https://testnet.arcscan.app/tx/${a.tx_hash_release}`} target="_blank" rel="noopener noreferrer" style={{ color: "#7FA8C9" }}>tx ↗</a></> : null}
                          </span>
                        )}
                      </div>

                      {deliverableEditId === a.id && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #F0F5FF" }}>
                          <div style={{ ...M, fontSize: 14, fontWeight: 600, color: "#3B5878", marginBottom: 8 }}>Deliverable link</div>
                          <input
                            value={deliverableInput}
                            onChange={e => { setDeliverableInput(e.target.value); if (deliverableError) setDeliverableError(null); }}
                            onKeyDown={e => { if (e.key === "Enter") submitDeliverable(a); }}
                            placeholder="drive.google.com/…  or  https://…"
                            autoFocus
                          />
                          {deliverableError && (
                            <div style={{ ...M, fontSize: 13, fontWeight: 600, color: "#DC2626", marginTop: 6 }}>✗ {deliverableError}</div>
                          )}
                          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                            <button onClick={() => submitDeliverable(a)} style={btnPrimary}>Save link</button>
                            <button onClick={() => { setDeliverableEditId(null); setDeliverableError(null); }} style={btnGhost}>Cancel</button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {mounted && isConnected && !onArc && (
              <div style={{ ...M, fontSize: 15, fontWeight: 600, color: "#D97706", marginTop: 16, textAlign: "center" }}>
                ⚠️ Switch to Arc Testnet for on-chain actions ·{" "}
                <button onClick={() => switchChain({ chainId: ARC_ID })} style={{ color: "#D97706", background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>Switch</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

const btnPrimary: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#2775CA,#1855A0)", color: "#0A1628", fontSize: 15, fontWeight: 700, cursor: "pointer" };
const btnGhost: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "1px solid #2A3830", background: "transparent", color: "#3B5878", fontWeight: 700, fontSize: 15, cursor: "pointer" };
const btnDanger: React.CSSProperties = { padding: "10px 18px", borderRadius: 10, border: "1px solid #FECACA", background: "transparent", color: "#DC2626", fontSize: 15, fontWeight: 700, cursor: "pointer" };
