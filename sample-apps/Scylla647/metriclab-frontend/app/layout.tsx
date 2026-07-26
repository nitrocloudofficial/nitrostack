import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MetricLab AI — Black Hole Visualizer",
  description: "WebGPU relativistic ray tracer for the Schwarzschild metric.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black">{children}</body>
    </html>
  );
}
