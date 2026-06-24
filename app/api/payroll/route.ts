import { NextRequest, NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

const adapter = createCircleWalletsAdapter({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

const COMPANY_WALLET = process.env.COMPANY_WALLET!;

interface Employee {
  id: string;
  name: string;
  wallet: string;
  amount: string;
}

export async function POST(req: NextRequest) {
  try {
    const { employees }: { employees: Employee[] } = await req.json();

    if (!employees?.length) {
      return NextResponse.json(
        { success: false, error: "No employees provided" },
        { status: 400 }
      );
    }

    const results = await Promise.allSettled(
      employees.map(async (emp) => {
        const result = await kit.send({
          from: {
            adapter,
            chain: "Arc_Testnet",
            address: COMPANY_WALLET,
          },
          to: emp.wallet,
          amount: emp.amount,
          token: "USDC",
        });
        return {
          name: emp.name,
          wallet: emp.wallet,
          amount: emp.amount,
          txHash: result.txHash,
          status: "success" as const,
        };
      })
    );

    const payments = results.map((r, i) =>
      r.status === "fulfilled"
        ? r.value
        : {
            name: employees[i].name,
            wallet: employees[i].wallet,
            amount: employees[i].amount,
            txHash: null,
            status: "failed" as const,
            error: String((r as PromiseRejectedResult).reason),
          }
    );

    const succeeded = payments.filter((p) => p.status === "success").length;
    const totalPaid = payments
      .filter((p) => p.status === "success")
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return NextResponse.json({
      success: true,
      payments,
      summary: {
        total: employees.length,
        succeeded,
        failed: employees.length - succeeded,
        totalPaid: totalPaid.toFixed(2),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error("Payroll error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
