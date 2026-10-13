'use client';

import { WidgetLayout } from '@nitrostack/widgets';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Bypass the broken local compiler and force styles to load directly in the browser */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}