"use client";
import { useState } from "react";
import Layout from "../components/Layout";

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: string;
  amount: string;
}

interface Invoice {
  id: string;
  number: string;
  client: string;
  freelancer: string;
  items: InvoiceItem[];
  subtotal: string;
  total: string;
  dueDate: string;
  status: "draft" | "sent" | "paid";
  txHash?: string;
  createdAt: string;
}

export default function InvoicePage() {
  const [prompt, setPrompt] = useState("Website redesign project - 3 pages, logo design, and SEO optimization. Timeline: 2 weeks.");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [generating, setGenerating] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [preview, setPreview] = useState<Invoice | null>(null);

  const generateInvoice = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }) });
      const data = await res.json();
      if (data.success) {
        setPreview(data.invoice);
      } else alert("Error: " + data.error);
    } finally {
      setGenerating(false);
    }
  };

  const payInvoice = async (invoice: Invoice) => {
    setPaying(invoice.id);
    try {
      const res = await fetch("/api/invoice/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id, amount: invoice.total }) });
      const data = await res.json();
      if (data.success) {
        const paid = { ...invoice, status: "paid" as const, txHash: data.txHash };
        setInvoices((prev) => [paid, ...prev.filter((i) => i.id !== invoice.id)]);
        setPreview(null);
      } else alert("Error: " + data.error);
    } finally {
      setPaying(null);
    }
  };

  const saveInvoice = () => {
    if (!preview) return;
    setInvoices((prev) => [{ ...preview, status: "sent" }, ...prev]);
    setPreview(null);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] bg-pink-500/20 text-pink-400 border border-pink-500/30 px-2 py-0.5 rounded-full font-mono">AI POWERED</span>
            <span className="text-[10px] bg-white/5 text-gray-400 border border-white/10 px-2 py-0.5 rounded-full font-mono">CIRCLE USDC</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">AI Invoice Generator</h1>
          <p className="text-gray-500">Describe your work → AI creates invoice → instant USDC payment</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            {/* Generator */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <h2 className="font-semibold mb-1">Describe your work</h2>
              <p className="text-gray-500 text-sm mb-4">AI will generate a professional invoice automatically</p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500/50 transition-colors resize-none mb-4"
                placeholder="e.g. Logo design + website, 10 hours at $50/hr..."
              />
              <button onClick={generateInvoice} disabled={generating}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-90 disabled:opacity-50 rounded-xl py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                {generating ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating invoice...</>
                ) : (
                  <>🧾 Generate Invoice with AI →</>
                )}
              </button>
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-white/3 border border-pink-500/20 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">INVOICE</p>
                    <h2 className="text-2xl font-bold font-mono">{preview.number}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">TOTAL DUE</p>
                    <p className="text-3xl font-bold text-pink-400">{preview.total} USDC</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="bg-white/3 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">FROM</p>
                    <p className="font-medium">{preview.freelancer}</p>
                    <p className="text-xs text-gray-500 font-mono mt-1">Agent #15994 · ERC-8004</p>
                  </div>
                  <div className="bg-white/3 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">TO</p>
                    <p className="font-medium">{preview.client}</p>
                    <p className="text-xs text-gray-500 mt-1">Due: {preview.dueDate}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div className="mb-6">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 uppercase tracking-wider mb-2 px-2">
                    <span className="col-span-2">Description</span>
                    <span className="text-right">Qty × Rate</span>
                    <span className="text-right">Amount</span>
                  </div>
                  <div className="space-y-2">
                    {preview.items.map((item, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 bg-white/3 rounded-lg px-3 py-2.5 text-sm">
                        <span className="col-span-2">{item.description}</span>
                        <span className="text-right text-gray-400">{item.quantity} × {item.rate}</span>
                        <span className="text-right font-medium text-yellow-400">{item.amount} USDC</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 px-3 pt-3 border-t border-white/10">
                    <span className="text-gray-400 text-sm">Total</span>
                    <span className="text-xl font-bold text-pink-400">{preview.total} USDC</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button onClick={saveInvoice}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-medium transition-all">
                    Save as Draft
                  </button>
                  <button onClick={() => payInvoice(preview)} disabled={paying === preview.id}
                    className="flex-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:opacity-90 disabled:opacity-50 rounded-xl py-3 font-semibold text-sm transition-all flex items-center justify-center gap-2">
                    {paying === preview.id ? (
                      <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
                    ) : (
                      <>⚡ Pay {preview.total} USDC Now</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Invoice List */}
            {invoices.length > 0 && (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <h2 className="font-semibold mb-4">Invoice History</h2>
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between bg-white/3 rounded-xl p-4 border border-white/5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{inv.number}</span>
                          <span className={"text-[10px] px-2 py-0.5 rounded-full border font-medium " +
                            (inv.status === "paid" ? "text-green-400 bg-green-400/10 border-green-400/20" :
                             inv.status === "sent" ? "text-blue-400 bg-blue-400/10 border-blue-400/20" :
                             "text-gray-400 bg-gray-400/10 border-gray-400/20")}>
                            {inv.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-500 text-xs">{inv.client}</p>
                        {inv.txHash && (
                          <a href={"https://testnet.arcscan.app/tx/" + inv.txHash}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-mono">
                            {inv.txHash.slice(0, 20)}... →
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-yellow-400">{inv.total} USDC</p>
                        {inv.status === "sent" && (
                          <button onClick={() => payInvoice(inv)} disabled={paying === inv.id}
                            className="mt-1 text-xs bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/30 text-pink-400 px-3 py-1 rounded-lg transition-all">
                            {paying === inv.id ? "Paying..." : "Pay Now"}
                          </button>
                        )}
                        {inv.status === "paid" && <p className="text-xs text-green-400 mt-1">✓ Paid</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">💡 Try these prompts</h3>
              <div className="space-y-2">
                {[
                  "Logo design + brand kit, 2 revisions",
                  "React dashboard development, 20 hours",
                  "SEO audit + optimization report",
                  "Social media content, 30 posts",
                ].map((p) => (
                  <button key={p} onClick={() => setPrompt(p)}
                    className="w-full text-left text-xs bg-white/3 hover:bg-white/5 border border-white/8 rounded-lg px-3 py-2.5 text-gray-400 hover:text-white transition-all">
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <h3 className="font-semibold text-sm mb-3">⚡ How it works</h3>
              <div className="space-y-3">
                {[
                  { step: "1", text: "Describe your work in plain text" },
                  { step: "2", text: "AI generates professional invoice with line items" },
                  { step: "3", text: "Review and approve the invoice" },
                  { step: "4", text: "Instant USDC payment via Arc escrow" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">{s.step}</span>
                    <p className="text-xs text-gray-400">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
