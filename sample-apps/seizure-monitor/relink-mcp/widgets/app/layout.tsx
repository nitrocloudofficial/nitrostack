import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CircuLink — Buyer Sourcing Agent Widget Preview',
  description: 'Interactive UI Widget Preview Gallery for Buyer Sourcing Agent',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#090d16', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
