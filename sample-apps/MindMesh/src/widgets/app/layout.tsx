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
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style jsx global>{`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body, #__next {
            height: 100%;
            width: 100%;
          }
          ::selection {
            background-color: rgba(255, 184, 0, 0.3);
            color: #e8edf2;
          }
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #0a0d12;
          }
          ::-webkit-scrollbar-thumb {
            background: #1f2a3a;
            border-radius: 4px;
            border: 2px solid #0a0d12;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #2d3d52;
          }
          ::-webkit-scrollbar-corner {
            background: #0a0d12;
          }
          input, textarea, button, select {
            font-family: inherit;
          }
          a {
            color: inherit;
            text-decoration: none;
          }
          details summary {
            cursor: pointer;
            list-style: none;
          }
          details summary::-webkit-details-marker {
            display: none;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </head>
      <body style={{ height: '100%', margin: 0, padding: 0, fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#0a0d12', color: '#e8edf2', WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' }}>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}