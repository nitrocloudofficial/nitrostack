'use client';

import { useWidgetSDK } from '@nitrostack/widgets';

/**
 * stat-card archetype -- generic, not per-tool. Same simplification as
 * data-table/page.tsx: auto-detects the first top-level numeric property
 * on toolOutput rather than reading ToolIR.widget.mapping.valuePath.
 */
export default function StatCardWidget() {
  const { isReady, toolOutput } = useWidgetSDK();

  if (!isReady) {
    return <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif' }}>Loading...</div>;
  }

  const output = (toolOutput ?? {}) as Record<string, unknown>;
  const entry = Object.entries(output).find(([, v]) => typeof v === 'number');

  if (!entry) {
    return (
      <div style={{ padding: 16, fontFamily: 'system-ui, sans-serif', color: '#666' }}>
        No numeric value to display.
      </div>
    );
  }

  const [label, value] = entry;

  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        border: '1px solid #eee',
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 13, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label.replace(/_/g, ' ')}
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8, color: '#111' }}>
        {typeof value === 'number' ? value.toLocaleString() : String(value)}
      </div>
    </div>
  );
}
