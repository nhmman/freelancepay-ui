"use client";
import { useState, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain, useDeployContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { REFUND_BYTECODE, REFUND_ABI } from "../../lib/refundProtocol";

const USDC = "0x3600000000000000000000000000000000000000";
const ARC_ID = 5042002;
const M: React.CSSProperties = { fontFamily: "IBM Plex Mono,monospace" };

export default function DeployEscrow() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const onArc = chainId === ARC_ID;
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { deployContract, data: hash, isPending, error } = useDeployContract();
  const { data: receipt, isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deploy = () => {
    deployContract({
      abi: REFUND_ABI as any,
      bytecode: REFUND_BYTECODE,
      args: [address as `0x${string}`, USDC as `0x${string}`, "ArcStation Escrow", "1.0"],
    });
  };

  const deployed = receipt?.contractAddress;

  const copy = () => {
    if (deployed) { navigator.clipboard.writeText(deployed); setCopied(true); setTimeout(() => setCopied(false), 1500); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0E1110", color: "#E8EDE9", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 560, width: "100%", background: "#111813", border: "1px solid #1E2820", borderRadius: 20, padding: 36 }}>
        <div style={{ ...M, fontSize: 13, color: "#7FB99A", marginBottom: 8 }}>// one-time deploy</div>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Deploy RefundProtocol</h1>
        <p style={{ color: "#7A9E8A", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Deploys ONE escrow contract to Arc Testnet. You (the connected wallet) become the arbiter.
          After deploy, copy the address into your escrow config.
        </p>

        <div style={{ background: "#0E1110", border: "1px solid #1E2820", borderRadius: 12, padding: 16, marginBottom: 20, ...M, fontSize: 12, color: "#8AB8A0", lineHeight: 1.8 }}>
          <div>arbiter: <span style={{ color: "#E8EDE9" }}>{address ? `${address.slice(0,8)}...${address.slice(-6)}` : "(connect wallet)"}</span></div>
          <div>usdc: <span style={{ color: "#E8EDE9" }}>0x3600...0000</span></div>
          <div>eip712: <span style={{ color: "#E8EDE9" }}>ArcStation Escrow v1.0</span></div>
        </div>

        {!mounted || !isConnected ? (
          <div style={{ display: "flex", justifyContent: "center" }}><ConnectButton label="Connect Wallet" /></div>
        ) : !onArc ? (
          <button onClick={() => switchChain({ chainId: ARC_ID })} style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", background: "linear-gradient(135deg,#C4A23A,#A07A20)", color: "#FFF8E0", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
            Switch to Arc Testnet
          </button>
        ) : deployed ? (
          <div style={{ background: "#0A1A10", border: "1px solid #7FB99A44", borderRadius: 14, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>Deployed!</div>
            <div style={{ ...M, fontSize: 13, color: "#7FB99A", wordBreak: "break-all", marginBottom: 14 }}>{deployed}</div>
            <button onClick={copy} style={{ ...M, fontSize: 13, color: "#0A0F0C", background: "#7FB99A", border: "none", borderRadius: 10, padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>
              {copied ? "✓ Copied!" : "📋 Copy address"}
            </button>
            <div style={{ ...M, fontSize: 11, color: "#4A6A5A", marginTop: 14 }}>
              Paste this into lib/escrowContract.ts (next step)
            </div>
          </div>
        ) : (
          <>
            <button onClick={deploy} disabled={isPending || confirming} style={{ width: "100%", padding: 15, borderRadius: 12, border: "none", cursor: isPending || confirming ? "wait" : "pointer", background: "linear-gradient(135deg,#7FB99A,#5A9A7A)", color: "#0A0F0C", fontSize: 15, fontWeight: 800 }}>
              {isPending ? "Confirm in MetaMask..." : confirming ? "Deploying..." : "Deploy Contract"}
            </button>
            {hash && <div style={{ ...M, fontSize: 11, color: "#7A9E8A", marginTop: 12, wordBreak: "break-all" }}>tx: {hash}</div>}
            {error && <div style={{ ...M, fontSize: 12, color: "#C47A7A", marginTop: 12 }}>✗ {error.message.slice(0, 120)}</div>}
          </>
        )}
      </div>
    </div>
  );
}
