'use client';

import React from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';

interface ComboResult {
  combo_key: string;
  dir_value: number;
  p_value: number;
  fdr_adjusted_p: number;
  status: 'open' | 'patched' | 'verified_fixed' | 'still_failing';
}

function severityColor(dir: number): string {
  if (dir >= 0.8) return 'var(--aurora-cyan, #22d3ee)';
  if (dir >= 0.6) return 'var(--nebula-magenta, #d946ef)';
  return 'var(--supernova-red, #fb3b49)';
}

export default function BiasHeatmap() {
  const { isReady, getToolOutput } = useWidgetSDK();

  if (!isReady) {
    return (
      <div className="min-h-[200px] flex items-center justify-center bg-[var(--void,#05050a)]">
        <span className="font-mono text-sm text-[var(--dust,#6b7089)] animate-pulse">
          SCANNING FIELD COMBINATIONS…
        </span>
      </div>
    );
  }

  const data = (getToolOutput() as { scan_run_id?: string; findings?: ComboResult[] } | undefined) ?? {
    scan_run_id: 'demo-preview-00000000',
    findings: [
      { combo_key: 'zip_code', dir_value: 0.33, p_value: 0.0042, fdr_adjusted_p: 0.0084, status: 'open' },
      { combo_key: 'applicant_name', dir_value: 0.61, p_value: 0.0210, fdr_adjusted_p: 0.0420, status: 'patched' },
      { combo_key: 'applicant_name+zip_code', dir_value: 0.28, p_value: 0.0010, fdr_adjusted_p: 0.0030, status: 'verified_fixed' },
    ],
  };

  const findings = data.findings ?? [];

  return (
    <div className="bg-[var(--void,#05050a)] p-6 rounded-xl border border-[var(--panel-border,rgba(139,92,246,0.14))] text-[var(--starlight,#e4e4f0)]">
      <h2 className="font-display text-xl text-[var(--starlight,#e4e4f0)] mb-1">Bias Sweep — Field Combinations</h2>
      <p className="font-mono text-xs text-[var(--dust,#6b7089)] mb-5">
        {findings.length} combination{findings.length === 1 ? '' : 's'} flagged · scan {data.scan_run_id?.slice(0, 8)}
      </p>

      {findings.length === 0 ? (
        <div className="font-mono text-sm text-[var(--dust,#6b7089)] py-8 text-center border border-dashed border-[var(--panel-border,rgba(139,92,246,0.14))] rounded-lg">
          No combinations crossed both gates on this run — clean sweep.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {findings.map((f) => (
            <div
              key={f.combo_key}
              className="rounded-lg p-4 border"
              style={{
                borderColor: severityColor(f.dir_value),
                boxShadow: `0 0 16px -4px ${severityColor(f.dir_value)}`,
                background: 'var(--panel, #12142b)',
              }}
            >
              <div className="font-mono text-xs text-[var(--dust,#6b7089)] truncate" title={f.combo_key}>
                {f.combo_key}
              </div>
              <div className="font-display text-2xl mt-1" style={{ color: severityColor(f.dir_value) }}>
                {f.dir_value.toFixed(2)}
              </div>
              <div className="flex items-center justify-between mt-2 font-mono text-[10px] text-[var(--dust,#6b7089)]">
                <span>p={f.p_value < 0.001 ? '< 0.001' : f.p_value.toFixed(3)}</span>
                <span className="uppercase tracking-wide px-1.5 py-0.5 rounded border border-current">
                  {f.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
