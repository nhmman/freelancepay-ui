import { NextRequest, NextResponse } from "next/server";

const parseInvoiceFromAI = (text: string, prompt: string) => {
  // Parse JSON từ AI response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  // Fallback nếu AI không trả JSON đúng
  return {
    client: "Client",
    items: [{ description: prompt, quantity: 1, rate: "100.00", amount: "100.00" }],
    subtotal: "100.00",
    total: "100.00",
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  };
};

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    // Gọi Anthropic API để generate invoice
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Generate a professional freelance invoice as JSON for this work: "${prompt}". 
          Return ONLY valid JSON with this exact structure, no markdown:
          {
            "client": "Client Name",
            "items": [
              {"description": "Service name", "quantity": 1, "rate": "50.00", "amount": "50.00"}
            ],
            "subtotal": "total",
            "total": "total as string",
            "dueDate": "YYYY-MM-DD"
          }
          Use realistic freelance rates in USD. Keep total between 50-500.`,
        }],
      }),
    });

    let invoiceData;
    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const text = aiData.content?.[0]?.text || "";
      invoiceData = parseInvoiceFromAI(text, prompt);
    } else {
      // Fallback nếu không có API key
      invoiceData = generateFallbackInvoice(prompt);
    }

    const invoice = {
      id: Date.now().toString(),
      number: "INV-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 9000) + 1000),
      client: invoiceData.client || "Client",
      freelancer: "Leo — FreelancePay Agent #15994",
      items: invoiceData.items || [],
      subtotal: invoiceData.subtotal || invoiceData.total,
      total: invoiceData.total,
      dueDate: invoiceData.dueDate,
      status: "draft",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

function generateFallbackInvoice(prompt: string) {
  const lower = prompt.toLowerCase();
  let items = [];
  let total = 0;

  if (lower.includes("logo") || lower.includes("design")) {
    items.push({ description: "Logo Design", quantity: 1, rate: "150.00", amount: "150.00" });
    total += 150;
  }
  if (lower.includes("website") || lower.includes("web")) {
    items.push({ description: "Website Development", quantity: 1, rate: "200.00", amount: "200.00" });
    total += 200;
  }
  if (lower.includes("seo")) {
    items.push({ description: "SEO Optimization", quantity: 1, rate: "100.00", amount: "100.00" });
    total += 100;
  }
  if (items.length === 0) {
    items.push({ description: prompt.slice(0, 50), quantity: 1, rate: "100.00", amount: "100.00" });
    total = 100;
  }

  return {
    client: "International Client",
    items,
    subtotal: total.toFixed(2),
    total: total.toFixed(2),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  };
}
