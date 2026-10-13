'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplianceMatch {
  entity_name: string;
  reason: string;
}

interface ComplianceResult {
  status: 'CLEAN' | 'FLAGGED' | 'BLOCKED';
  matches: ComplianceMatch[];
}

interface HsCodeResult {
  hsCode: string;
  confidence: number;
  description: string;
}

interface ValidationResult {
  status: 'match' | 'mismatch' | 'exception';
  discrepancies: string[];
  suggestedHsCode?: string;
}

interface InvoiceLineItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ExtractedInvoice {
  invoiceNumber: string;
  poNumber: string;
  vendor: string;
  invoiceDate: string;
  totalAmount: number;
  lineItems: InvoiceLineItem[];
}

interface ApResult {
  status: string;
  message?: string;
}

interface WorkflowOutput {
  status: string;
  summary: string;
  output: {
    invoice?:          ExtractedInvoice;
    validationResult?: ValidationResult;
    hsCodeResult?:     HsCodeResult;
    complianceResult?: ComplianceResult;
    apResult?:         ApResult;
  };
}

// ─── Colour map — covers every status the backend can return ──────────────────

const STATUS_COLOUR: Record<string, string> = {
  'Auto-approved':    '#22c55e',
  'Pending-approval': '#f59e0b',
  'Duplicate':        '#8b5cf6',
  Flagged:            '#ef4444',
  exception:          '#f97316',
  aborted:            '#6b7280',
  failed:             '#dc2626',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
      <span style={{ color: sub }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function SectionLabel({ text, sub }: { text: string; sub: string }) {
  return (
    <div style={{ fontSize: 11, color: sub, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
      {text}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export default function InvoiceResultWidget() {
  const { isReady, getToolOutput, theme } = useWidgetSDK();
  const data = getToolOutput<WorkflowOutput>();

  if (!isReady) return <div style={{ padding: 16 }}>Connecting…</div>;
  if (!data)    return <div style={{ padding: 16 }}>No invoice data yet.</div>;

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const isDark  = theme === 'dark';
  const bg      = isDark ? '#1e1e2e' : '#f8fafc';
  const card    = isDark ? '#2a2a3e' : '#ffffff';
  const text    = isDark ? '#e2e8f0' : '#1e293b';
  const sub     = isDark ? '#94a3b8' : '#64748b';
  const border  = isDark ? '#3f3f5e' : '#e2e8f0';
  const statusColour = STATUS_COLOUR[data.status] ?? '#6b7280';

  const invoice    = data.output?.invoice;
  const result     = data.output?.validationResult;
  const hsCode     = data.output?.hsCodeResult;
  const compliance = data.output?.complianceResult;
  const apResult   = data.output?.apResult;

  const isBlocked   = compliance?.status === 'BLOCKED';
  const isPending   = data.status === 'Pending-approval';
  const isDuplicate = data.status === 'Duplicate';

  return (
    <div style={{
      background:   bg,
      color:        text,
      fontFamily:   'Inter, system-ui, sans-serif',
      padding:      20,
      borderRadius: 12,
      minWidth:     360,
      maxWidth:     640,
    }}>

      {/* ── Status badge ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{
          width:        12,
          height:       12,
          borderRadius: '50%',
          background:   statusColour,
          display:      'inline-block',
          flexShrink:   0,
        }} />
        <span style={{ fontWeight: 700, fontSize: 18 }}>{data.status}</span>
      </div>

      {/* ── Summary text ──────────────────────────────────────────────────── */}
      <p style={{ color: sub, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
        {data.summary}
      </p>

      {/* ── BLOCKED compliance alert ───────────────────────────────────────── */}
      {isBlocked && (
        <div style={{
          background:   '#fef2f2',
          border:       '1px solid #fca5a5',
          borderRadius: 8,
          padding:      14,
          marginBottom: 14,
        }}>
          <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14, marginBottom: 6 }}>
            🚫 Vendor Blocked — Compliance Violation
          </div>
          {compliance!.matches.map((m, i) => (
            <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 4 }}>
              <strong>{m.entity_name}</strong>: {m.reason}
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#991b1b', marginTop: 6 }}>
            This workflow has been halted and routed to <strong>legal_team</strong> for review.
          </div>
        </div>
      )}

      {/* ── Pending-approval callout ───────────────────────────────────────── */}
      {isPending && (
        <div style={{
          background:   '#fffbeb',
          border:       '1px solid #fcd34d',
          borderRadius: 8,
          padding:      12,
          marginBottom: 14,
          fontSize:     13,
          color:        '#92400e',
        }}>
          ⏳ <strong>Pending Manual Approval</strong> — This invoice exceeded the auto-approval
          threshold and is awaiting finance team sign-off.
          {apResult?.message && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#78350f' }}>{apResult.message}</div>
          )}
        </div>
      )}

      {/* ── Duplicate callout ─────────────────────────────────────────────── */}
      {isDuplicate && (
        <div style={{
          background:   '#f5f3ff',
          border:       '1px solid #c4b5fd',
          borderRadius: 8,
          padding:      12,
          marginBottom: 14,
          fontSize:     13,
          color:        '#4c1d95',
        }}>
          🔁 <strong>Duplicate Detected</strong> — An invoice with the same number has already
          been processed. No AP record was created.
          {apResult?.message && (
            <div style={{ marginTop: 4, fontSize: 12 }}>{apResult.message}</div>
          )}
        </div>
      )}

      {/* ── Invoice details card ───────────────────────────────────────────── */}
      {invoice && (
        <div style={{
          background:   card,
          border:       `1px solid ${border}`,
          borderRadius: 8,
          padding:      14,
          marginBottom: 14,
        }}>
          <SectionLabel text="Invoice Details" sub={sub} />
          <Row label="Invoice #" value={invoice.invoiceNumber}             sub={sub} />
          <Row label="PO #"      value={invoice.poNumber}                   sub={sub} />
          <Row label="Vendor"    value={invoice.vendor}                     sub={sub} />
          <Row label="Date"      value={invoice.invoiceDate}                sub={sub} />
          <Row label="Total"     value={`$${fmt(invoice.totalAmount)}`}     sub={sub} />

          {/* Line items table */}
          {invoice.lineItems.length > 0 && (
            <table style={{
              width:          '100%',
              borderCollapse: 'collapse',
              marginTop:      12,
              fontSize:       12,
            }}>
              <thead>
                <tr style={{ color: sub }}>
                  {['SKU', 'Description', 'Qty', 'Unit $', 'Total'].map((h) => (
                    <th key={h} style={{
                      textAlign:     'left',
                      paddingBottom: 6,
                      fontWeight:    600,
                      whiteSpace:    'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((li, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${border}` }}>
                    <td style={{ padding: '5px 0', fontFamily: 'monospace' }}>{li.sku}</td>
                    <td style={{ padding: '5px 8px 5px 0' }}>{li.description}</td>
                    <td style={{ padding: '5px 8px 5px 0', textAlign: 'right' }}>{li.quantity.toLocaleString()}</td>
                    <td style={{ padding: '5px 8px 5px 0', textAlign: 'right' }}>${fmt(li.unitPrice)}</td>
                    <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 500 }}>${fmt(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── HS Code callout ───────────────────────────────────────────────── */}
      {hsCode && (
        <div style={{
          background:  isDark ? '#1e293b' : '#eff6ff',
          border:      `1px solid ${isDark ? '#334155' : '#bfdbfe'}`,
          borderRadius: 8,
          padding:     12,
          marginBottom: 14,
          display:     'flex',
          alignItems:  'flex-start',
          gap:         10,
        }}>
          <span style={{ fontSize: 18 }}>🔖</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#93c5fd' : '#1d4ed8' }}>
              HS Code: <code style={{ letterSpacing: 1 }}>{hsCode.hsCode}</code>
              <span style={{
                marginLeft:  8,
                fontSize:    11,
                background:  isDark ? '#1e3a5f' : '#dbeafe',
                color:       isDark ? '#93c5fd' : '#1e40af',
                borderRadius: 4,
                padding:     '1px 6px',
              }}>
                {Math.round(hsCode.confidence * 100)}% confidence
              </span>
            </div>
            <div style={{ fontSize: 12, color: sub, marginTop: 2 }}>{hsCode.description}</div>
          </div>
        </div>
      )}

      {/* ── Discrepancies ─────────────────────────────────────────────────── */}
      {result && result.discrepancies.length > 0 && (
        <div style={{
          background:   '#fef2f2',
          border:       '1px solid #fecaca',
          borderRadius: 8,
          padding:      12,
        }}>
          <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6, fontSize: 13 }}>
            ⚠ Discrepancies
          </div>
          {result.discrepancies.map((d, i) => (
            <div key={i} style={{ fontSize: 12, color: '#7f1d1d', marginBottom: 2 }}>• {d}</div>
          ))}
        </div>
      )}
    </div>
  );
}
