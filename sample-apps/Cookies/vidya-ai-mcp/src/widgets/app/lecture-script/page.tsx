'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

export default function LectureScriptWidget() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const theme = useTheme();
  const data = getToolOutput();

  return (
    <main style={{ padding: 16, color: theme === 'dark' ? '#f3f4f6' : '#111827', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 8 }}>Lecture Script</h2>
      <p style={{ marginBottom: 12, opacity: 0.9 }}>Generated lecture content will appear here.</p>
      {!isReady() && <p>Loading widget...</p>}
      {data && (
        <pre style={{ whiteSpace: 'pre-wrap', background: theme === 'dark' ? '#111827' : '#f9fafb', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
          {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        </pre>
      )}
    </main>
  );
}
