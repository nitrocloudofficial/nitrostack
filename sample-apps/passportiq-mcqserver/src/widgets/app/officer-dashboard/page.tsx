'use client';

/**
 * MCP widget for `run_verification_pipeline` / `get_pipeline_progress`.
 *
 * The host hands us one tool result as `data`. Outside a tool call `data` is `{}`,
 * so we fall back to the sample payload — a widget that renders a blank rectangle
 * in an inspector preview is a widget nobody trusts.
 */
import React from 'react';
import { useTheme } from '../../lib/theme.js';
import { asArray } from '../../lib/format.js';
import { pick, withFallback } from '../../lib/sdk.js';
import { OFFICER, SAMPLE_APPLICANT, SAMPLE_PIPELINE, SAMPLE_RISK } from '../../lib/sample-data.js';
import { AppShell, Card, Content, DemoBanner, MainColumn, TopBar } from '../../components/chrome.jsx';
import { ApplicantPanel, RiskSummary, StageTimeline } from '../../components/panels.jsx';
import { PipelineTimeline, RiskPanel, StatsCard } from '../../components/teamwork.jsx';
import { IconAlert, IconCheck, IconClock, IconShield } from '../../components/icons.jsx';
import { hasHostData } from '../../lib/sdk.js';

interface StageEntry {
  stage: string;
  status?: string;
  durationMs?: number;
  detail?: string;
  completedAt?: string;
}

export default function OfficerDashboard({ data }: { data?: unknown }) {
  useTheme();

  const live = hasHostData(data);
  const payload = withFallback(data, SAMPLE_PIPELINE as unknown as Record<string, unknown>);

  const applicant = pick<Record<string, unknown>>(payload, 'applicant', SAMPLE_APPLICANT as never);
  const stages = asArray<StageEntry>(payload.stages);
  const missing = asArray<string>(payload.missingStages);
  const score = pick<number | null>(payload, 'riskScore', pick<number | null>(payload, 'risk.score', SAMPLE_RISK.score));
  const recommendation = pick<string | null>(payload, 'recommendation', 'manual_review');
  const complete = stages.length > 0 && missing.length === 0;

  const done = stages.filter((s) => (s.status ?? 'completed') === 'completed').length;

  return (
    <AppShell>
      <MainColumn>
        <TopBar
          crumbs={['PassportIQ', 'Verification pipeline', String(applicant.applicationId ?? '—')]}
          live={{ label: complete ? 'pipeline complete' : 'in progress', tone: complete ? 'live' : 'idle' }}
          officer={{ name: OFFICER.name, role: OFFICER.role }}
        />
        <Content>
          {!live ? <DemoBanner>Sample payload — open this widget from a tool call for live data.</DemoBanner> : null}

          <div className="piq-grid-4" style={{ marginBottom: 16 }}>
            <StatsCard
              title="Stages run"
              value={`${done}/${stages.length + missing.length}`}
              description="Verification stages executed for this application."
              icon={<IconCheck size={16} />}
              tone={complete ? 'success' : 'blue'}
            />
            <StatsCard
              title="Risk score"
              value={score ?? '—'}
              description="Advisory score from the cited-rules engine."
              icon={<IconAlert size={16} />}
              tone={typeof score === 'number' && score >= 70 ? 'danger' : 'warning'}
            />
            <StatsCard
              title="Documents"
              value={String(applicant.documentCount ?? '—')}
              description="Documents submitted with this application."
              icon={<IconShield size={16} />}
            />
            <StatsCard
              title="Outstanding"
              value={missing.length}
              description="Stages still required before a decision may be recorded."
              icon={<IconClock size={16} />}
              tone={missing.length === 0 ? 'success' : 'warning'}
            />
          </div>

          <div className="piq-split">
            <div className="piq-split-main" style={{ display: 'grid', gap: 16 }}>
              <ApplicantPanel
                detail={{
                  applicationId: String(applicant.applicationId ?? ''),
                  applicantName: applicant.applicantName ? String(applicant.applicantName) : undefined,
                  applicationType: applicant.applicationType ? String(applicant.applicationType) : undefined,
                  dateOfBirth: applicant.dateOfBirth ? String(applicant.dateOfBirth) : undefined,
                  passportNumber: applicant.passportNumber ? String(applicant.passportNumber) : undefined,
                  phone: (applicant.phone as string | null) ?? null,
                  email: (applicant.email as string | null) ?? null,
                  address: applicant.address ? String(applicant.address) : undefined,
                  submittedAt: applicant.submittedAt ? String(applicant.submittedAt) : undefined,
                  status: applicant.status ? String(applicant.status) : undefined,
                  riskScore: score,
                }}
              />

              <PipelineTimeline
                steps={[
                  ...stages.map((s) => ({
                    id: `${s.stage}-${s.detail ?? ''}`,
                    title: s.stage.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    description: s.detail ?? 'Completed and written to the audit trail.',
                    status: 'complete' as const,
                    timestamp: s.completedAt,
                  })),
                  ...missing.map((stage, i) => ({
                    id: stage,
                    title: stage.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                    description: 'Not yet run for this application.',
                    status: (i === 0 ? 'active' : 'pending') as 'active' | 'pending',
                  })),
                ]}
              />
            </div>

            <div className="piq-split-side" style={{ display: 'grid', gap: 16 }}>
              <RiskPanel score={score ?? 0} confidence={Math.round((SAMPLE_RISK.confidence ?? 0.9) * 100)} />

              <Card title="Why this score" eyebrow="Cited rules">
                <RiskSummary
                  score={score}
                  recommendation={recommendation}
                  narrative={pick<string | null>(payload, 'explanation', SAMPLE_RISK.explanation)}
                  flags={asArray(payload.findings ?? payload.rules)}
                />
              </Card>

              <Card title="Stage detail" eyebrow="Pipeline state">
                <StageTimeline
                  stages={[
                    ...stages.map((s) => ({ stage: s.stage, completed: true, required: true, at: s.completedAt ?? null, detail: s.detail })),
                    ...missing.map((s) => ({ stage: s, completed: false, required: true, at: null })),
                  ]}
                />
              </Card>
            </div>
          </div>
        </Content>
      </MainColumn>
    </AppShell>
  );
}
