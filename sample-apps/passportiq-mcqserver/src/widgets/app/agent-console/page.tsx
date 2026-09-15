'use client';

/** MCP widget for `agent_investigate` / `agent_triage_queue` / `get_agent_trace`. */
import React from 'react';
import { COLORS, useTheme } from '../../lib/theme.js';
import { asArray } from '../../lib/format.js';
import { hasHostData, pick, withFallback } from '../../lib/sdk.js';
import { OFFICER, SAMPLE_AGENT_RUN, SAMPLE_TRIAGE } from '../../lib/sample-data.js';
import { AppShell, Content, DemoBanner, MainColumn, TopBar } from '../../components/chrome.jsx';
import { AgentTrace, EscalationBanner, TriageQueue, type AgentStepView } from '../../components/agent.jsx';
import { StatsCard } from '../../components/teamwork.jsx';
import { IconAgent, IconAlert, IconBolt, IconLink } from '../../components/icons.jsx';

interface RawStep {
  stepNumber?: number;
  action?: string;
  rationale?: string;
  summary?: string;
  outcome?: string;
  durationMs?: number;
  confidence?: number;
  actionInput?: unknown;
  at?: string;
}

/**
 * The agent service emits `{stepNumber, action, rationale, summary, outcome}`.
 * `AgentTrace` speaks `{index, phase, tool, thought, observation}`. Mapping here
 * rather than in the component keeps the component reusable by the console, which
 * receives the same shape over REST.
 */
function toStepViews(raw: RawStep[]): AgentStepView[] {
  return raw.map((s, i) => ({
    index: s.stepNumber ?? i + 1,
    phase: s.outcome === 'failed' ? 'act' : 'act',
    tool: s.action,
    thought: s.rationale,
    action: s.summary,
    observation: s.actionInput,
    confidence: s.confidence,
    durationMs: s.durationMs,
    at: s.at,
    ok: s.outcome !== 'failed',
  }));
}

export default function AgentConsole({ data }: { data?: unknown }) {
  useTheme();

  const live = hasHostData(data);
  const host = (data ?? {}) as Record<string, unknown>;

  // The bundle serves three tools. `queue` present => triage result; otherwise a
  // single investigation run.
  const isTriage = Array.isArray(host.queue);

  if (isTriage) {
    const payload = withFallback(data, SAMPLE_TRIAGE as unknown as Record<string, unknown>);
    const rows = asArray<Record<string, unknown>>(payload.queue);
    const escalatedIds = rows
      .filter((r) => r.recommendation === 'escalate' || r.requiresSeniorReview === true)
      .map((r) => String(r.applicationId ?? ''))
      .filter(Boolean);

    return (
      <AppShell>
        <MainColumn>
          <TopBar
            crumbs={['PassportIQ', 'Agent triage']}
            live={{ label: `${rows.length} triaged`, tone: 'machine' }}
            officer={{ name: OFFICER.name, role: OFFICER.role }}
          />
          <Content>
            {!live ? <DemoBanner>Sample triage — open from an `agent_triage_queue` call for live data.</DemoBanner> : null}

            <div className="piq-grid-3" style={{ marginBottom: 16 }}>
              <StatsCard
                title="Processed"
                value={pick<number>(payload, 'processed', rows.length)}
                description="Applications the agent worked in this sweep."
                icon={<IconAgent size={16} />}
                tone="machine"
              />
              <StatsCard
                title="Escalated"
                value={pick<number>(payload, 'escalated', escalatedIds.length)}
                description="Handed to an officer with evidence assembled."
                icon={<IconAlert size={16} />}
                tone="danger"
              />
              <StatsCard
                title="Rings detected"
                value={pick<number>(payload, 'ringsDetected', 0)}
                description="Coordinated clusters surfaced across applications."
                icon={<IconLink size={16} />}
                tone="warning"
              />
            </div>

            <EscalationBanner ids={escalatedIds} />

            <TriageQueue
              rows={rows.map((r) => ({
                applicationId: String(r.applicationId ?? ''),
                applicantName: String(r.applicantName ?? '—'),
                riskScore: (r.riskScore as number) ?? null,
                riskBand: String(r.riskBand ?? 'unknown'),
                clusterSize: (r.clusterSize as number) ?? 1,
                signalCount: (r.signalCount as number) ?? 0,
                headline: String(r.headline ?? r.recommendation ?? ''),
                recommendation: String(r.recommendation ?? ''),
                stagesCompleted: (r.stagesCompleted as number) ?? 0,
                stagesTotal: (r.stagesTotal as number) ?? 0,
                agentRuns: 1,
              }))}
              title="Agent triage result"
              subtitle="The agent ranked the whole queue on its own, then stopped. Every row still requires an officer."
            />
          </Content>
        </MainColumn>
      </AppShell>
    );
  }

  const payload = withFallback(data, SAMPLE_AGENT_RUN as unknown as Record<string, unknown>);
  const steps = toStepViews(asArray<RawStep>(payload.steps));
  const applicationId = pick<string>(payload, 'applicationId', '');
  const riskScore = pick<number | null>(payload, 'riskScore', null);

  return (
    <AppShell>
      <MainColumn>
        <TopBar
          crumbs={['PassportIQ', 'Agent investigation', applicationId || '—']}
          live={{ label: `${steps.length} steps`, tone: 'machine' }}
          officer={{ name: OFFICER.name, role: OFFICER.role }}
        />
        <Content>
          {!live ? <DemoBanner>Sample run — open from an `agent_investigate` call for live data.</DemoBanner> : null}

          <div className="piq-grid-4" style={{ marginBottom: 16 }}>
            <StatsCard
              title="Steps taken"
              value={steps.length}
              description="Tool calls the agent chose without being told which to use."
              icon={<IconBolt size={16} />}
              tone="machine"
            />
            <StatsCard
              title="Goal"
              value={String(pick<string>(payload, 'goal', '—')).replace(/_/g, ' ')}
              description="What the agent was asked to establish."
              icon={<IconAgent size={16} />}
            />
            <StatsCard
              title="Risk found"
              value={riskScore ?? '—'}
              description="Score the agent arrived at, for an officer to weigh."
              icon={<IconAlert size={16} />}
              tone={typeof riskScore === 'number' && riskScore >= 70 ? 'danger' : 'warning'}
            />
            <StatsCard
              title="Planner"
              value={String(pick<string>(payload, 'plannerKind', 'policy'))}
              description={String(pick<string>(payload, 'model', 'deterministic'))}
              icon={<IconAgent size={16} />}
              tone="blue"
            />
          </div>

          <AgentTrace
            steps={steps}
            handoff={pick<string | null>(payload, 'handoff', null)}
            stopReason={pick<string | null>(payload, 'stopReason', pick<string | null>(payload, 'status', null))}
            planner={pick<string | null>(payload, 'plannerKind', null)}
            model={pick<string | null>(payload, 'model', null)}
            subtitle={`Investigation ${pick<string>(payload, 'runId', '')} — every turn, verbatim.`}
          />

          <p style={{ margin: '18px 0 0', fontSize: 11.5, color: COLORS.textMuted, textAlign: 'center' }}>
            The agent selects and chains its own tools. It never records a decision.
          </p>
        </Content>
      </MainColumn>
    </AppShell>
  );
}
