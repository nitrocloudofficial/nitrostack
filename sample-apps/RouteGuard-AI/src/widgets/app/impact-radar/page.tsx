'use client';

import { useTheme, useWidgetState, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { AlertTriangle, DollarSign, Clock, Users, TrendingUp, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AffectedShipment {
  shipmentId: string;
  delayDays: number;
  delayHours: number;
  financialExposure: number;
  skusAffected: string[];
}

interface Impact {
  id: string;
  threatId: string;
  affectedShipments: AffectedShipment[];
  totalFinancialExposure: number;
  totalDelayHours: number;
  customerCount: number;
  slaBreachRisk: number;
  calculatedAt: string;
  scenario?: string;
}

interface Threat {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  location: { lat: number; lng: number; region?: string; port?: string };
  affectedRoutes: string[];
  source: string;
  confidence: number;
}

interface WidgetData {
  impact: Impact;
  threat: Threat;
}

const DEMO: WidgetData = {
  threat: {
    id: 'threat-001', type: 'weather', severity: 'high',
    title: 'Typhoon Approaching Port of Shanghai',
    description: 'Category 4 typhoon expected to hit Shanghai port in 48 hours. Port authority has issued closure notice.',
    location: { lat: 31.4, lng: 121.5, region: 'East China Sea', port: 'Shanghai' },
    affectedRoutes: ['Shanghai-Rotterdam', 'Shanghai-Los Angeles', 'Shanghai-Singapore'],
    source: 'weather_api', confidence: 0.95,
  },
  impact: {
    id: 'impact-threat-001-demo', threatId: 'threat-001',
    affectedShipments: [
      { shipmentId: 'ship-001', delayDays: 8.75, delayHours: 210, financialExposure: 36458.33, skusAffected: ['SKU-A001', 'SKU-B002'] },
      { shipmentId: 'ship-002', delayDays: 8.75, delayHours: 210, financialExposure: 87500.00, skusAffected: ['SKU-C003', 'SKU-D004'] },
      { shipmentId: 'ship-003', delayDays: 8.75, delayHours: 210, financialExposure: 116666.67, skusAffected: ['SKU-E005'] },
    ],
    totalFinancialExposure: 240625.00, totalDelayHours: 630,
    customerCount: 3, slaBreachRisk: 0.94,
    calculatedAt: '2026-08-01T00:00:00.000Z',
    scenario: 'Impact from Typhoon Approaching Port of Shanghai',
  },
};

const severityColors = {
  light: {
    critical: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5', badge: '#dc2626' },
    high:     { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', badge: '#d97706' },
    medium:   { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd', badge: '#2563eb' },
    low:      { bg: '#dcfce7', text: '#166534', border: '#86efac', badge: '#16a34a' },
  },
  dark: {
    critical: { bg: '#7f1d1d', text: '#fecaca', border: '#dc2626', badge: '#ef4444' },
    high:     { bg: '#78350f', text: '#fcd34d', border: '#f59e0b', badge: '#f59e0b' },
    medium:   { bg: '#1e3a8a', text: '#93c5fd', border: '#3b82f6', badge: '#3b82f6' },
    low:      { bg: '#15803d', text: '#86efac', border: '#22c55e', badge: '#22c55e' },
  },
};

function riskColor(risk: number, isDark: boolean) {
  if (risk >= 0.75) return isDark ? '#ef4444' : '#dc2626';
  if (risk >= 0.5)  return isDark ? '#f59e0b' : '#d97706';
  if (risk >= 0.25) return isDark ? '#3b82f6' : '#2563eb';
  return isDark ? '#22c55e' : '#16a34a';
}

function RiskMeter({ risk, isDark }: { risk: number; isDark: boolean }) {
  const pct = Math.round(risk * 100);
  const color = riskColor(risk, isDark);
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          marginBottom: '4px',
          color: isDark ? '#aaa' : '#666',
        }}
      >
        <span>SLA Breach Risk</span>
        <span style={{ fontWeight: 700, color }}>{pct}%</span>
      </div>
      <div
        style={{
          height: '8px',
          borderRadius: '4px',
          background: isDark ? '#333' : '#e5e7eb',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: '4px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function ImpactRadarWidget() {
  const theme = useTheme();
  const maxHeight = useMaxHeight();
  const isDark = theme === 'dark';

  const { isReady, getToolOutput } = useWidgetSDK();
  const raw = getToolOutput<WidgetData>();
  const data: WidgetData = (isReady && raw) ? raw : DEMO;
  const isDemo = !(isReady && raw);

  const [state, setState] = useWidgetState<{ selectedShipment: string | null }>(() => ({
    selectedShipment: null,
  }));

  const bg       = isDark ? '#0d0d0f' : '#f8fafc';
  const surface  = isDark ? '#17171a' : '#ffffff';
  const border   = isDark ? '#2a2a30' : '#e2e8f0';
  const textPri  = isDark ? '#f1f5f9' : '#0f172a';
  const textSec  = isDark ? '#94a3b8' : '#64748b';
  const textMid  = isDark ? '#cbd5e1' : '#475569';

  const { impact, threat } = data;
  const palette = isDark ? severityColors.dark : severityColors.light;
  const threatPalette = palette[(threat?.severity as keyof typeof palette) ?? 'medium'];

  const selectedShipment = state?.selectedShipment
    ? impact.affectedShipments.find(s => s.shipmentId === state.selectedShipment)
    : null;

  return (
    <div style={{ background: bg, height: maxHeight || '640px', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}`, padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: isDark ? '#3b1f0a' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} style={{ color: isDark ? '#fb923c' : '#ea580c' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: textPri }}>
                Impact Radar
                {isDemo && <span style={{ marginLeft: '8px', padding: '1px 6px', background: isDark ? '#1e3a8a' : '#dbeafe', color: isDark ? '#93c5fd' : '#1e40af', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>DEMO</span>}
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: textSec }}>
                {impact.affectedShipments.length} shipments at risk · Calculated <span suppressHydrationWarning>{new Date(impact.calculatedAt).toLocaleTimeString()}</span>
              </p>
            </div>
          </div>
          {threat && (
            <span style={{ padding: '4px 12px', background: threatPalette.bg, color: threatPalette.text, border: `1px solid ${threatPalette.border}`, borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
              {threat.severity.toUpperCase()}
            </span>
          )}
        </div>
        {threat && (
          <div style={{ padding: '8px 12px', background: threatPalette.bg, border: `1px solid ${threatPalette.border}`, borderRadius: '8px', fontSize: '12px', color: threatPalette.text }}>
            <strong>Trigger:</strong> {threat.title}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '12px', flexShrink: 0 }}>
        {[
          { icon: <DollarSign size={15} />, label: 'Exposure', value: `$${(impact.totalFinancialExposure / 1000).toFixed(0)}k`, sub: 'USD at risk', color: isDark ? '#fb923c' : '#ea580c' },
          { icon: <Clock size={15} />,      label: 'Total Delay', value: `${(impact.totalDelayHours / 24).toFixed(1)}d`, sub: `${Math.round(impact.totalDelayHours)}h`, color: isDark ? '#f59e0b' : '#d97706' },
          { icon: <Users size={15} />,      label: 'Customers', value: impact.customerCount, sub: 'Impacted', color: isDark ? '#60a5fa' : '#2563eb' },
          { icon: <AlertTriangle size={15} />, label: 'Shipments', value: impact.affectedShipments.length, sub: 'At risk', color: isDark ? '#f87171' : '#dc2626' },
        ].map((kpi) => (
          <div key={kpi.label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '10px', textAlign: 'center', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', color: kpi.color, marginBottom: '4px' }}>{kpi.icon}</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '10px', color: textSec, marginTop: '1px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* SLA Risk Meter */}
      <div style={{ padding: '0 12px 12px', flexShrink: 0 }}>
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '12px 14px' }}>
          <RiskMeter risk={impact.slaBreachRisk} isDark={isDark} />
        </div>
      </div>

      {/* Affected Shipments */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 12px 12px' }}>
        <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 600, color: textSec, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Affected Shipments — click to expand
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {impact.affectedShipments.length === 0 ? (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: textSec,
                background: surface,
                borderRadius: '8px',
                border: `1px solid ${border}`,
              }}
            >
              No shipments directly affected
            </div>
          ) : (
            impact.affectedShipments.map((shipment) => {
              const isSelected = state?.selectedShipment === shipment.shipmentId;
              const exposurePct = Math.round((shipment.financialExposure / impact.totalFinancialExposure) * 100);
              const exposureColor = riskColor(shipment.financialExposure / impact.totalFinancialExposure, isDark);
              return (
                <div key={shipment.shipmentId}
                  onClick={() => setState({ selectedShipment: isSelected ? null : shipment.shipmentId })}
                  style={{ background: isSelected ? (isDark ? '#1a2234' : '#eff6ff') : surface, border: `1.5px solid ${isSelected ? (isDark ? '#3b82f6' : '#93c5fd') : border}`, borderRadius: '10px', padding: '12px', cursor: 'pointer', transition: 'all 0.15s', boxShadow: isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                  {/* Row header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <Package size={15} style={{ color: textSec }} />
                      <span style={{ fontWeight: 700, fontSize: '13px', color: textPri }}>{shipment.shipmentId}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', alignItems: 'center' }}>
                      <span style={{ color: exposureColor, fontWeight: 700 }} suppressHydrationWarning>${Math.round(shipment.financialExposure).toLocaleString()}</span>
                      <span style={{ color: textSec }}>+{shipment.delayDays.toFixed(1)}d</span>
                    </div>
                  </div>
                  {/* Exposure bar */}
                  <div style={{ height: '4px', borderRadius: '2px', background: isDark ? '#2a2a30' : '#e2e8f0', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${exposurePct}%`, background: exposureColor, borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: textSec, marginTop: '3px' }}>{exposurePct}% of total exposure</div>
                  {/* Expanded */}
                  {isSelected && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${border}`, fontSize: '12px', color: textMid }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                        <span><strong>Delay:</strong> {shipment.delayHours.toFixed(0)}h ({shipment.delayDays.toFixed(1)}d)</span>
                        <span><strong>Exposure:</strong> <span suppressHydrationWarning>${shipment.financialExposure.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                        <span><strong>SKU count:</strong> {shipment.skusAffected.length}</span>
                        <span><strong>Share:</strong> {exposurePct}% of total</span>
                      </div>
                      <div>
                        <strong style={{ fontSize: '11px' }}>Affected SKUs:</strong>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                          {shipment.skusAffected.map(sku => (
                            <span key={sku} style={{ padding: '2px 8px', background: isDark ? '#1e1e23' : '#f1f5f9', border: `1px solid ${border}`, borderRadius: '4px', fontSize: '10px', color: textMid, fontWeight: 600 }}>{sku}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: surface, borderTop: `1px solid ${border}`, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: '11px', color: textSec }}>NitroStack Supply Chain Intelligence</span>
        <span style={{ fontSize: '11px', color: textSec }}>Impact Analysis</span>
      </div>
    </div>
  );
}
