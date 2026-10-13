'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("WIDGET ERROR:", error);
    }, [error]);

    return (
        <div style={{ padding: 20, color: '#ef4444', fontFamily: 'monospace' }}>
            <h2>Widget Error</h2>
            <p>{error.message}</p>
            <button 
                onClick={() => reset()}
                style={{ padding: '8px 16px', marginTop: 10, background: '#ef4444', color: 'white', border: 'none', borderRadius: 4 }}
            >
                Try again
            </button>
        </div>
    );
}
