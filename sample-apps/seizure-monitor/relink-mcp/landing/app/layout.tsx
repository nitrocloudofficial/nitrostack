import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CircuLink — Manufacturing Waste-to-Revenue MCP Platform',
  description:
    'Agentic AI multi-agent MCP platform for Industry 4.0. 6 autonomous agents turn factory waste into verified, matched, transacted revenue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
