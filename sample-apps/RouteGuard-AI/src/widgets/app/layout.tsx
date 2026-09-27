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
            <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', overflowY: 'auto', height: 'auto' }}>
                <WidgetLayout>{children}</WidgetLayout>
                <style>{`
                  html, body { overflow-y: auto !important; height: auto !important; }
                  [data-widget-layout] { overflow: visible !important; height: auto !important; }
                `}</style>
            </body>
        </html>
    );
}
