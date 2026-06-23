export const ESCROW_ADDRESS = "0x48b9bc658f49d88c077414f757cda92018949cd0" as const;
export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const ESCROW_ABI = [
  { name: "pay", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }, { name: "refundTo", type: "address" }], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "paymentIDs", type: "uint256[]" }], outputs: [] },
  { name: "refundByArbiter", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "paymentID", type: "uint256" }], outputs: [] },
  { type: "event", name: "PaymentCreated", inputs: [
    { name: "paymentID", type: "uint256", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "releaseTimestamp", type: "uint256", indexed: false },
    { name: "refundTo", type: "address", indexed: true },
  ] },
] as const;

export const USDC_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
] as const;
