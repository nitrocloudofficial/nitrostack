'use client';

import { WidgetLayout } from '@nitrostack/widgets';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }} className="bg-[#0A0A0A] text-gray-100 antialiased selection:bg-[#D4AF37]/30 selection:text-[#F2C14E]">
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
