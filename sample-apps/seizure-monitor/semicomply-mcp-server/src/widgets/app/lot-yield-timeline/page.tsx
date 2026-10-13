'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface FailingBin {
    binCode: string;
    count: number;
    impact: string;
}

interface Telemetry {
    stationId: string;
    recipeName: string;
    chamberPressure: string;
    temperature: string;
    operatorId: string;
    hasExcursion: boolean;
}

interface ShipmentRisk {
    shipmentId: string;
    risk: boolean;
    reason: string;
}

interface WidgetData {
    lotId: string;
    overallYield: string;
    totalWafersTested: number;
    failingBins: FailingBin[];
    telemetry: Telemetry | null;
    likelyRootCause: string;
    designImplicated: boolean;
    designNote: string;
    shipmentRisk?: ShipmentRisk;
}

function parseYield(yieldStr: string): number {
    const match = yieldStr.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
}

function getBarColor(yieldPct: number, hasExcursion: boolean): string {
    if (hasExcursion) return '#ef4444';
    if (yieldPct < 80) return '#f97316';
    if (yieldPct < 95) return '#eab308';
    return '#22c55e';
}

function getShipmentBadge(risk: boolean): { label: string; bg: string; fg: string } {
    if (risk) return { label: 'AT RISK', bg: '#fef2f2', fg: '#dc2626' };
    return { label: 'CLEAR', bg: '#f0fdf4', fg: '#16a34a' };
}

export default function LotYieldTimelineWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    if (!data) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: isDark ? '#fff' : '#000' }}>
                Loading analysis... {isReady ? '(SDK ready)' : '(waiting for SDK)'}
            </div>
        );
    }

    const bg = isDark ? '#0a0a0a' : '#f8fafc';
    const cardBg = isDark ? '#1a1a1a' : '#ffffff';
    const border = isDark ? '#333' : '#e2e8f0';
    const textPri = isDark ? '#f1f5f9' : '#0f172a';
    const textSec = isDark ? '#94a3b8' : '#64748b';

    const yieldPct = parseYield(data.overallYield);
    const barColor = getBarColor(yieldPct, data.telemetry?.hasExcursion ?? false);
    const maxBinCount = Math.max(...data.failingBins.map((b) => b.count), 1);
    const badge = data.shipmentRisk ? getShipmentBadge(data.shipmentRisk.risk) : null;

    return (
        <div style={{ background: bg, minHeight: '100vh', maxHeight: maxHeight || '100vh', overflow: 'auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* Header */}
            <div style={{ background: cardBg, borderBottom: `1px solid ${border}`, padding: '20px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: textPri, letterSpacing: '-0.02em' }}>
                            Yield Root Cause Analysis
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: textSec }}>
                            Lot {data.lotId} · {data.totalWafersTested} wafers tested
                        </p>
                    </div>
                    {badge && (
                        <div style={{ padding: '4px 12px', borderRadius: '6px', background: badge.bg, color: badge.fg, fontSize: '11px', fontWeight: '700', letterSpacing: '0.05em' }}>
                            {badge.label}
                        </div>
                    )}
                </div>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Yield Bar */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: textPri }}>Overall Yield</span>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: barColor }}>{data.overallYield}</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: isDark ? '#262626' : '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${yieldPct}%`, height: '100%', background: barColor, borderRadius: '5px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: textSec }}>0%</span>
                        <span style={{ fontSize: '11px', color: textSec }}>100%</span>
                    </div>
                </div>

                {/* Failing Bins Bar Chart */}
                {data.failingBins.length > 0 && (
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: textPri, marginBottom: '14px' }}>Failing Bins</div>
                        {data.failingBins.map((bin) => {
                            const pct = (bin.count / maxBinCount) * 100;
                            const isLeakage = bin.binCode.includes('LEAKAGE');
                            const isTiming = bin.binCode.includes('TIMING');
                            const barBg = isLeakage ? '#ef4444' : isTiming ? '#f97316' : '#eab308';
                            return (
                                <div key={bin.binCode} style={{ marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '500', color: textPri }}>{bin.binCode}</span>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: barBg }}>{bin.count}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: isDark ? '#262626' : '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: barBg, borderRadius: '3px', transition: 'width 0.6s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '11px', color: textSec, marginTop: '2px' }}>{bin.impact}</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Telemetry */}
                {data.telemetry && (
                    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: textPri }}>MES Telemetry</span>
                            {data.telemetry.hasExcursion && (
                                <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fef2f2', color: '#dc2626', fontSize: '10px', fontWeight: '700' }}>
                                    EXCURSION
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {[
                                ['Station', data.telemetry.stationId],
                                ['Recipe', data.telemetry.recipeName],
                                ['Pressure', data.telemetry.chamberPressure],
                                ['Temperature', data.telemetry.temperature],
                                ['Operator', data.telemetry.operatorId],
                            ].map(([label, value]) => (
                                <div key={label} style={{ padding: '8px 10px', background: isDark ? '#111' : '#f8fafc', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '10px', color: textSec, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '500', color: textPri }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Root Cause */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: textPri, marginBottom: '8px' }}>Likely Root Cause</div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: textSec }}>{data.likelyRootCause}</p>
                </div>

                {/* Design */}
                <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: '12px', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: textPri }}>Design Assessment</span>
                        <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                            background: data.designImplicated ? '#fef2f2' : '#f0fdf4',
                            color: data.designImplicated ? '#dc2626' : '#16a34a',
                        }}>
                            {data.designImplicated ? 'IMPLICATED' : 'CLEARED'}
                        </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: textSec }}>{data.designNote}</p>
                </div>

                {/* Shipment Risk */}
                {data.shipmentRisk && (
                    <div style={{
                        background: cardBg,
                        border: `1px solid ${data.shipmentRisk.risk ? '#fecaca' : '#bbf7d0'}`,
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: textPri }}>Shipment {data.shipmentRisk.shipmentId}</span>
                            <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700',
                                background: data.shipmentRisk.risk ? '#fef2f2' : '#f0fdf4',
                                color: data.shipmentRisk.risk ? '#dc2626' : '#16a34a',
                            }}>
                                {data.shipmentRisk.risk ? 'AT RISK' : 'CLEAR'}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.6', color: textSec }}>{data.shipmentRisk.reason}</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', textAlign: 'center', fontSize: '11px', color: isDark ? '#555' : '#94a3b8', borderTop: `1px solid ${border}` }}>
                Semiconductor Lifecycle MCP · NitroStack
            </div>
        </div>
    );
}
