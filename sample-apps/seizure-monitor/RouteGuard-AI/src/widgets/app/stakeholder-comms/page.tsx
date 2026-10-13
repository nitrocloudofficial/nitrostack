'use client';

import { useTheme, useWidgetState, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Mail, Database, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, Send, Inbox } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Notification {
  id: string; type: string; channel: string; recipientEmail?: string;
  subject: string; body: string; sent: boolean; sentAt?: string;
  deliveryStatus: string; metadata?: Record<string, unknown>; createdAt: string;
}
interface ErpPayload {
  id: string; type: string; shipmentId?: string;
  skuUpdates?: { sku: string; reason?: string }[];
  shipmentStatusUpdate?: { shipmentId: string; newStatus: string; estimatedArrival?: string; delayReason?: string };
  slaAlert?: { shipmentId: string; customerId: string; riskLevel: string; message: string };
  sentToErp: boolean; sentAt?: string; erpReference?: string; createdAt: string;
}
interface Summary { notificationsSent: number; erpUpdatesSent: number; timestamp: string; }
interface WidgetData { notifications: Notification[]; erpPayloads: ErpPayload[]; summary: Summary; }

// ── Demo data ──────────────────────────────────────────────────────────────────
const DEMO: WidgetData = {
  summary: { notificationsSent: 3, erpUpdatesSent: 2, timestamp: '2026-08-01T00:00:00.000Z' },
  notifications: [
    { id: 'n1', type: 'threat_alert', channel: 'email', recipientEmail: 'ops@company.com',
      subject: '🚨 SUPPLY CHAIN ALERT: Typhoon Approaching Port of Shanghai',
      body: `A HIGH threat has been detected:\n\nTyphoon Approaching Port of Shanghai\nCategory 4 typhoon expected to hit Shanghai port in 48 hours. Port authority has issued closure notice.\n\nLocation: East China Sea\nAffected Routes: Shanghai-Rotterdam, Shanghai-Los Angeles, Shanghai-Singapore\nImpact Window: Today → +3 days\nConfidence: 95%\n\nSource: weather_api`,
      sent: true, sentAt: '2026-08-01T00:00:00.000Z', deliveryStatus: 'sent', createdAt: '2026-08-01T00:00:00.000Z',
      metadata: { threatId: 'threat-001', severity: 'high' } },
    { id: 'n2', type: 'impact_forecast', channel: 'email', recipientEmail: 'ops@company.com',
      subject: '📊 IMPACT FORECAST: 3 shipments at risk',
      body: `Impact Analysis for: Typhoon Approaching Port of Shanghai\n\nAffected Shipments: 3\nTotal Financial Exposure: $240,625\nTotal Delay: 26.3 days\nCustomers Impacted: 3\nSLA Breach Risk: 94%\n\nTop Affected Shipments:\n- ship-001: 8.75 day delay, $36,458 exposure\n- ship-002: 8.75 day delay, $87,500 exposure\n- ship-003: 8.75 day delay, $116,667 exposure`,
      sent: true, sentAt: '2026-08-01T00:00:00.000Z', deliveryStatus: 'sent', createdAt: '2026-08-01T00:00:00.000Z',
      metadata: { impactId: 'impact-001', threatId: 'threat-001' } },
    { id: 'n3', type: 'reroute_proposal', channel: 'email', recipientEmail: 'ops@company.com',
      subject: '✈️ CONTINGENCY PLAN: 3 reroute options available',
      body: `Contingency Plan for Shipment: ship-001\n\nAvailable Reroute Options: 3\n\nRecommended Option:\nSennder via truck saves 2.0 days for $10,000\nExpected Outcome: Shipment arrives 2 days earlier with 93% on-time reliability\n\nOption 1: Sennder via truck\n- Delay Reduction: 2.0 days\n- Additional Cost: $10,000\n- Carrier Reliability: 93%\n\nOption 2: Lufthansa Cargo via air\n- Delay Reduction: 20.0 days\n- Additional Cost: $382,500\n- Carrier Reliability: 98%\n\nApproval Required: NO`,
      sent: true, sentAt: '2026-08-01T00:00:00.000Z', deliveryStatus: 'sent', createdAt: '2026-08-01T00:00:00.000Z',
      metadata: { planId: 'plan-ship-001-threat-001' } },
  ],
  erpPayloads: [
    { id: 'e1', type: 'shipment_status', shipmentId: 'ship-001', sentToErp: true,
      sentAt: '2026-08-01T00:00:00.000Z', erpReference: 'ERP-1722470400000', createdAt: '2026-08-01T00:00:00.000Z',
      shipmentStatusUpdate: { shipmentId: 'ship-001', newStatus: 'delayed', estimatedArrival: '2026-08-31T00:00:00.000Z', delayReason: 'Typhoon Approaching Port of Shanghai' } },
    { id: 'e2', type: 'sla_alert', shipmentId: 'ship-001', sentToErp: true,
      sentAt: '2026-08-01T00:00:00.000Z', erpReference: 'ERP-SLA-1722470400000', createdAt: '2026-08-01T00:00:00.000Z',
      slaAlert: { shipmentId: 'ship-001', customerId: 'customer-001', riskLevel: 'high', message: 'SLA breach risk for shipment ship-001: high risk level' } },
  ],
};

