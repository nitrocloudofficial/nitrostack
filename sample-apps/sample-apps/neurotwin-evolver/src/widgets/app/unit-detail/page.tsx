'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

import { StatusBadge } from '../../components/StatusBadge';
import { MetricBar } from '../../components/MetricBar';

interface FleetUnit {
    id: string; name: string; domain: string; kind: string; status: string;
    batteryPct: number; throughputPct: number; lastMutation?: string; notes?: string;
}

interface Shift {
    id: string; title: string; severity: string; status: string; description: string;
}

interface MutationResult {
    cycleId: string; winner: { label: string; strategy: string; fitness: number }; completedAt: string;
}

interface WidgetData {
    unit: FleetUnit; relatedShifts: Shift[]; history: MutationResult[];
}

export default function UnitDetailWidget() {
    const theme = useTheme();
    const isDark = theme !== 'light';
    const maxHeight = useMaxHeight();
    const { getToolOutput, callTool } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();

    const fg = isDark ? '#e2e8f0' : '#1e293b';
    const muted = isDark ? '#94a3b8' : '#64748b';
    const panelBg = isDark ? '#111318' : '#ffffff';
    const bg = isDark ? '#0a0b0e' : '#f8fafc';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    if (!data) {
        return <div style={{ padding: 40, textAlign: 'center', color: fg, background: bg }}>Loading unit telemetry...</div>;
    }

    const { unit, relatedShifts, history } = data;

    const handleHeal = async () => {
        await callTool('self_heal_unit', { unitId: unit.id });
    };

    return (
        <div style={{ background: bg, color: fg, minHeight: maxHeight || 520, fontFamily: 'system-ui, -apple-system, sans-serif', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>{unit.name}</div>
                        <div style={{ fontSize: 12, color: muted }}>{unit.kind} - {unit.domain}</div>
                    </div>
                    <StatusBadge status={unit.status} />
                </div>
                {unit.notes && <div style={{ fontSize: 13, color: muted, marginTop: 10 }}>{unit.notes}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                    <MetricBar label="Battery" value={unit.batteryPct} color="#22c55e" isDark={isDark} />
                    <MetricBar label="Throughput" value={unit.throughputPct} color="#3b82f6" isDark={isDark} />
                </div>
                {(unit.status === 'degraded' || unit.status === 'offline') && (
                    <button onClick={handleHeal} style={{ marginTop: 14, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 600 }}>
                        Self-heal this unit
                    </button>
                )}
            </div>

            {relatedShifts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Related Environmental Shifts</div>
                    {relatedShifts.map((s) => (
                        <div key={s.id} style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ fontWeight: 600 }}>{s.title}</div>
                                <StatusBadge status={s.status} />
                            </div>
                            <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{s.description}</div>
                        </div>
                    ))}
                </div>
            )}

            {history.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Mutation History</div>
                    {history.map((h) => (
                        <div key={h.cycleId} style={{ background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                                <div style={{ fontWeight: 600 }}>{h.winner.label}: {h.winner.strategy}</div>
                                <div style={{ fontSize: 11, color: muted }}>{new Date(h.completedAt).toLocaleString()}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: '#22c55e' }}>{h.winner.fitness}/100</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
