import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GuardianSense — Contactless Health Monitoring",
    template: "%s · GuardianSense",
  },
  description:
    "Real-time, contactless health monitoring powered by WiFi CSI and Guardian AI. Track respiration, movement, and risk assessment from a live dashboard.",
  applicationName: "GuardianSense",
};

const themeInitScript = `(function () {
  try {
    var stored = window.localStorage.getItem("guardiansense-theme");
    var prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    var theme = stored === "light" || stored === "dark"
      ? stored
      : prefersLight ? "light" : "dark";
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
