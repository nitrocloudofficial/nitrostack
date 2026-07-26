import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = {
  title: 'ContextOS - One Conversation. Infinite Intelligent Workflows.',
  description: 'Adaptive AI Context Intelligence Platform transforming meetings into structured documentation, Jira tickets, Notion knowledge bases, and vector memory.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#07090e] text-slate-100 antialiased font-sans min-h-screen selection:bg-indigo-500 selection:text-white">
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
