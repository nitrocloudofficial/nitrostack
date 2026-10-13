'use client';

import React from 'react';
import { useWidgetSDK, useWidgetState, useTheme } from '@nitrostack/widgets';

// ─────────────────────────────────────────────
// Data Types (mirrors inbound.service.ts output)
// ─────────────────────────────────────────────
interface ShipmentIncidentData {
  poId: string;
  sku: string;
  itemName: string;
  damagedQty: number;
  totalQty: number;
  damagePercentage: number;
  imageProcessedAt: string;
  confidence: number;
}

type RiskLevel = 'RED' | 'AMBER' | 'GREEN';

interface AtpData {
  riskLevel: RiskLevel;
  shortfallQty: number;
  survivingQty: number;
  requiredQty: number;
  slaDeliveryDays: number;
  slaBreached: boolean;
  customerName: string;
  financialExposureUsd: number;
  recommendedAction: string;
}

// The widget receives the OCR output; ATP may be nested if agent chains them
interface WidgetPayload extends ShipmentIncidentData {
  atpResult?: AtpData;
}

// ─────────────────────────────────────────────
// Style Helpers
// ─────────────────────────────────────────────
const RISK_CONFIG: Record<RiskLevel, { bg: string; border: string; label: string; icon: string }> = {
  RED: { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', label: 'SLA BREACH IMMINENT', icon: '🔴' },
  AMBER: { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', label: 'AT RISK', icon: '🟡' },
  GREEN: { bg: 'rgba(16,185,129,0.15)', border: '#10b981', label: 'NO BREACH', icon: '🟢' },
};

// ─────────────────────────────────────────────
// Widget Component
// ─────────────────────────────────────────────
export default function ShipmentIncidentCard() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ expanded: boolean }>(() => ({ expanded: true }));

  const data = getToolOutput<WidgetPayload>();
  const isDark = theme === 'dark';

  if (!data) {
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        color: isDark ? '#9ca3af' : '#6b7280',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <span style={{ fontSize: 32 }}>📦</span>
        <p>Waiting for shipment scan data...</p>
      </div>
    );
  }

  const atp = data.atpResult;
  const riskConfig = atp ? RISK_CONFIG[atp.riskLevel] : null;
  const damageBar = Math.min(data.damagePercentage, 100);

  const cardBg = isDark
    ? 'linear-gradient(135deg, #1e2533 0%, #111827 100%)'
    : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)';

  const textPrimary = isDark ? '#f9fafb' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';
  const surfaceBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      background: cardBg,
      borderRadius: 16,
      padding: 24,
      maxWidth: 480,
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.4)'
        : '0 8px 32px rgba(0,0,0,0.12)',
      border: `1px solid ${borderColor}`,
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #f97316, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>🚛</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: textPrimary }}>
              Shipment Incident
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: textMuted }}>
              Stage 1 · Inbound & Receiving
            </p>
          </div>
        </div>
        <button
          onClick={() => setState({ expanded: !state?.expanded })}
          style={{
            background: surfaceBg, border: `1px solid ${borderColor}`,
            borderRadius: 8, padding: '4px 10px',
            color: textMuted, cursor: 'pointer', fontSize: 12,
          }}
        >
          {state?.expanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {/* ── PO Meta ── */}
      <div style={{
        background: surfaceBg, borderRadius: 10, padding: '12px 16px',
        border: `1px solid ${borderColor}`, marginBottom: 16,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
          {[
            { label: 'PO ID', value: data.poId },
            { label: 'SKU', value: data.sku },
            { label: 'Item', value: data.itemName },
            { label: 'OCR Confidence', value: `${(data.confidence * 100).toFixed(0)}%` },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: textMuted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Damage Bar ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: textMuted }}>Damage Assessment</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
            {data.damagedQty} / {data.totalQty} units ({data.damagePercentage.toFixed(1)}%)
          </span>
        </div>
        <div style={{ height: 8, background: isDark ? '#374151' : '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${damageBar}%`,
            background: damageBar > 40 ? '#ef4444' : damageBar > 20 ? '#f59e0b' : '#10b981',
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* ── ATP / Risk Badge ── */}
      {atp && riskConfig && state?.expanded && (
        <div style={{
          background: riskConfig.bg,
          border: `1px solid ${riskConfig.border}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{riskConfig.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: riskConfig.border }}>
              {riskConfig.label}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginBottom: 8 }}>
            {[
              { label: 'Customer', value: atp.customerName },
              { label: 'SLA Days Left', value: `${atp.slaDeliveryDays}d` },
              { label: 'Shortfall', value: `${atp.shortfallQty} units` },
              { label: 'Financial Risk', value: `$${atp.financialExposureUsd.toLocaleString()}` },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: textMuted }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: textPrimary }}>{value}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: textMuted, lineHeight: 1.5 }}>
            {atp.recommendedAction}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          id="btn-raise-emergency-po"
          onClick={() =>
            sendFollowUpMessage(
              `Find an alternate supplier for ${data.sku} and raise an emergency PO to cover the shortfall from ${data.poId}`
            )
          }
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #f97316, #dc2626)',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(239,68,68,0.35)',
            transition: 'opacity 0.2s',
          }}
        >
          🚨 Source Replacement Stock
        </button>
        <button
          id="btn-log-qc-incident"
          onClick={() =>
            sendFollowUpMessage(
              `Log a QC failure for item ${data.sku} from PO ${data.poId} with ${data.damagedQty} affected units`
            )
          }
          style={{
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${borderColor}`,
            background: surfaceBg, color: textPrimary,
            fontSize: 13, cursor: 'pointer', fontWeight: 600,
            transition: 'opacity 0.2s',
          }}
        >
          📋 Log QC
        </button>
      </div>

      <p style={{ margin: '12px 0 0', fontSize: 11, color: textMuted, textAlign: 'center' }}>
        Scanned {new Date(data.imageProcessedAt).toLocaleString()} · FlowLogix Stage 1
      </p>
    </div>
  );
}
