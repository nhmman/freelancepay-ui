import type { Metadata } from "next";
import "./globals.css";
import Web3Provider from "./components/Web3Provider";

export const metadata: Metadata = {
  title: "FreelancePay — AI Payment Agent on Arc",
  description: "Trustless USDC escrow for Vietnamese freelancers.",
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