// ── Palettes ───────────────────────────────────────────────────────────────────
const NOTIF_EMOJI: Record<string, string> = {
  threat_alert: '🚨', impact_forecast: '📊', reroute_proposal: '✈️',
  reroute_approved: '✅', shipment_delayed: '⏳', shipment_recovered: '🎉',
  sla_breach_warning: '⚠️', inventory_adjustment: '📦',
};
const ERP_LABEL: Record<string, string> = {
  inventory_adjustment: 'Inventory Adjustment', shipment_status: 'Shipment Status',
  forecast_update: 'Forecast Update', sla_alert: 'SLA Alert',
};
const RISK_PAL = {
  light: { low: { bg: '#f0fdf4', text: '#166534', border: '#86efac' }, medium: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' }, high: { bg: '#fff1f2', text: '#9f1239', border: '#fda4af' }, critical: { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' } },
  dark:  { low: { bg: '#052e16', text: '#86efac', border: '#166534' }, medium: { bg: '#451a03', text: '#fcd34d', border: '#b45309' }, high: { bg: '#4c0519', text: '#fda4af', border: '#9f1239' }, critical: { bg: '#3b0764', text: '#e9d5ff', border: '#7e22ce' } },
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function NotifCard({ notif, isOpen, onToggle, isDark }: { notif: Notification; isOpen: boolean; onToggle: () => void; isDark: boolean }) {
  const surface = isDark ? '#17171a' : '#ffffff';
  const border  = isDark ? '#2a2a30' : '#e2e8f0';
  const textPri = isDark ? '#f1f5f9' : '#0f172a';
  const textSec = isDark ? '#94a3b8' : '#64748b';
  const textMid = isDark ? '#cbd5e1' : '#475569';
  const sentCol = notif.sent ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#fbbf24' : '#d97706');

  return (
    <div style={{ background: surface, border: `1.5px solid ${isOpen ? (isDark ? '#2563eb' : '#93c5fd') : border}`, borderRadius: '10px', overflow: 'hidden', transition: 'all 0.15s', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isOpen ? (isDark ? '#1e3a8a' : '#dbeafe') : (isDark ? '#1e1e23' : '#f8fafc'), border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
          {NOTIF_EMOJI[notif.type] ?? '📩'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: textPri, lineHeight: 1.3 }}>{notif.subject}</p>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
              {notif.sent ? <CheckCircle size={13} style={{ color: sentCol }} /> : <Clock size={13} style={{ color: sentCol }} />}
              <span style={{ fontSize: '10px', fontWeight: 700, color: sentCol }}>{notif.deliveryStatus}</span>
              {isOpen ? <ChevronUp size={13} style={{ color: textSec }} /> : <ChevronDown size={13} style={{ color: textSec }} />}
            </div>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: textSec }}>
            <span style={{ fontWeight: 600 }}>{notif.channel.toUpperCase()}</span> → {notif.recipientEmail ?? notif.channel}
            {notif.sentAt && <span suppressHydrationWarning style={{ marginLeft: '6px' }}>· {new Date(notif.sentAt).toLocaleTimeString()}</span>}
          </p>
        </div>
      </div>
      {isOpen && (
        <div style={{ borderTop: `1px solid ${border}`, padding: '12px 14px' }}>
          <pre style={{ margin: 0, fontSize: '11px', color: textMid, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.65, background: isDark ? '#0d0d0f' : '#f8fafc', padding: '10px 12px', borderRadius: '8px', maxHeight: '180px', overflow: 'auto', border: `1px solid ${border}` }}>
            {notif.body}
          </pre>
          {notif.metadata && Object.keys(notif.metadata).length > 0 && (
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {Object.entries(notif.metadata).map(([k, v]) => (
                <span key={k} style={{ padding: '2px 8px', background: isDark ? '#1e1e23' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '4px', fontSize: '10px', color: textSec, fontWeight: 500 }}>
                  {k}: <strong style={{ color: textPri }}>{String(v)}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ErpCard({ payload, isOpen, onToggle, isDark }: { payload: ErpPayload; isOpen: boolean; onToggle: () => void; isDark: boolean }) {
  const surface = isDark ? '#17171a' : '#ffffff';
  const border  = isDark ? '#2a2a30' : '#e2e8f0';
  const textPri = isDark ? '#f1f5f9' : '#0f172a';
  const textSec = isDark ? '#94a3b8' : '#64748b';
  const textMid = isDark ? '#cbd5e1' : '#475569';
  const sentCol = payload.sentToErp ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#fbbf24' : '#d97706');
  const rp = isDark ? RISK_PAL.dark : RISK_PAL.light;
  const slaStyle = payload.slaAlert ? rp[payload.slaAlert.riskLevel as keyof typeof rp] : null;

  return (
    <div style={{ background: surface, border: `1.5px solid ${isOpen ? (isDark ? '#2563eb' : '#93c5fd') : border}`, borderRadius: '10px', overflow: 'hidden', transition: 'all 0.15s', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div onClick={onToggle} style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isOpen ? (isDark ? '#1e3a8a' : '#dbeafe') : (isDark ? '#1e1e23' : '#f8fafc'), border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Database size={14} style={{ color: isDark ? '#60a5fa' : '#2563eb' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: textPri }}>{ERP_LABEL[payload.type] ?? payload.type}</p>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
              {payload.sentToErp ? <CheckCircle size={13} style={{ color: sentCol }} /> : <Clock size={13} style={{ color: sentCol }} />}
              <span style={{ fontSize: '10px', fontWeight: 700, color: sentCol }}>{payload.sentToErp ? 'synced' : 'pending'}</span>
              {isOpen ? <ChevronUp size={13} style={{ color: textSec }} /> : <ChevronDown size={13} style={{ color: textSec }} />}
            </div>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: textSec }}>
            {payload.shipmentId && <span>Shipment: <strong>{payload.shipmentId}</strong></span>}
            {payload.erpReference && <span style={{ marginLeft: '6px' }}>· Ref: <code style={{ fontSize: '10px' }}>{payload.erpReference}</code></span>}
          </p>
        </div>
      </div>
      {isOpen && (
        <div style={{ borderTop: `1px solid ${border}`, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payload.shipmentStatusUpdate && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ background: isDark ? '#0d0d0f' : '#f8fafc', border: `1px solid ${border}`, borderRadius: '6px', padding: '8px' }}>
                <div style={{ fontSize: '10px', color: textSec, marginBottom: '2px' }}>New Status</div>
                <div style={{ fontWeight: 700, color: textPri, textTransform: 'capitalize' }}>{payload.shipmentStatusUpdate.newStatus}</div>
              </div>
              {payload.shipmentStatusUpdate.estimatedArrival && (
                <div style={{ background: isDark ? '#0d0d0f' : '#f8fafc', border: `1px solid ${border}`, borderRadius: '6px', padding: '8px' }}>
                  <div style={{ fontSize: '10px', color: textSec, marginBottom: '2px' }}>New ETA</div>
                  <div style={{ fontWeight: 700, color: textPri }} suppressHydrationWarning>{new Date(payload.shipmentStatusUpdate.estimatedArrival).toLocaleDateString()}</div>
                </div>
              )}
              {payload.shipmentStatusUpdate.delayReason && (
                <div style={{ gridColumn: '1/-1', background: isDark ? '#0d0d0f' : '#f8fafc', border: `1px solid ${border}`, borderRadius: '6px', padding: '8px' }}>
                  <div style={{ fontSize: '10px', color: textSec, marginBottom: '2px' }}>Delay Reason</div>
                  <div style={{ fontSize: '12px', color: textMid }}>{payload.shipmentStatusUpdate.delayReason}</div>
                </div>
              )}
            </div>
          )}
          {payload.slaAlert && slaStyle && (
            <div style={{ padding: '10px 12px', background: slaStyle.bg, border: `1px solid ${slaStyle.border}`, borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: slaStyle.text, marginBottom: '4px' }}>
                SLA Breach Risk — {payload.slaAlert.riskLevel.toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: slaStyle.text }}>{payload.slaAlert.message}</div>
              <div style={{ fontSize: '11px', color: slaStyle.text, opacity: 0.8, marginTop: '4px' }}>Customer: {payload.slaAlert.customerId}</div>
            </div>
          )}
          {payload.skuUpdates && payload.skuUpdates.length > 0 && (
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: textSec, marginBottom: '6px' }}>SKU Updates</div>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {payload.skuUpdates.map(s => (
                  <span key={s.sku} style={{ padding: '3px 10px', background: isDark ? '#1e1e23' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '20px', fontSize: '11px', color: textMid, fontWeight: 600 }}>{s.sku}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export default function StakeholderCommsWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const isDark = theme === 'dark';
  const { isReady, getToolOutput } = useWidgetSDK();
  const raw = getToolOutput<WidgetData>();
  const data: WidgetData = (isReady && raw) ? raw : DEMO;
  const isDemo = !(isReady && raw);

  const [state, setState] = useWidgetState<{ tab: 'notifications' | 'erp'; open: string | null }>
    (() => ({ tab: 'notifications', open: null }));

  const bg      = isDark ? '#0d0d0f' : '#f8fafc';
  const surface = isDark ? '#17171a' : '#ffffff';
  const border  = isDark ? '#2a2a30' : '#e2e8f0';
  const textPri = isDark ? '#f1f5f9' : '#0f172a';
  const textSec = isDark ? '#94a3b8' : '#64748b';

  const { notifications, erpPayloads, summary } = data;
  const tab = state?.tab ?? 'notifications';

  const kpis = [
    { icon: <Send size={14} />, label: 'Emails Sent', value: notifications.filter(n => n.sent).length, color: isDark ? '#60a5fa' : '#2563eb' },
    { icon: <Database size={14} />, label: 'ERP Synced', value: erpPayloads.filter(e => e.sentToErp).length, color: isDark ? '#4ade80' : '#16a34a' },
    { icon: <AlertTriangle size={14} />, label: 'Pending', value: notifications.filter(n => !n.sent).length + erpPayloads.filter(e => !e.sentToErp).length, color: isDark ? '#fbbf24' : '#d97706' },
  ];

  return (
    <div style={{ background: bg, height: maxHeight || '640px', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? '#1e1e23' : '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Inbox size={18} style={{ color: isDark ? '#60a5fa' : '#0284c7' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: textPri }}>
                Stakeholder Comms
                {isDemo && <span style={{ marginLeft: '8px', padding: '1px 6px', background: isDark ? '#1e3a8a' : '#dbeafe', color: isDark ? '#93c5fd' : '#1e40af', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>DEMO</span>}
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: textSec }}>
                {summary.notificationsSent} sent · {summary.erpUpdatesSent} ERP syncs · <span suppressHydrationWarning>{new Date(summary.timestamp).toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {kpis.map(k => (
            <div key={k.label} style={{ background: isDark ? '#1e1e23' : '#f8fafc', border: `1px solid ${border}`, borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ color: k.color }}>{k.icon}</div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: '10px', color: textSec, marginTop: '2px' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '6px', padding: '10px 12px 0', flexShrink: 0 }}>
        {([['notifications', '📧 Emails', notifications.length], ['erp', '🔗 ERP Payloads', erpPayloads.length]] as const).map(([key, label, count]) => {
          const active = tab === key;
          return (
            <button key={key} onClick={() => setState({ tab: key, open: null })}
              style={{ padding: '7px 16px', borderRadius: '8px', border: `1.5px solid ${active ? (isDark ? '#2563eb' : '#3b82f6') : border}`,
                background: active ? (isDark ? '#1e3a8a' : '#eff6ff') : 'transparent',
                color: active ? (isDark ? '#93c5fd' : '#1e40af') : textSec,
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
              {label} ({count})
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tab === 'notifications'
            ? notifications.map(n => (
                <NotifCard key={n.id} notif={n} isDark={isDark}
                  isOpen={state?.open === n.id}
                  onToggle={() => setState({ ...state, open: state?.open === n.id ? null : n.id })} />
              ))
            : erpPayloads.map(p => (
                <ErpCard key={p.id} payload={p} isDark={isDark}
                  isOpen={state?.open === p.id}
                  onToggle={() => setState({ ...state, open: state?.open === p.id ? null : p.id })} />
              ))}
          {tab === 'notifications' && notifications.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: textSec }}>
              <Mail size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} /><p style={{ margin: 0 }}>No notifications</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: textSec }}>NitroStack Supply Chain Intelligence</span>
        <span style={{ fontSize: '11px', color: textSec }}>ERP & Stakeholder Sync</span>
      </div>
    </div>
  );
}
