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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background-color: #0b0f19;
            color: #f3f4f6;
            -webkit-font-smoothing: antialiased;
          }
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.6);
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(51, 65, 85, 0.8);
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(71, 85, 105, 1);
          }
        `}</style>
      </head>
      <body>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
