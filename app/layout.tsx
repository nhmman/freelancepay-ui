import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FreelancePay — AI Payment Agent on Arc",
  description: "Trustless USDC escrow for Vietnamese freelancers. Built on Arc + ERC-8004 + Circle.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
