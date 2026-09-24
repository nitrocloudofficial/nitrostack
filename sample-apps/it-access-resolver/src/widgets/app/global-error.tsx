'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ margin: 0, padding: 24, fontFamily: 'system-ui, sans-serif', background: '#0f172a', color: '#f1f5f9' }}>
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Widget failed to load.</p>
          <button
            onClick={reset}
            style={{
              marginTop: 12, padding: '8px 20px', borderRadius: 8,
              background: '#6366f1', color: 'white', border: 'none',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
