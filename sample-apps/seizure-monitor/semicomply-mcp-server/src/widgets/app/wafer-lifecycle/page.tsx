'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface LifecycleStep {
    timestamp: string;
    label: string;
    description: string;
    meta: Record<string, string>;
}

interface LifecyclePhase {
    id: string;
    name: string;
    color: string;
    steps: LifecycleStep[];
}

interface ProductInfo {
    productId: string;
    lotId: string;
    datasheetUrl: string;
    operatingVoltage: string;
    maxThermalThreshold: string;
    complianceCertifications: string[];
}

interface RouteStop {
    leg: number;
    origin: string;
    destination: string;
    eccnClassification: string;
    hsCode: string;
    applicableTariffs: string;
    status: string;
    isBlocked: boolean;
}

interface WidgetData {
    batchId: string;
    product: ProductInfo | null;
    phases: LifecyclePhase[];
    route: RouteStop[];
}

function fmtDate(ts: string): string {
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function WaferLifecycleWidget() {
    const theme = useTheme();
    const maxHeight = useMaxHeight();
    const isDark = theme === 'dark';
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const bg = isDark ? '#0c0c0c' : '#fafafa';
    const surface = isDark ? '#141414' : '#ffffff';
    const border = isDark ? '#222' : '#e5e5e5';
    const text = isDark ? '#e5e5e5' : '#171717';
    const muted = isDark ? '#737373' : '#a3a3a3';
    const lineColor = isDark ? '#2a2a2a' : '#d4d4d4';

    if (!data) {
        return (
            <div style={{ padding: '60px 40px', textAlign: 'center', color: muted, fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' }}>
                {isReady ? 'No data available' : 'Connecting...'}
            </div>
        );
    }

    const hasRoute = data.route.length > 0;

    return (
        <div style={{
            background: bg,
            minHeight: '100vh',
            maxHeight: maxHeight || '100vh',
            overflow: 'auto',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            color: text,
            lineHeight: 1.5,
        }}>
            {/* Header */}
            <div style={{ padding: '32px 40px 0' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: '4px' }}>
                    Lot {data.batchId}
                </div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '700', letterSpacing: '-0.02em', color: text }}>
                    {data.product?.productId || data.batchId}
                </h1>
                {data.product && (
                    <div style={{ fontSize: '13px', color: muted, marginTop: '4px' }}>
                        {data.product.operatingVoltage} · {data.product.maxThermalThreshold} max · {data.product.complianceCertifications.join(' · ')}
                    </div>
                )}
            </div>

            {/* Timeline */}
            <div style={{ padding: '28px 40px 40px' }}>
                {data.phases.map((phase, phaseIdx) => (
                    <div key={phase.id} style={{ marginBottom: phaseIdx < data.phases.length - 1 ? '32px' : '0' }}>
                        {/* Phase header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: phase.color, flexShrink: 0 }} />
                            <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: phase.color }}>
                                {phase.name}
                            </div>
                            <div style={{ flex: 1, height: '1px', background: lineColor }} />
                            <div style={{ fontSize: '11px', color: muted }}>
                                {phase.steps.length} step{phase.steps.length !== 1 ? 's' : ''}
                            </div>
                        </div>

                        {/* Steps */}
                        <div style={{ marginLeft: '3px', paddingLeft: '20px', borderLeft: `1.5px solid ${lineColor}` }}>
                            {phase.steps.map((step, stepIdx) => (
                                <div key={stepIdx} style={{ position: 'relative', marginBottom: stepIdx < phase.steps.length - 1 ? '20px' : '0' }}>
                                    {/* Dot */}
                                    <div style={{
                                        position: 'absolute',
                                        left: '-25.5px',
                                        top: '6px',
                                        width: '9px',
                                        height: '9px',
                                        borderRadius: '50%',
                                        background: surface,
                                        border: `2px solid ${phase.color}`,
                                    }} />

                                    {/* Date */}
                                    <div style={{ fontSize: '11px', color: muted, marginBottom: '2px', fontVariantNumeric: 'tabular-nums' }}>
                                        {fmtDate(step.timestamp)}
                                    </div>

                                    {/* Label */}
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: text, marginBottom: '2px' }}>
                                        {step.label}
                                    </div>

                                    {/* Description */}
                                    {step.description && (
                                        <div style={{ fontSize: '13px', color: muted, marginBottom: '6px' }}>
                                            {step.description}
                                        </div>
                                    )}

                                    {/* Meta */}
                                    {Object.keys(step.meta).length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {Object.entries(step.meta).map(([k, v]) => (
                                                <div key={k} style={{
                                                    fontSize: '11px',
                                                    color: muted,
                                                    background: isDark ? '#1a1a1a' : '#f5f5f5',
                                                    border: `1px solid ${border}`,
                                                    borderRadius: '4px',
                                                    padding: '2px 8px',
                                                }}>
                                                    <span style={{ fontWeight: '500', color: text }}>{k}</span>
                                                    {v && <span>: {v.length > 80 ? v.substring(0, 80) + '...' : v}</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Shipping Route */}
                {hasRoute && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                            <div style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#3b82f6' }}>
                                Shipping Route
                            </div>
                            <div style={{ flex: 1, height: '1px', background: lineColor }} />
                        </div>

                        <div style={{ marginLeft: '3px', paddingLeft: '20px', borderLeft: `1.5px solid ${lineColor}` }}>
                            {data.route.map((stop, idx) => (
                                <div key={idx} style={{ position: 'relative', marginBottom: idx < data.route.length - 1 ? '20px' : '0' }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: '-25.5px',
                                        top: '6px',
                                        width: '9px',
                                        height: '9px',
                                        borderRadius: '50%',
                                        background: stop.isBlocked ? '#ef4444' : '#3b82f6',
                                        border: `2px solid ${surface}`,
                                    }} />

                                    <div style={{ fontSize: '14px', fontWeight: '600', color: text, marginBottom: '2px' }}>
                                        {stop.origin}
                                        <span style={{ margin: '0 6px', color: stop.isBlocked ? '#ef4444' : '#3b82f6', fontWeight: '400' }}>
                                            {stop.isBlocked ? '—' : '→'}
                                        </span>
                                        {stop.destination}
                                    </div>

                                    <div style={{
                                        display: 'inline-block',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: stop.isBlocked ? '#ef4444' : '#10b981',
                                        background: stop.isBlocked ? '#fef2f2' : '#f0fdf4',
                                        border: `1px solid ${stop.isBlocked ? '#fecaca' : '#bbf7d0'}`,
                                        borderRadius: '3px',
                                        padding: '1px 6px',
                                        marginBottom: '6px',
                                    }}>
                                        {stop.status}
                                    </div>

                                    <div style={{ fontSize: '12px', color: muted, display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                        <span>ECCN: {stop.eccnClassification}</span>
                                        <span>HS: {stop.hsCode}</span>
                                        {stop.applicableTariffs && <span>Tariffs: {stop.applicableTariffs}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
