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
            <body style={{ margin: 0, padding: 0, backgroundColor: '#090d16', color: '#e2e8f0' }}>
                <WidgetLayout>{children}</WidgetLayout>
            </body>
        </html>
    );
}
