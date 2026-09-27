'use client';

import { useEffect } from 'react';
import { WidgetLayout } from '@nitrostack/widgets';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    useEffect(() => {
        // WidgetLayout locks body scroll and relies on a parent frame to resize
        // the iframe to fit content. When previewing a page standalone (no
        // embedding host, e.g. opening localhost:3001 directly), nothing resizes
        // it, so the lock just breaks scrolling. Undo it in that case.
        if (window.self === window.top) {
            document.body.style.overflow = 'auto';
        }
    }, []);

    return (
        <html lang="en">
            <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
                <WidgetLayout>{children}</WidgetLayout>
            </body>
        </html>
    );
}
