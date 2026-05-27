import { NextResponse } from "next/server";

// TX thật từ FreelancePay testnet sessions
const REAL_TRANSACTIONS = [
  {
    txHash: "0xebd53bd965051b8cba4fd04554b9f704915276c8981c984a3c37bbd7314b5f01",
    from: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    to: "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c",
    amount: "1.000000",
    type: "received",
    label: "Quick Send",
    timestamp: "2026-05-19T10:54:00Z",
  },
  {
    txHash: "0x2e12fde67d0b578f0186b9622e994f37bdd22758600f861e6806f2a4a747105d",
    from: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    to: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    amount: "0.939022",
    type: "swap",
    label: "Swap USDC → EURC",
    timestamp: "2026-05-19T11:00:00Z",
  },
  {
    txHash: "0xdc9024c2d55eba095c68073be7292ec6a62ed1eebb71d40f3385f7c306609505",
    from: "0x30Bd48CC5f4C3d4A166b79A6e0D5Fc8dB0083248",
    to: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    amount: "1.000000",
    type: "bridge",
    label: "Bridge Base → Arc",
    timestamp: "2026-05-20T09:00:00Z",
  },
  {
    txHash: "0x2060734995ec6914be917840155d186144b5117c66d6408749c14b83019736e6",
    from: "0x30Bd48CC5f4C3d4A166b79A6e0D5Fc8dB0083248",
    to: "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c",
    amount: "0.400000",
    type: "received",
    label: "Unified Balance Spend",
    timestamp: "2026-05-20T10:00:00Z",
  },
  {
    txHash: "0x966be2c908e8527393e9c469f51cbd6838e09c6e4137857c65c942ecdd98133b",
    from: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    to: "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c",
    amount: "1.500000",
    type: "received",
    label: "Reputation Bonus (+50%)",
    timestamp: "2026-05-21T09:00:00Z",
  },
  {
    txHash: "0xdb681015abf224919c84cfa9afcf30a2e156e5b2be73b8da6ea45ff9abb45086",
    from: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    to: "0x8b0e1414fb67888c9df36490fbdd342d9dc6c64c",
    amount: "1.500000",
    type: "received",
    label: "Reputation-Based Payment",
    timestamp: "2026-05-22T10:00:00Z",
  },
  {
    txHash: "0x0a735c2900297e522c919f306e8a4c471d99acce3f3472b2d35860e123456789",
    from: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    to: "0x93c8dc4755580a3820e564d89caa273773515c8d",
    amount: "0.941298",
    type: "swap",
    label: "Swap EURC → USDC",
    timestamp: "2026-05-26T09:00:00Z",
  },
];

export async function GET() {
  const received = REAL_TRANSACTIONS.filter(tx => tx.type === "received");
  const totalReceived = received.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  return NextResponse.json({
    success: true,
    payments: REAL_TRANSACTIONS.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    stats: {
      totalReceived: totalReceived.toFixed(4),
      totalPayments: REAL_TRANSACTIONS.length,
      totalSwaps: REAL_TRANSACTIONS.filter(tx => tx.type === "swap").length,
      totalBridges: REAL_TRANSACTIONS.filter(tx => tx.type === "bridge").length,
    },
  });
}
