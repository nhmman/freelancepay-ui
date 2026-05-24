import { NextRequest, NextResponse } from "next/server";
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";

const kit = new AppKit();

// In-memory storage (thay bằng DB sau)
let projects: any[] = [];

export async function GET() {
  return NextResponse.json({ success: true, data: projects });
}

export async function POST(req: NextRequest) {
  try {
    const { title, freelancerAddress, milestones } = await req.json();

    const project = {
      id: Date.now().toString(),
      title,
      freelancerAddress,
      totalAmount: milestones.reduce((sum: number, m: any) => sum + parseFloat(m.amount), 0),
      milestones: milestones.map((m: any, i: number) => ({
        id: i + 1,
        title: m.title,
        amount: m.amount,
        status: "pending", // pending | released
        txHash: null,
      })),
      createdAt: new Date().toISOString(),
    };

    projects.push(project);
    return NextResponse.json({ success: true, data: project });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
