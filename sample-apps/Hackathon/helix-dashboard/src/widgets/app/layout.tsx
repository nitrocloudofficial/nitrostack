'use client';

import './globals.css';
import { WidgetLayout } from '@nitrostack/widgets';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>HELIX - Enterprise Cognitive Genome Platform</title>
        <meta name="description" content="Executive Drift Telemetry & Strategic Alignment Platform" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0B0F17', color: '#F3F4F6' }}>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
