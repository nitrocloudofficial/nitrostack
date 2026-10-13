'use client';

import { useTheme, WidgetLayout } from '@nitrostack/widgets';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The host reports its theme, or null before it has told us. Light is the default.
  const theme = useTheme();

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : undefined}>
      <body>
        <WidgetLayout>{children}</WidgetLayout>
      </body>
    </html>
  );
}
