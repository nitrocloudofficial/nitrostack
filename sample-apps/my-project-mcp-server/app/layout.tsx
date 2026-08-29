import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { CaseProvider } from "@/lib/case-context";
import { AuthProvider } from "@/lib/auth-context";
import { DevCaseSwitcher } from "@/components/DevCaseSwitcher";
import { RouteFade } from "@/components/RouteFade";
import { NeedHelpFooter } from "@/components/NeedHelpFooter";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Care Mediator",
  description: "A calm, shared view of a healthcare insurance case.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CaseProvider>
            <RouteFade>{children}</RouteFade>
            <NeedHelpFooter />
            <DevCaseSwitcher />
          </CaseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
