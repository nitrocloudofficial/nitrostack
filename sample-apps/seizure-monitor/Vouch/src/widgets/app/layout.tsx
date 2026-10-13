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
        <title>Vouch — Trust-First Review Platform & Widgets</title>
        <meta name="description" content="Verifiable, fraud-resistant review & reputation system powered by NitroStack MCP and AI widgets." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --bg-primary: #090d16;
            --bg-card: rgba(18, 26, 43, 0.75);
            --bg-card-hover: rgba(28, 40, 65, 0.85);
            --border-glow: rgba(99, 102, 241, 0.25);
            --accent-indigo: #6366f1;
            --accent-cyan: #06b6d4;
            --accent-emerald: #10b981;
            --accent-amber: #f59e0b;
            --accent-rose: #f43f5e;
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at 50% 0%, #151d33 0%, #090d16 100%) !important;
            color: var(--text-primary);
            min-height: 100vh;
            height: auto !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            -webkit-font-smoothing: antialiased;
          }

          /* Ensure all buttons, links, inputs, and interactive elements are clickable with pointer cursor */
          button, a, input, select, label {
            pointer-events: auto !important;
            cursor: pointer;
            user-select: auto;
          }

          /* Override WidgetLayout default iframe locks */
          div[class*="widget"], main, body > div, [data-nitrostack-widget-layout] {
            overflow-y: auto !important;
            max-height: none !important;
            pointer-events: auto !important;
          }

          h1, h2, h3, h4, h5, h6 {
            font-family: 'Outfit', sans-serif;
            margin: 0;
          }

          /* Custom Scrollbars */
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-track {
            background: #090d16;
          }
          ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 5px;
            border: 2px solid #090d16;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #6366f1;
          }

          /* Animations */
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes pulseGlow {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.8; }
          }

          .animate-fade-in {
            animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </head>
      <body>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
