'use client';

import { WidgetLayout } from '@nitrostack/widgets';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- @nitrostack/widgets types against React 18; Next.js 16 uses React 19. Cast required. */}
        <WidgetLayout>{children as any}</WidgetLayout>
      </body>
    </html>
  );
}
