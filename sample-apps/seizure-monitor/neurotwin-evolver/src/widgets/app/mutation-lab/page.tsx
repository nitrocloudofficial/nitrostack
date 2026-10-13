'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

import { StatusBadge } from '../../components/StatusBadge';
import { MetricBar } from '../../components/MetricBar';

interface AlgorithmVariant {
    id: string; label: string; strategy: string; fitness: number;
    energyDelta: number; safetyMargin: number; latencyMs: number; deployed: boolean;
}

interface Shift {
    id: string; title: string; severity: string; status: string; description: string;
}

interface WidgetData {
    cycleId: string; shiftId: string; variants: AlgorithmVariant[];
    winner: AlgorithmVariant; completedAt: string; shift?: Shift;
}

export default function MutationLabWidget() {
    const theme = useTheme();
    const isDark = theme !== 'light';
    const maxHeight = useMaxHeight();
    const { getToolOutput } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const fg = isDark ? '#e2e8f0' : '#1e293b';
    const muted = isDark ? '#94a3b8' : '#64748b';
    const panelBg = isDark ? '#111318' : '#ffffff';
    const bg = isDark ? '#0a0b0e' : '#f8fafc';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    if (!data) {
        return <div style={{ padding: 40, textAlign: 'center', color: fg, background: bg }}>Spinning up the mutation lab...</div>;
    }

    const { variants, winner, shift } = data;
    const maxFitness = Math.max(...variants.map((v) => v.fitness), 1);

    return (
        <div style={{ background: bg, color: fg, minHeight: maxHeight || 560, fontFamily: 'system-ui, -apple-system, sans-serif', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {shift && (
                <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700 }}>{shift.title}</div>
                        <StatusBadge status={shift.status} />
                    </div>
                    <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{shift.description}</div>
                </div>
            )}

            <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(168,85,247,0.12))', border: `1px solid ${border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Deployed Winner</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{winner.label}: {winner.strategy}</div>
                <div style={{ display: 'flex', gap: 18, marginTop: 10, flexWrap: 'wrap' }}>
                    <div><div style={{ fontSize: 11, color: muted }}>Fitness</div><div style={{ fontSize: 20, fontWeight: 700, color: '#22c55e' }}>{winner.fitness}/100</div></div>
                    <div><div style={{ fontSize: 11, color: muted }}>Energy Delta</div><div style={{ fontSize: 20, fontWeight: 700 }}>{winner.energyDelta > 0 ? '+' : ''}{winner.energyDelta}%</div></div>
                    <div><div style={{ fontSize: 11, color: muted }}>Safety Margin</div><div style={{ fontSize: 20, fontWeight: 700 }}>{winner.safetyMargin}%</div></div>
                    <div><div style={{ fontSize: 11, color: muted }}>Latency</div><div style={{ fontSize: 20, fontWeight: 700 }}>{winner.latencyMs}ms</div></div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>All Candidate Variants (Digital Twin Simulation)</div>
                {variants.map((v) => (
                    <div key={v.id} style={{ background: panelBg, border: v.deployed ? '1px solid #22c55e' : `1px solid ${border}`, borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ fontWeight: 600 }}>{v.label}: {v.strategy}</div>
                            {v.deployed && <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>DEPLOYED</span>}
                        </div>
                        <MetricBar label="Fitness" value={v.fitness} max={maxFitness} color="#3b82f6" isDark={isDark} suffix="" />
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: muted }}>
                            <span>Energy Delta: {v.energyDelta > 0 ? '+' : ''}{v.energyDelta}%</span>
                            <span>Safety: {v.safetyMargin}%</span>
                            <span>Latency: {v.latencyMs}ms</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
