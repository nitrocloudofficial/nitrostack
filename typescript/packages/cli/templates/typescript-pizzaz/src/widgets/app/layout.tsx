'use client';

import { WidgetLayout } from '@nitrostack/widgets';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
                <WidgetLayout>{children}</WidgetLayout>
            </body>
        </html>
    );
}
