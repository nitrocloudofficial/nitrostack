import type { Metadata } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Suspense } from 'react';
import './globals.css';
import { Header } from '@/components/Header';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-inter',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Care Mediator',
  description: 'Healthcare case reconciliation across hospital, patient, and insurer portals',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-screen font-sans">
        <Suspense fallback={<div className="h-16 border-b bg-white" />}>
          <Header />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
