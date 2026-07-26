import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandMenu } from "@/components/layout/command-menu";
import { FloatingAssistant } from "@/components/chat/floating-assistant";
import { Toaster } from "@/components/ui/toaster";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SymBioForge | Dashboard",
  description: "AI-powered industrial symbiosis platform for circular economy",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = headers().get("x-pathname") ?? "/"
  const isAuthPage = pathname === "/login" || pathname === "/signup"

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-zinc-950 text-zinc-50 ${isAuthPage ? "" : "overflow-hidden"}`}
      >
        {isAuthPage ? (
          <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_38%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,1))]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" />
            <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
              <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="hidden max-w-xl lg:block">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-emerald-400">Circular Manufacturing Intelligence</p>
                  <h1 className="mt-4 text-5xl font-semibold tracking-tight text-zinc-50">
                    One industrial network, finally thinking as a system.
                  </h1>
                  <p className="mt-6 text-lg leading-8 text-zinc-400">
                    Sign in to monitor symbiotic matches, generate compliance reports, and move the cluster from static reporting to active coordination.
                  </p>
                </div>
                <div className="flex justify-center lg:justify-end">{children}</div>
              </div>
            </div>
          </main>
        ) : (
          <div className="flex h-screen w-full">
            <div className="w-64 flex-shrink-0 hidden md:block">
              <Sidebar />
            </div>
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              <Topbar />
              <main className="flex-1 overflow-auto bg-zinc-950/50">
                <div className="max-w-[1600px] mx-auto px-6 py-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
        )}
        {!isAuthPage ? <CommandMenu /> : null}
        {!isAuthPage ? <FloatingAssistant /> : null}
        <Toaster />
      </body>
    </html>
  );
}
