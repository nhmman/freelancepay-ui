# FreelancePay — AI Payment Agent on Arc

> The payment layer for 2 million Vietnamese freelancers. Built on Arc + Circle USDC.

**Live Demo:** https://freelancepay-ui.vercel.app  
**GitHub:** https://github.com/nhmman/freelancepay-ui  
**Agent ID:** 15994  
**Reputation:** 95 — on-chain, see [note](#reputation-scoring-status)

---

## What is FreelancePay?

FreelancePay is an AI Payment Agent that automates escrow and milestone payouts for freelancers — built natively on Arc Testnet using Circle Developer Wallets and USDC-native settlement.

**The problem:** Vietnam has 2M+ freelancers facing PayPal freezes, 20% Upwork fees, and no trusted escrow for international clients.

**The solution:** Trustless USDC escrow, instant payouts, and on-chain reputation — no middlemen.

---

## Features

| Feature | Description | Standard |
|---------|-------------|---------|
| **Quick Send** | Direct USDC transfer to freelancer | wagmi + USDC on Arc |
| **Multi-Milestone Escrow** | Project-based escrow with per-milestone release | wagmi + TimelockEscrow contract |
| **Reputation Pricing** | Score-based payment tiers (+20%/+50% bonus) | App logic |
| **Smart Job Contracts** | Full job lifecycle: Open→Funded→Submitted→Completed | Arc Testnet contract |

---

## Tech Stack

- **Blockchain:** Arc Testnet (Chain ID: 5042002)
- **Identity:** Agent ID 15994 (Score: 95 — on-chain, see [note](#reputation-scoring-status))
- **Reputation:** ERC-8004 ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713`
- **Commerce:** Smart job contracts on Arc Testnet
- **Payments:** Circle Developer Controlled Wallets
- **SDK:** Arc App Kit (Send, Swap)
- **Frontend:** Next.js 16 + Tailwind CSS

### Reputation scoring status

The score for agent 15994 is **written on-chain**. It was recorded on Arc Testnet via
`giveFeedback(...)` on the canonical ERC-8004 ReputationRegistry at
`0x8004B663056A597Dffe9eCcC1965A193B7388713` (an ERC-1967 proxy, `getVersion() == "2.0.0"`),
with `value = 95`, `valueDecimals = 0`, tags `"milestone_completed"` and
`"UI Design delivered on time"`. It is still readable today via
`readFeedback(15994, 0x8b0e1414…, 1)`.

`app/api/reputation/route.ts` reads that registry directly — `getClients(agentId)` followed
by `getSummary(...)`, which averages non-revoked feedback on-chain. Agents with no feedback
return `score: null, source: "none"`; the route never invents a number. If the RPC is
unreachable it returns `source: "unavailable"` rather than failing the request.

The reputation stat card on `/pay` reads this route on mount. Its `ERC-8004 ✓` label is
derived from the response, not hardcoded — if the read returns `none` or `unavailable`, the
card shows no number at all rather than falling back to a literal. A partial read (see
below) is labelled `ERC-8004 ✓ · partial`.

Two caveats, so the numbers are not oversold:

- `getSummary` iterates every feedback of every client passed to it, so agents with a very
  large history can exceed the RPC's `eth_call` gas cap. The route bisects on revert, skips
  clients it cannot read, and stops at an 8s deadline — reporting `partial: true` when the
  average covers only part of the feedback.
- `app/api/reputation/pay/route.ts` does not write a score anywhere — it only transfers USDC
  at the bonus-adjusted amount. The payout tiers themselves are real: the bonus is computed
  and the USDC transfer executes on Arc Testnet.

> **Note on `src/app/`** — Next.js ignores `src/app` when an `app/` directory exists at the
> repo root, so `src/app/page.tsx` is not rendered and is effectively dead code. Its stat
> tiles still contain hardcoded values; only `app/pay/page.tsx` is live.

---

## On-Chain Proof

| Action | TX Hash |
|--------|---------|
| Agent Identity — registers agent 15994 in the canonical ERC-8004 IdentityRegistry `0x8004A818BFB912233c491871b3d84c89A494BD9e`, minting it to `0x93C8DC4755580A3820e564D89caa273773515c8D` (delivered as an ERC-4337 UserOperation, so the tx `to` is EntryPoint v0.6) | `0x0f2b2f3e7d4e164dad93d1cf4c8f4e774628e118bcac8d9da38d7776aef3df05` |
| Reputation — score 95 for agent 15994, written via `giveFeedback` to the canonical ERC-8004 ReputationRegistry `0x8004B663056A597Dffe9eCcC1965A193B7388713` (delivered as an ERC-4337 UserOperation, so the tx `to` is EntryPoint v0.6) | `0x30595f699b69b133461867e68a71dd20d9722a3a4444aaa2692c6b2f4187fc3b` |
| App Kit Send | `0xebd53bd965051b8cba4fd04554b9f704915276c8981c984a3c37bbd7314b5f01` |
| App Kit Swap | `0x2e12fde67d0b578f0186b9622e994f37bdd22758600f861e6806f2a4a747105d` |

---

## Setup

```bash
git clone https://github.com/nhmman/freelancepay-ui
cd freelancepay-ui
npm install
```

Create `.env.local`:
```
CIRCLE_API_KEY=your_circle_api_key
CIRCLE_ENTITY_SECRET=your_entity_secret
ESCROW_WALLET_ADDRESS=your_escrow_wallet
FREELANCER_WALLET_ADDRESS=your_freelancer_wallet
KIT_KEY=your_kit_key
```

```bash
npm run dev
```

---

## Circle Product Feedback

**Why we chose these products:**
- **Circle Developer Wallets** — perfect for AI agent payments where users don't need to manage private keys
- **Arc App Kit** — simplified Send/Swap into single SDK calls
- **USDC on Arc** — instant settlement with predictable fees, ideal for freelancer payouts

**What worked well:**
- App Kit's `kit.send()` replaced 30+ lines of manual Circle API calls
- Circle Wallets adapter worked seamlessly with Arc Testnet

**What could be improved:**
- App Kit needs better error messages for insufficient balance cases
- Circle Wallets adapter documentation for Arc-specific setup could be clearer
- Would love a webhook system for payment confirmation events

---

## Hackathon Tracks

- **Track 1:** Cross-Border Payments — freelancer payouts from international clients
- **Track 4:** Agentic Economy — AI agent with on-chain identity executing autonomous payments

*Built for the Stablecoins Commerce Stack Challenge by Leo (Manh) — Vietnam*
