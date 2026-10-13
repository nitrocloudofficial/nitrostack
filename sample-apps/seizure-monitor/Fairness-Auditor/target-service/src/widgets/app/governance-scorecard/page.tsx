'use client';

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import OrbitalGauge from './OrbitalGauge';

interface ProgressEvent {
  combo: string;
  status: string;
  ts: number;
}

interface GovernanceData {
  scan_run_id: string;
  before_dir: number;
  after_dir: number;
  threshold: number;
  passed: boolean;
  total_findings?: number;
  verified_fixed?: number;
  still_failing?: number;
  policy: {
    redact_fields: string[];
    group_adjustments: Record<string, { threshold_delta: number }>;
    rationale?: string;
  };
}

export default function GovernanceScorecard() {
  const { isReady, getToolOutput } = useWidgetSDK();
  const [log, setLog] = useState<ProgressEvent[]>([]);

  useEffect(() => {
    const source = new EventSource('/agent3-progress');
    source.onmessage = (event) => {
      try {
        const parsed: ProgressEvent = JSON.parse(event.data);
        if (!parsed.combo) return;
        setLog((prev) => [...prev.slice(-19), parsed]);
      } catch {
        // Ignore non-json lines
      }
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, []);

  if (!isReady) {
    return (
      <div className="p-8 font-mono text-[var(--dust,#6b7089)] flex items-center justify-center min-h-[200px]">
        Loading governance report…
      </div>
    );
  }

  const data = (getToolOutput() as GovernanceData | undefined) ?? {
    scan_run_id: 'demo-preview-00000000',
    before_dir: 0.58,
    after_dir: 0.94,
    threshold: 0.8,
    passed: true,
    total_findings: 2,
    verified_fixed: 2,
    still_failing: 0,
    policy: {
      redact_fields: ['zip_code'],
      group_adjustments: { '10044': { threshold_delta: 0.06 } },
      rationale: 'Mitigating geographic bias detected in zip_code 10044.',
    },
  };

  return (
    <div className="bg-[var(--void,#05050a)] min-h-screen p-8 space-y-8 text-[var(--starlight,#e4e4f0)] font-sans">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs text-[var(--dust,#6b7089)] tracking-widest uppercase">
            AFO Governance Report
          </p>
          <h1
            className="font-display text-4xl font-semibold mt-1"
            style={{ color: data.passed ? 'var(--aurora-cyan,#22d3ee)' : 'var(--supernova-red,#fb3b49)' }}
          >
            {data.passed ? 'PASS' : 'FAIL'}
          </h1>
        </div>
        <span className="font-mono text-xs text-[var(--dust,#6b7089)]">{data.scan_run_id.slice(0, 8)}</span>
      </div>

      <div className="bg-[var(--panel,#12142b)] rounded-2xl border border-[var(--panel-border,rgba(139,92,246,0.14))] p-8">
        <OrbitalGauge beforeDir={data.before_dir} afterDir={data.after_dir} threshold={data.threshold} />
        <p className="text-center font-mono text-xs text-[var(--dust,#6b7089)] mt-2">
          {data.before_dir.toFixed(2)} → {data.after_dir.toFixed(2)} · threshold {data.threshold.toFixed(2)}
        </p>
      </div>

      <div className="bg-[var(--panel,#12142b)] rounded-2xl border border-[var(--panel-border,rgba(139,92,246,0.14))] p-6">
        <h2 className="font-display text-lg text-[var(--starlight,#e4e4f0)] mb-3">Applied Policy</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex gap-2">
            <span className="text-[var(--dust,#6b7089)] w-32 shrink-0">redacted</span>
            <span className="text-[var(--nebula-magenta,#d946ef)]">
              {data.policy.redact_fields.join(', ') || 'none'}
            </span>
          </div>
          {Object.entries(data.policy.group_adjustments ?? {}).map(([group, adj]) => (
            <div key={group} className="flex gap-2">
              <span className="text-[var(--dust,#6b7089)] w-32 shrink-0">{group}</span>
              <span className="text-[var(--aurora-cyan,#22d3ee)]">
                threshold {adj.threshold_delta >= 0 ? '+' : ''}{adj.threshold_delta}
              </span>
            </div>
          ))}
          {data.policy.rationale && (
            <div className="flex gap-2 pt-2">
              <span className="text-[var(--dust,#6b7089)] w-32 shrink-0">rationale</span>
              <span className="text-[var(--dust,#6b7089)] text-xs">{data.policy.rationale}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--panel,#12142b)] rounded-2xl border border-[var(--panel-border,rgba(139,92,246,0.14))] p-6">
        <h2 className="font-display text-lg text-[var(--starlight,#e4e4f0)] mb-3">Live Re-Verify Transmission</h2>
        <div className="font-mono text-xs space-y-1 h-40 overflow-y-auto">
          {log.length === 0 && <p className="text-[var(--dust,#6b7089)]">Awaiting signal from Agent 3…</p>}
          {log.map((entry, i) => (
            <p
              key={i}
              style={{
                color:
                  entry.status === 'fixed'
                    ? 'var(--aurora-cyan,#22d3ee)'
                    : entry.status === 'still_failing'
                    ? 'var(--supernova-red,#fb3b49)'
                    : 'var(--starlight,#e4e4f0)',
              }}
            >
              [{entry.ts ? new Date(entry.ts * 1000).toLocaleTimeString() : ''}] {entry.combo} — {entry.status}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
