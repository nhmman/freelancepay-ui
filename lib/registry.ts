// lib/registry.ts
// UsernameRegistry — single source of truth for the registry address + ABI.
// Redeploy 2026-07: a new registry was deployed at 0x67b5911b61299d4C709022EC2BF71c600b74f300
// (old 0xe5f0...eb33 had an event bug).
//
// MIGRATION (2026-07-21): switched to the NEW registry (fixes the indexed-username
//   event bug; foundation for the Agent Pay identity layer). Between this deploy and
//   Leo re-claiming, `leo`/`elonmusk` resolve empty on-chain (temporary) — that is
//   expected. The OLD registry (0xe5f0…eb33) stays live but is no longer read.
import { type Address } from "viem";

export const REGISTRY_ADDRESS: Address =
  "0x67b5911b61299d4C709022EC2BF71c600b74f300"; // NEW. OLD (retired): 0xe5f0beff4b982d59b93ee80204888d4a0406eb33

export const REGISTRY_ABI = [
  { name: "claim",       type: "function", stateMutability: "nonpayable", inputs: [{ name: "username", type: "string" }], outputs: [] },
  { name: "release",     type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "getAddress",  type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "address" }] },
  { name: "getUsername", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }],    outputs: [{ name: "", type: "string" }] },
  { name: "isAvailable", type: "function", stateMutability: "view", inputs: [{ name: "username", type: "string" }], outputs: [{ name: "", type: "bool" }] },
] as const;
