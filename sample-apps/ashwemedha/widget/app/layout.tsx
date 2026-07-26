import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NitroSignal — Multi-Agent Market Intelligence",
  description:
    "Three-agent adversarial pipeline that surfaces transparent buy/watch/sell signals from news + sentiment + price data. Not a price predictor — a decision-support system.",
  keywords: ["market signals", "multi-agent AI", "news sentiment", "stock analysis", "MCP"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
