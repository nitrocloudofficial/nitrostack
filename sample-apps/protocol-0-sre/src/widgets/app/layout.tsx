"use client";

import { WidgetLayout } from "@nitrostack/widgets";

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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body
        style={{ margin: 0, padding: 0, fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif', background: "#111111" }}
      >
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
