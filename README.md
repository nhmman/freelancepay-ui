# FreelancePay — AI Payment Agent on Arc

> The payment layer for 2 million Vietnamese freelancers. Built on Arc + ERC-8004 + Circle USDC.

**Live Demo:** https://freelancepay-ui.vercel.app  
**GitHub:** https://github.com/nhmman/freelancepay-ui  
**Agent ID:** 15994 (ERC-8004)  
**Reputation:** 95/100 (Expert Tier)

---

## What is FreelancePay?

FreelancePay is an AI Payment Agent that automates escrow and milestone payouts for freelancers — built natively on Arc Testnet using ERC-8004 identity, ERC-8183 smart job contracts, and Circle Developer Wallets.

**The problem:** Vietnam has 2M+ freelancers facing PayPal freezes, 20% Upwork fees, and no trusted escrow for international clients.

**The solution:** Trustless USDC escrow, instant payouts, and on-chain reputation — no middlemen.

---

## Features

| Feature | Description | Standard |
|---------|-------------|---------|
| **Quick Send** | Direct USDC transfer to freelancer | Circle App Kit |
| **Multi-Milestone Escrow** | Project-based escrow with per-milestone release | Circle Wallets |
| **Nanopayments** | Pay-per-use API calls (0.001-0.01 USDC/call) | Arc x402 |
| **Reputation Pricing** | Score-based payment tiers (+20%/+50% bonus) | ERC-8004 |
| **Smart Job Contracts** | Full job lifecycle: Open→Funded→Submitted→Completed | ERC-8183 |
| **AI Invoice Generator** | Describe work → AI creates invoice → instant payment | Claude AI |
| **Portfolio Dashboard** | Multi-currency USDC+EURC with VND conversion | Arc FX |

---

## Tech Stack

- **Blockchain:** Arc Testnet (Chain ID: 5042002)
- **Identity:** ERC-8004 (Agent ID: 15994, Score: 95/100)
- **Commerce:** ERC-8183 Smart Job Contracts
- **Payments:** Circle Developer Controlled Wallets
- **SDK:** Arc App Kit (Send, Swap, Bridge, Unified Balance)
- **Frontend:** Next.js 16 + Tailwind CSS
- **AI:** Claude Sonnet (Invoice generation)

---

## On-Chain Proof

| Action | TX Hash |
|--------|---------|
| ERC-8004 Identity | `0x352df22241fcb83d5495bb332d71d28566bf711239b851e11f1e57b5cbad9e9d` |
| Reputation (95/100) | `0x30595f699b69b133461867e68a71dd20d9722a3a4444aaa2692c6b2f4187fc3b` |
| App Kit Send | `0xebd53bd965051b8cba4fd04554b9f704915276c8981c984a3c37bbd7314b5f01` |
| App Kit Swap | `0x2e12fde67d0b578f0186b9622e994f37bdd22758600f861e6806f2a4a747105d` |
| App Kit Bridge | `0xdc9024c2d55eba095c68073be7292ec6a62ed1eebb71d40f3385f7c306609505` |
| Unified Balance | `0x2060734995ec6914be917840155d186144b5117c66d6408749c14b83019736e6` |

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
- **Arc App Kit** — simplified Send/Swap/Bridge into single SDK calls, reduced code by 60%
- **USDC on Arc** — instant settlement with predictable fees, ideal for freelancer payouts

**What worked well:**
- App Kit's `kit.send()` replaced 30+ lines of manual Circle API calls
- Circle Wallets adapter worked seamlessly with Arc Testnet
- CCTP Bridge across Base Sepolia → Arc worked reliably

**What could be improved:**
- App Kit needs better error messages for insufficient balance cases
- Circle Wallets adapter documentation for Arc-specific setup could be clearer
- Would love a webhook system for payment confirmation events

---

## Hackathon Tracks

- **Track 1:** Cross-Border Payments — freelancer payouts from international clients
- **Track 4:** Agentic Economy — AI agent with ERC-8004 identity executing autonomous payments

*Built for the Stablecoins Commerce Stack Challenge by Leo (Manh) — Vietnam*
