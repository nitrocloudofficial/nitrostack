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
      <body>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
