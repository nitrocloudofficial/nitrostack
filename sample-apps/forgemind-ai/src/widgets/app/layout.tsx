import React from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{
        margin: 0,
        padding: '20px',
        minHeight: '100vh',
        background: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
        color: '#f8fafc',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        {children}
      </body>
    </html>
  );
}