'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';

/**
 * Network Check Widget
 * Bound to: check_network_hospital
 *
 * A deliberately small, single-fact widget: is this hospital in the
 * insurer's network. Kept compact since it's usually a quick side-check
 * during a larger conversation, not a destination view.
 */

interface NetworkCheckData {
  hospitalId: string;
  isNetworkHospital: boolean;
}

export default function NetworkCheck() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const data = getToolOutput<NetworkCheckData>();
  const isDark = theme === 'dark';

  const surface = isDark ? '#1e1e2e' : '#ffffff';
  const textPrimary = isDark ? '#e2e8f0' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  if (!data) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: textMuted, fontFamily: 'system-ui' }}>
        <div style={{ fontSize: 28, marginBottom: 6 }}>🏥</div>
        <p style={{ margin: 0, fontSize: 12 }}>Call <code>check_network_hospital</code> to check a hospital.</p>
      </div>
    );
  }

  const inNetwork = data.isNetworkHospital;
  const color = inNetwork ? '#059669' : '#dc2626';
  const bg = inNetwork ? '#d1fae5' : '#fee2e2';
  const borderColor = inNetwork ? '#6ee7b7' : '#fca5a5';

  return (
    <div style={{
      fontFamily: "'Inter', system-ui, sans-serif",
      background: surface,
      border: `1px solid ${border}`,
      borderRadius: 16,
      overflow: 'hidden',
      maxWidth: 320,
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${color}22, ${color}08)`,
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}>
        <span style={{ fontSize: 30 }}>{inNetwork ? '✅' : '🚫'}</span>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: textMuted }}>
            {data.hospitalId}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color }}>
            {inNetwork ? 'In-Network' : 'Out-of-Network'}
          </p>
        </div>
      </div>
      <div style={{ padding: '10px 20px', background: bg, borderTop: `1px solid ${borderColor}` }}>
        <p style={{ margin: 0, fontSize: 11, color, lineHeight: 1.4 }}>
          {inNetwork
            ? 'Cashless treatment is available at this hospital under the insurer\'s network.'
            : 'This hospital is outside the insurer\'s network — the patient will likely need to pay upfront and file for reimbursement.'}
        </p>
      </div>
    </div>
  );
}
