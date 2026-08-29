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
      <head>
        <title>Sentinel AI — Digital Evidence Intelligence Platform</title>
        <meta name="description" content="Sentinel AI forensic decision-support dashboard for digital evidence integrity verification, metadata assessment, manipulation detection, and trust scoring." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
