'use client';

import { useTheme, useMaxHeight, useWidgetSDK } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';

interface FleetUnit {
    id: string;
    name: string;
    domain: 'logistics' | 'manufacturing' | 'energy' | 'safety';
    kind: string;
    status: 'nominal' | 'degraded' | 'healing' | 'offline';
    coords: [number, number];
    batteryPct: number;
    throughputPct: number;
    notes?: string;
}

interface EnvironmentalShift {
    id: string;
    title: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affectedUnitIds: string[];
    description: string;
    status: 'detected' | 'mutating' | 'resolved';
}

interface Snapshot {
    totalUnits: number;
    degradedCount: number;
    healthyCount: number;
    activeShifts: number;
    byDomain: Record<string, { units: number; avgThroughput: number; avgBattery: number }>;
}

interface WidgetData {
    units?: FleetUnit[];
    shifts?: EnvironmentalShift[];
    snapshot?: Snapshot;
}

const DOMAIN_ICON: Record<string, string> = {
    logistics: 'UAV', manufacturing: 'MFG', energy: 'PWR', safety: 'SAFE',
};

const STATUS_COLOR: Record<string, string> = {
    nominal: '#22c55e', degraded: '#eab308', healing: '#3b82f6', offline: '#ef4444',
};

export default function FleetTwinWidget() {
    const theme = useTheme();
    const isDark = theme !== 'light';
    const maxHeight = useMaxHeight();
    const { getToolOutput, callTool } = useWidgetSDK();
    const data = getToolOutput<WidgetData>();
    const [selected, setSelected] = useState<FleetUnit | null>(null);
    const [runningCycle, setRunningCycle] = useState<string | null>(null);

    const fg = isDark ? '#e2e8f0' : '#1e293b';
    const muted = isDark ? '#94a3b8' : '#64748b';
    const panelBg = isDark ? '#111318' : '#ffffff';
    const bg = isDark ? '#0a0b0e' : '#f8fafc';
    const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    if (!data) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: fg, background: bg }}>
                Connecting to the NeuroTwin...
            </div>
        );
    }

    const units = data.units || [];
    const shifts = data.shifts;
    const snapshot = data.snapshot;

    const handleUnitClick = async (unitId: string) => {
        const unit = units.find((u) => u.id === unitId) || null;
        setSelected(unit);
        await callTool('get_unit_detail', { unitId });
    };

    const handleRunCycle = async (shiftId: string) => {
        setRunningCycle(shiftId);
        try {
            await callTool('run_mutation_cycle', { shiftId, variantCount: 4 });
        } finally {
            setRunningCycle(null);
        }
    };

    return (
        <div style={{
            background: bg, color: fg, minHeight: maxHeight || 600,
            fontFamily: 'system-ui, -apple-system, sans-serif', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 14,
        }}>
            {snapshot && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                        { label: 'Fleet Units', value: snapshot.totalUnits, color: '#3b82f6' },
                        { label: 'Nominal', value: snapshot.healthyCount, color: '#22c55e' },
                        { label: 'Degraded/Healing', value: snapshot.degradedCount, color: '#eab308' },
                        { label: 'Active Shifts', value: snapshot.activeShifts, color: '#ef4444' },
                    ].map((kpi) => (
                        <div key={kpi.label} style={{
                            flex: '1 1 120px', background: panelBg, border: `1px solid ${border}`,
                            borderRadius: 10, padding: '10px 14px',
                        }}>
                            <div style={{ fontSize: 11, color: muted, marginBottom: 2 }}>{kpi.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{
                position: 'relative', background: panelBg, border: `1px solid ${border}`,
                borderRadius: 12, height: 320, overflow: 'hidden',
                backgroundImage: isDark
                    ? 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)'
                    : 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
                backgroundSize: '10% 12.5%',
            }}>
                <div style={{
                    position: 'absolute', top: 10, left: 12, fontSize: 11, color: muted,
                    letterSpacing: 0.5, textTransform: 'uppercase',
                }}>
                    NeuroTwin - Live Digital Twin
                </div>
                {units.map((unit) => (
                    <div
                        key={unit.id}
                        onClick={() => handleUnitClick(unit.id)}
                        title={unit.name}
                        style={{
                            position: 'absolute',
                            left: `${unit.coords[0]}%`,
                            top: `${unit.coords[1]}%`,
                            transform: 'translate(-50%, -50%)',
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: STATUS_COLOR[unit.status] + '22',
                            border: `2px solid ${STATUS_COLOR[unit.status]}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700, color: STATUS_COLOR[unit.status],
                            boxShadow: selected?.id === unit.id ? `0 0 0 4px ${STATUS_COLOR[unit.status]}33` : 'none',
                        }}>
                            {DOMAIN_ICON[unit.domain] || '*'}
                        </div>
                        <div style={{
                            marginTop: 3, fontSize: 10, color: muted, maxWidth: 70,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {unit.name.split(' "')[0]}
                        </div>
                    </div>
                ))}
            </div>

            {selected && (
                <div style={{
                    background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                }}>
                    <div>
                        <div style={{ fontWeight: 600 }}>{selected.name}</div>
                        <div style={{ fontSize: 12, color: muted }}>
                            {selected.kind} - {selected.domain} - battery {selected.batteryPct}% - throughput {selected.throughputPct}%
                        </div>
                    </div>
                    <StatusBadge status={selected.status} />
                </div>
            )}

            {shifts && shifts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 12, color: muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Environmental Shifts
                    </div>
                    {shifts.map((shift) => (
                        <div key={shift.id} style={{
                            background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: 12,
                            display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                <div style={{ fontWeight: 600 }}>{shift.title}</div>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <StatusBadge status={shift.severity} />
                                    <StatusBadge status={shift.status} />
                                </div>
                            </div>
                            <div style={{ fontSize: 13, color: muted }}>{shift.description}</div>
                            {shift.status !== 'resolved' && (
                                <button
                                    onClick={() => handleRunCycle(shift.id)}
                                    disabled={runningCycle === shift.id}
                                    style={{
                                        alignSelf: 'flex-start', marginTop: 2, padding: '6px 14px',
                                        borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: '#3b82f6', color: 'white', fontSize: 13, fontWeight: 600,
                                        opacity: runningCycle === shift.id ? 0.6 : 1,
                                    }}
                                >
                                    {runningCycle === shift.id ? 'Evolving logic...' : 'Run mutation cycle'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
