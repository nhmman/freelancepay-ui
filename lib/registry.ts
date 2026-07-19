// lib/registry.ts
// UsernameRegistry — single source of truth for the registry address + ABI.
// Redeploy 2026-07: a new registry was deployed at 0x67b5911b61299d4C709022EC2BF71c600b74f300
// (old 0xe5f0...eb33 had an event bug).
//
// IMPORTANT (on-chain state as of 2026-07-19, pending Leo's decision):
//   Usernames `leo` and `elonmusk` are currently claimed ONLY on the OLD registry.
//   The NEW registry is empty (getAddress returns 0x0 for both).
//   → Address is kept as OLD to avoid breaking live pay links / escrow resolution.
//   → Switch to NEW only after those usernames are re-claimed on the new registry.
import { type Address } from "viem";

export const REGISTRY_ADDRESS: Address =
  "0xe5f0beff4b982d59b93ee80204888d4a0406eb33"; // OLD (live). NEW: 0x67b5911b61299d4C709022EC2BF71c600b74f300

export const REGISTRY_ABI = [
  { name: "claim",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "username", type: "string" }], outputs: [] },
  { name: "release",     type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "getAddress",  type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "address" }] },
  { name: "getUsername", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }],    outputs: [{ name: "", type: "string" }] },
  { name: "isAvailable", type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "bool" }] },
] as const;
