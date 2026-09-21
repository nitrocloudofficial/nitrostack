'use client';

import { useTheme, useWidgetState, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { Plane, Ship, Truck, Train, DollarSign, Clock, Star, ChevronDown, ChevronUp, Zap, ArrowRight, CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RerouteOption {
  id: string; shipmentId: string; threatId: string; transportMode: string;
  carrier: string; origin: { port: string; lat: number; lng: number };
  destination: { port: string; lat: number; lng: number };
  estimatedDeparture: string; estimatedArrival: string;
  delayReduction: number; additionalCost: number; costPerDay: number;
  riskScore: number; carrierReliability: number; capacity: number;
  spotRate: number; validUntil: string; status: string;
  approvedBy?: string; bookingReference?: string;
}
interface ContingencyPlan {
  id: string; shipmentId: string; threatId: string; options: RerouteOption[];
  recommendation: { optionId: string; rationale: string; expectedOutcome: string };
  approvalRequired: boolean; approvalThreshold?: number;
  createdAt: string; expiresAt: string;
}
interface Shipment {
  id: string; poNumber: string; status: string; transportMode: string;
  origin: { port: string; lat: number; lng: number; country: string };
  destination: { port: string; lat: number; lng: number; country: string };
  carrier: string; totalValue: number;
}
interface WidgetData { plan: ContingencyPlan; shipment: Shipment; }

// ── Demo data ──────────────────────────────────────────────────────────────────
const DEMO: WidgetData = {
  shipment: {
    id: 'ship-001', poNumber: 'PO-2024-001', status: 'in_transit', transportMode: 'sea', carrier: 'Maersk', totalValue: 125000,
    origin: { port: 'Shanghai', lat: 31.4, lng: 121.5, country: 'China' },
    destination: { port: 'Rotterdam', lat: 51.95, lng: 4.1, country: 'Netherlands' },
  },
  plan: {
    id: 'plan-ship-001-threat-001', shipmentId: 'ship-001', threatId: 'threat-001',
    approvalRequired: false, approvalThreshold: 50000,
    createdAt: '2026-08-01T00:00:00.000Z', expiresAt: '2026-08-02T00:00:00.000Z',
    recommendation: {
      optionId: 'reroute-truck-ship-001',
      rationale: 'Sennder via truck saves 2.0 days for $10,000 — best cost-efficiency',
      expectedOutcome: 'Shipment arrives 2 days earlier with 93% on-time reliability',
    },
    options: [
      { id: 'reroute-truck-ship-001', shipmentId: 'ship-001', threatId: 'threat-001',
        transportMode: 'truck', carrier: 'Sennder',
        origin: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
        destination: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
        estimatedDeparture: '2026-08-02T00:00:00.000Z',
        estimatedArrival:   '2026-08-02T22:00:00.000Z',
        delayReduction: 48, additionalCost: 10000, costPerDay: 5000,
        riskScore: 0.1, carrierReliability: 0.93, capacity: 200, spotRate: 83.33,
        validUntil: '2026-08-01T06:00:00.000Z', status: 'proposed' },
      { id: 'reroute-air-ship-001', shipmentId: 'ship-001', threatId: 'threat-001',
        transportMode: 'air', carrier: 'Lufthansa Cargo',
        origin: { port: 'Shanghai', lat: 31.4, lng: 121.5 },
        destination: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
        estimatedDeparture: '2026-08-01T06:00:00.000Z',
        estimatedArrival:   '2026-08-04T00:00:00.000Z',
        delayReduction: 480, additionalCost: 382500, costPerDay: 19125,
        riskScore: 0.05, carrierReliability: 0.98, capacity: 50, spotRate: 8.5,
        validUntil: '2026-08-01T02:00:00.000Z', status: 'proposed' },
      { id: 'reroute-sea-alt-ship-001', shipmentId: 'ship-001', threatId: 'threat-001',
        transportMode: 'sea', carrier: 'CMA CGM',
        origin: { port: 'Singapore', lat: 1.35, lng: 103.82 },
        destination: { port: 'Rotterdam', lat: 51.95, lng: 4.1 },
        estimatedDeparture: '2026-08-01T12:00:00.000Z',
        estimatedArrival:   '2026-09-05T00:00:00.000Z',
        delayReduction: -120, additionalCost: 5400, costPerDay: 1080,
        riskScore: 0.15, carrierReliability: 0.91, capacity: 350, spotRate: 2.4,
        validUntil: '2026-08-01T04:00:00.000Z', status: 'proposed' },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const MODE_ICON: Record<string, React.ReactNode> = {
  air: <Plane size={15} />, sea: <Ship size={15} />,
  truck: <Truck size={15} />, rail: <Train size={15} />, multimodal: <Ship size={15} />,
};
const MODE_COLOR = {
  light: { air: '#7c3aed', sea: '#0284c7', truck: '#b45309', rail: '#064e3b', multimodal: '#0284c7' },
  dark:  { air: '#a78bfa', sea: '#38bdf8', truck: '#fbbf24', rail: '#34d399', multimodal: '#38bdf8' },
};
const STATUS_PAL = {
  light: {
    proposed: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
    approved: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    executed: { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
    rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  },
  dark: {
    proposed: { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
    approved: { bg: '#14532d', text: '#86efac', border: '#16a34a' },
    executed: { bg: '#1e3a8a', text: '#93c5fd', border: '#2563eb' },
    rejected: { bg: '#7f1d1d', text: '#fca5a5', border: '#dc2626' },
  },
};

function Bar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(Math.round(value * 100), 100)}%`, background: color, borderRadius: height / 2, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export default function RerouteComparatorWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const isDark = theme === 'dark';
  const { isReady, getToolOutput } = useWidgetSDK();
  const raw = getToolOutput<WidgetData>();
  const data: WidgetData = (isReady && raw) ? raw : DEMO;
  const isDemo = !(isReady && raw);

  const [state, setState] = useWidgetState<{ selected: string | null }>(() => ({ selected: null }));

  const bg      = isDark ? '#0d0d0f' : '#f8fafc';
  const surface = isDark ? '#17171a' : '#ffffff';
  const border  = isDark ? '#2a2a30' : '#e2e8f0';
  const textPri = isDark ? '#f1f5f9' : '#0f172a';
  const textSec = isDark ? '#94a3b8' : '#64748b';
  const textMid = isDark ? '#cbd5e1' : '#475569';
  const mc = isDark ? MODE_COLOR.dark : MODE_COLOR.light;
  const sc = isDark ? STATUS_PAL.dark : STATUS_PAL.light;

  const { plan, shipment } = data;

  return (
    <div style={{ background: bg, height: maxHeight || '640px', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? '#1e3a1e' : '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} style={{ color: isDark ? '#4ade80' : '#16a34a' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: textPri }}>
                Reroute Comparator
                {isDemo && <span style={{ marginLeft: '8px', padding: '1px 6px', background: isDark ? '#1e3a8a' : '#dbeafe', color: isDark ? '#93c5fd' : '#1e40af', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>DEMO</span>}
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: textSec }}>
                {plan.options.length} options · Expires <span suppressHydrationWarning>{new Date(plan.expiresAt).toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          {plan.approvalRequired && (
            <span style={{ padding: '4px 10px', background: isDark ? '#451a03' : '#fef3c7', color: isDark ? '#fcd34d' : '#92400e', border: `1px solid ${isDark ? '#b45309' : '#fcd34d'}`, borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
              ⚠ Approval Required
            </span>
          )}
        </div>

        {/* Shipment bar */}
        {shipment && (
          <div style={{ display: 'flex', gap: '0', background: isDark ? '#1e1e23' : '#f8fafc', border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden', fontSize: '11px' }}>
            {[
              { label: 'PO', value: shipment.poNumber },
              { label: 'From', value: shipment.origin.port },
              { label: 'To', value: shipment.destination.port },
              { label: 'Carrier', value: shipment.carrier },
              { label: 'Value', value: `$${(shipment.totalValue / 1000).toFixed(0)}k` },
            ].map((f, i) => (
              <div key={f.label} style={{ flex: 1, padding: '6px 10px', borderRight: i < 4 ? `1px solid ${border}` : 'none', textAlign: 'center' }}>
                <div style={{ color: textSec, fontSize: '10px', marginBottom: '2px' }}>{f.label}</div>
                <div style={{ fontWeight: 700, color: textPri }}>{f.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recommendation banner ── */}
      {plan.recommendation?.optionId && (
        <div style={{ padding: '10px 12px', flexShrink: 0 }}>
          <div style={{ padding: '10px 14px', background: isDark ? '#0a2010' : '#f0fdf4', border: `1.5px solid ${isDark ? '#16a34a' : '#86efac'}`, borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <CheckCircle size={16} style={{ color: isDark ? '#4ade80' : '#16a34a', flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ margin: '0 0 2px', fontSize: '12px', fontWeight: 700, color: isDark ? '#4ade80' : '#16a34a' }}>Recommended Option</p>
              <p style={{ margin: '0 0 2px', fontSize: '12px', color: isDark ? '#86efac' : '#166534' }}>{plan.recommendation.rationale}</p>
              <p style={{ margin: 0, fontSize: '11px', color: isDark ? '#4ade80' : '#16a34a', opacity: 0.8 }}>{plan.recommendation.expectedOutcome}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Options list ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {plan.options.map((opt) => {
            const isSelected = state?.selected === opt.id;
            const isRec = plan.recommendation?.optionId === opt.id;
            const sp = sc[(opt.status as keyof typeof sc) ?? 'proposed'];
            const modeColor = mc[opt.transportMode as keyof typeof mc] ?? mc.sea;

            return (
              <div key={opt.id} onClick={() => setState({ selected: isSelected ? null : opt.id })}
                style={{ background: isSelected ? (isDark ? '#131a11' : '#f0fdf4') : surface,
                  border: `1.5px solid ${isRec ? (isDark ? '#16a34a' : '#86efac') : border}`,
                  borderRadius: '12px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>

                {/* Carrier + mode header */}
                <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: isDark ? '#1e1e23' : '#f8fafc', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: modeColor }}>
                      {MODE_ICON[opt.transportMode] ?? <Ship size={15} />}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: textPri }}>{opt.carrier}</span>
                        {isRec && <Star size={13} style={{ color: isDark ? '#4ade80' : '#16a34a', fill: 'currentColor' }} />}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: textSec }}>
                        <span style={{ color: modeColor, fontWeight: 600, textTransform: 'capitalize' }}>{opt.transportMode}</span>
                        <span>·</span>
                        <span>{opt.origin.port}</span>
                        <ArrowRight size={10} />
                        <span>{opt.destination.port}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ padding: '3px 10px', background: sp.bg, color: sp.text, border: `1px solid ${sp.border}`, borderRadius: '20px', fontSize: '10px', fontWeight: 700 }}>
                      {opt.status}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: opt.delayReduction > 0 ? (isDark ? '#4ade80' : '#16a34a') : (isDark ? '#f87171' : '#dc2626') }}>
                      {opt.delayReduction > 0 ? `−${(opt.delayReduction / 24).toFixed(1)}d` : `+${Math.abs(opt.delayReduction / 24).toFixed(1)}d`}
                    </span>
                    {isSelected ? <ChevronUp size={14} style={{ color: textSec }} /> : <ChevronDown size={14} style={{ color: textSec }} />}
                  </div>
                </div>

                {/* Metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: border, borderTop: `1px solid ${border}` }}>
                  {[
                    { icon: <DollarSign size={13} />, label: 'Extra Cost', value: <span suppressHydrationWarning>{`$${opt.additionalCost.toLocaleString()}`}</span> },
                    { icon: <Clock size={13} />, label: 'Arrives', value: <span suppressHydrationWarning>{new Date(opt.estimatedArrival).toLocaleDateString()}</span> },
                    { icon: <Star size={13} />, label: 'Reliability', value: `${(opt.carrierReliability * 100).toFixed(0)}%` },
                  ].map(m => (
                    <div key={m.label} style={{ background: surface, padding: '8px 12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div style={{ color: textSec }}>{m.icon}</div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: textPri }}>{m.value}</div>
                        <div style={{ fontSize: '10px', color: textSec }}>{m.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reliability bar */}
                <div style={{ padding: '8px 14px', background: surface }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: textSec, marginBottom: '4px' }}>
                    <span>Carrier Reliability</span><span style={{ fontWeight: 700 }}>{(opt.carrierReliability * 100).toFixed(0)}%</span>
                  </div>
                  <Bar value={opt.carrierReliability} color={isDark ? '#4ade80' : '#16a34a'} />
                </div>

                {/* Expanded */}
                {isSelected && (
                  <div style={{ padding: '12px 14px', background: isDark ? '#0d1109' : '#f0fdf4', borderTop: `1px solid ${isDark ? '#16a34a' : '#86efac'}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: textMid }}>
                      <div><span style={{ color: textSec }}>Departs</span><br /><strong style={{ color: textPri }} suppressHydrationWarning>{new Date(opt.estimatedDeparture).toLocaleString()}</strong></div>
                      <div><span style={{ color: textSec }}>Arrives</span><br /><strong style={{ color: textPri }} suppressHydrationWarning>{new Date(opt.estimatedArrival).toLocaleString()}</strong></div>
                      <div><span style={{ color: textSec }}>Spot Rate</span><br /><strong style={{ color: textPri }}>${opt.spotRate.toFixed(2)}/unit</strong></div>
                      <div><span style={{ color: textSec }}>Cost/Day</span><br /><strong style={{ color: textPri }}>${opt.costPerDay.toFixed(0)}</strong></div>
                      <div><span style={{ color: textSec }}>Capacity</span><br /><strong style={{ color: textPri }}>{opt.capacity} TEU</strong></div>
                      <div><span style={{ color: textSec }}>Risk Score</span><br /><strong style={{ color: textPri }}>{(opt.riskScore * 100).toFixed(0)}%</strong></div>
                      <div><span style={{ color: textSec }}>Valid Until</span><br /><strong style={{ color: textPri }} suppressHydrationWarning>{new Date(opt.validUntil).toLocaleTimeString()}</strong></div>
                      {opt.bookingReference && <div><span style={{ color: textSec }}>Booking Ref</span><br /><strong style={{ color: textPri }}>{opt.bookingReference}</strong></div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: textSec }}>NitroStack Supply Chain Intelligence</span>
        <span style={{ fontSize: '11px', color: textSec }}>Global Freight Brokerage</span>
      </div>
    </div>
  );
}
