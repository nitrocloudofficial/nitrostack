'use client';

export const dynamic = 'force-dynamic';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Landmark, MapPin, CheckCircle2, XCircle } from 'lucide-react';
import { palette, Panel, Badge, SectionTitle, Loading } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import type { BankBranch } from '../../lib/types';

export default function BankDetailsWidget() {
    const theme = useTheme();
    const isDark = theme === 'dark';
    const p = palette(isDark);
    const { isReady, getToolOutput } = useWidgetSDK();
    const data = getToolOutput<BankBranch>();

    if (!data || !data.supports) return <Loading isDark={isDark} label={isReady ? 'Waiting for bank data…' : 'Loading…'} />;

    const rails: Array<[string, boolean]> = [
        ['NEFT', data.supports.neft],
        ['RTGS', data.supports.rtgs],
        ['IMPS', data.supports.imps],
        ['UPI', data.supports.upi],
    ];

    return (
        <div style={{ background: p.bg, color: p.text, padding: 16, minHeight: 260 }}>
            {/* Header */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: p.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Landmark size={22} color={p.accent} />
                </div>
                <div style={{ minWidth: 0 }}>
                    <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{data.bank}</h1>
                    <div style={{ fontSize: 12, color: p.textMuted }}>{data.branch}</div>
                </div>
            </div>

            {/* IFSC verified banner */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: p.goodSoft, border: `1px solid ${p.good}`, borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
                <CheckCircle2 size={18} color={p.good} />
                <span style={{ fontSize: 13 }}>IFSC verified · <strong style={{ letterSpacing: 1 }}>{data.ifsc}</strong></span>
            </div>

            {/* Address */}
            <Panel p={p} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                    <MapPin size={18} color={p.textMuted} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {data.address}
                        <div style={{ color: p.textMuted, marginTop: 4 }}>
                            {[data.city, data.district, data.state].filter(Boolean).join(', ')}
                        </div>
                    </div>
                </div>
            </Panel>

            {/* Payment rails */}
            <SectionTitle p={p}>Supported payment rails</SectionTitle>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {rails.map(([name, ok]) => (
                    <Badge
                        key={name}
                        color={ok ? p.good : p.textMuted}
                        bg={ok ? p.goodSoft : p.surfaceAlt}
                    >
                        {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {name}
                    </Badge>
                ))}
            </div>

            {/* Codes */}
            <Panel p={p}>
                <Row p={p} label="MICR" value={data.micr || '—'} />
                <Row p={p} label="SWIFT" value={data.swift || '—'} />
                {data.contact && <Row p={p} label="Contact" value={data.contact} />}
            </Panel>

            <div style={{ fontSize: 11, color: p.textMuted, textAlign: 'center', marginTop: 12 }}>
                Verified live via {data.source ?? 'Razorpay IFSC'}
                {data.fetchedAt ? ` · ${formatDateTime(data.fetchedAt)}` : ''}
            </div>
        </div>
    );
}

function Row({ p, label, value }: { p: ReturnType<typeof palette>; label: string; value: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0' }}>
            <span style={{ color: p.textMuted }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{value}</span>
        </div>
    );
}
