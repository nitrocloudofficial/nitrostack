'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

// ─────────────────────────────────────────────
// Data Types (mirrors supplier.service.ts output)
// ─────────────────────────────────────────────
interface EmergencyPoData {
  poId: string;
  linkedOriginalPoId: string;
  supplierId: string;
  supplierName: string;
  sku: string;
  qty: number;
  estimatedTotalCostUsd: number;
  estimatedDeliveryDate: string;
  status: 'HITL_PENDING' | 'APPROVED' | 'REJECTED';
  hitlMessage: string;
}

// ─────────────────────────────────────────────
// Countdown Hook (SLA deadline pressure)
// ─────────────────────────────────────────────
function useCountdown(targetDateStr: string) {
  const [diff, setDiff] = useState(0);

  useEffect(() => {
    const target = new Date(targetDateStr).getTime();
    const tick = () => setDiff(Math.max(0, target - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDateStr]);

  const totalSec = Math.floor(diff / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return { h, m, s, expired: diff === 0 };
}

// ─────────────────────────────────────────────
// Widget Component
// ─────────────────────────────────────────────
export default function EmergencyPoApproval() {
  const theme = useTheme();
  const { getToolOutput, callTool } = useWidgetSDK();
  const [decision, setDecision] = useState<'idle' | 'approving' | 'rejecting' | 'done'>('idle');
  const [finalStatus, setFinalStatus] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const data = getToolOutput<EmergencyPoData>();
  const isDark = theme === 'dark';

  // SLA countdown — counts down to delivery date
  const deliveryDate = data?.estimatedDeliveryDate
    ? `${data.estimatedDeliveryDate}T23:59:59`
    : new Date(Date.now() + 2 * 86400 * 1000).toISOString();
  const { h, m, s, expired } = useCountdown(deliveryDate);

  if (!data) {
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        color: isDark ? '#9ca3af' : '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <span style={{ fontSize: 32 }}>⏳</span>
        <p>Awaiting Emergency PO data...</p>
      </div>
    );
  }

  const isDone = finalStatus !== null || data.status !== 'HITL_PENDING';
  const resolvedStatus = finalStatus ?? (data.status !== 'HITL_PENDING' ? data.status : null);

  const handleDecision = async (approve: boolean) => {
    setDecision(approve ? 'approving' : 'rejecting');
    setError(null);
    try {
      await callTool('raise_emergency_po', {
        supplier_id: data.supplierId,
        sku: data.sku,
        qty: data.qty,
        linked_original_po_id: data.linkedOriginalPoId,
        estimated_total_cost_usd: data.estimatedTotalCostUsd,
        approved: approve,
      });
      setFinalStatus(approve ? 'APPROVED' : 'REJECTED');
    } catch (err) {
      setError('Failed to submit decision. Please retry.');
    } finally {
      setDecision('idle');
    }
  };

  const textPrimary = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: isDark
        ? 'linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)'
        : 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)',
      borderRadius: 16, padding: 24, maxWidth: 480,
      border: `1px solid ${isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.4)'}`,
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.5)'
        : '0 8px 32px rgba(245,158,11,0.15)',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>⚠️</div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
            HUMAN APPROVAL REQUIRED
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: textMuted }}>
            Emergency Purchase Order · HITL Gate
          </p>
        </div>
      </div>

      {/* ── Countdown Timer ── */}
      {!isDone && (
        <div style={{
          background: expired ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.1)',
          border: `1px solid ${expired ? '#ef4444' : '#f59e0b'}`,
          borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 12, color: textMuted }}>
            {expired ? '⏰ SLA Deadline Passed' : '⏰ SLA Window Closes In'}
          </span>
          <span style={{
            fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
            color: expired ? '#ef4444' : '#f59e0b',
          }}>
            {expired ? 'EXPIRED' : `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
          </span>
        </div>
      )}

      {/* ── PO Details ── */}
      <div style={{
        background: surfaceBg, border: `1px solid ${borderColor}`,
        borderRadius: 10, padding: '14px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
          {[
            { label: 'Emergency PO ID', value: data.poId },
            { label: 'Replaces PO', value: data.linkedOriginalPoId },
            { label: 'Supplier', value: data.supplierName },
            { label: 'SKU', value: data.sku },
            { label: 'Quantity', value: `${data.qty.toLocaleString()} units` },
            { label: 'Est. Delivery', value: data.estimatedDeliveryDate },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary, wordBreak: 'break-all' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Total Cost — prominent */}
        <div style={{
          marginTop: 14, paddingTop: 14,
          borderTop: `1px dashed ${borderColor}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: textMuted }}>Total Authorised Spend</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>
            ${data.estimatedTotalCostUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── Status / Result ── */}
      {isDone && resolvedStatus && (
        <div style={{
          background: resolvedStatus === 'APPROVED' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${resolvedStatus === 'APPROVED' ? '#10b981' : '#ef4444'}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 22 }}>{resolvedStatus === 'APPROVED' ? '✅' : '❌'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: resolvedStatus === 'APPROVED' ? '#10b981' : '#ef4444' }}>
              {resolvedStatus === 'APPROVED' ? 'PO Approved & Dispatched' : 'PO Rejected'}
            </div>
            <div style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
              {resolvedStatus === 'APPROVED'
                ? 'Slack alert sent to #warehouse-alerts. Supplier notified.'
                : 'No PO was raised. Escalate to procurement team manually.'}
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: 12, color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* ── HITL Buttons ── */}
      {!isDone && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            id="btn-approve-emergency-po"
            disabled={decision !== 'idle'}
            onClick={() => handleDecision(true)}
            style={{
              flex: 1, padding: '13px 16px', borderRadius: 10, border: 'none',
              background: decision === 'approving'
                ? '#065f46'
                : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
              opacity: decision !== 'idle' ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {decision === 'approving' ? '⏳ Approving...' : '✅ Approve Emergency PO'}
          </button>
          <button
            id="btn-reject-emergency-po"
            disabled={decision !== 'idle'}
            onClick={() => handleDecision(false)}
            style={{
              padding: '13px 16px', borderRadius: 10,
              border: '1px solid #ef4444',
              background: decision === 'rejecting' ? 'rgba(239,68,68,0.2)' : 'transparent',
              color: '#ef4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              opacity: decision !== 'idle' ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {decision === 'rejecting' ? '⏳' : '❌ Reject'}
          </button>
        </div>
      )}

      <p style={{ margin: '14px 0 0', fontSize: 11, color: textMuted, textAlign: 'center' }}>
        FlowLogix HITL Gate · Spending authority required · Stage 1
      </p>
    </div>
  );
}
