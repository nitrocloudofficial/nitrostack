'use client';

/**
 * Swarm Console — live status of the seven reconnaissance personas.
 */

import { Badge, Button, Card, Empty, Note, Shell, Stats, useBridgeTool } from '../../lib/ui';
import type { Tone } from '../../lib/ui';

interface AgentSlot {
  agent: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  factCount: number;
  durationMs: number;
  summary: string;
  error?: string;
}

interface Payload {
  runId: string;
  status: 'running' | 'awaiting-resolution' | 'completed' | 'failed';
  target: string;
  startedAt?: string;
  finishedAt?: string;
  agents: AgentSlot[];
  agentsCompleted: number;
  agentsFailed: number;
  factsGathered: number;
  factsByCategory: Record<string, number>;
  openConflicts: number;
  generatedSkills: number;
  manifestPath?: string;
  manifestSkippedReason?: string;
  nextStep?: string;
}

const PERSONA: Record<string, { icon: string; label: string; domain: string }> = {
  'structural-cartographer': { icon: '▦', label: 'Structural Cartographer', domain: 'dependency graph & topography' },
  'documentation-synthesizer': { icon: '❏', label: 'Documentation Synthesizer', domain: 'dependency manifests & wikis' },
  'qa-analyst': { icon: '✓', label: 'Quality Assurance Analyst', domain: 'test strategy & lint contract' },
  'devops-navigator': { icon: '⇶', label: 'DevOps Navigator', domain: 'CI/CD & commit convention' },
  'product-synchronizer': { icon: '◷', label: 'Product Synchronizer', domain: 'Jira sprint state' },
  'scrum-analyst': { icon: '☷', label: 'Scrum Analyst', domain: 'human consensus from Teams' },
  'uiux-integrator': { icon: '◐', label: 'UI/UX Integrator', domain: 'design tokens & components' },
};

const STATUS_TONE: Record<Payload['status'], Tone> = {
  running: 'accent',
  'awaiting-resolution': 'warn',
  completed: 'ok',
  failed: 'danger',
};

export default function SwarmConsole() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();

  if (!data) {
    return (
      <Shell icon="⬡" title="Swarm Console" subtitle="Reconnaissance orchestrator" error={error}>
        <Empty
          icon="⬡"
          title="No swarm run yet"
          hint={
            <>
              Call <code>run_swarm</code> to dispatch all seven personas across a legacy codebase.
            </>
          }
        />
        <Button variant="primary" loading={busy === 'run_swarm'} onClick={() => run('run_swarm')}>
          Dispatch swarm
        </Button>
      </Shell>
    );
  }

  const total = data.agents?.length ?? 0;

  return (
    <Shell
      icon="⬡"
      title="Swarm Console"
      subtitle={[data.runId, data.target ? `target ${data.target}` : null].filter(Boolean).join('  ·  ')}
      error={error}
      onDismissError={clearError}
      actions={
        <>
          <Badge tone={STATUS_TONE[data.status]}>{data.status}</Badge>
          <Button size="sm" variant="ghost" loading={busy === 'get_swarm_run'} onClick={() => run('get_swarm_run')}>
            Refresh
          </Button>
          <Button size="sm" variant="primary" loading={busy === 'run_swarm'} onClick={() => run('run_swarm')}>
            Re-run
          </Button>
        </>
      }
    >
      <Stats
        items={[
          {
            // `total` is 0 when a caller hands us a summary without the per-agent
            // array; showing "7/0" would read as a failure, so drop the denominator.
            label: 'Agents',
            value: total ? `${data.agentsCompleted}/${total}` : `${data.agentsCompleted ?? 0}`,
            tone: data.agentsFailed ? 'warn' : 'ok',
          },
          { label: 'Facts', value: data.factsGathered ?? 0, tone: 'accent' },
          { label: 'Skills', value: data.generatedSkills ?? 0 },
          {
            label: 'Conflicts',
            value: data.openConflicts,
            tone: data.openConflicts ? 'danger' : 'ok',
          },
        ]}
      />

      {data.status === 'awaiting-resolution' ? (
        <Note tone="warn">
          <strong>Run paused.</strong> {data.manifestSkippedReason ?? 'A human decision is required.'} The
          manifest is deliberately not generated while sources contradict each other — open the{' '}
          <strong>Conflict Resolution</strong> panel (<code>detect_conflicts</code>) to rule on them.
        </Note>
      ) : null}

      {data.manifestPath ? (
        <Note tone="ok">
          Manifest written to <code>{data.manifestPath}</code>.
        </Note>
      ) : null}

      <Card title="Reconnaissance personas">
        <div className="bx-list">
          {(data.agents ?? []).map((slot) => {
            const persona = PERSONA[slot.agent] ?? { icon: '·', label: slot.agent, domain: '' };
            const tone: Tone =
              slot.status === 'done'
                ? 'ok'
                : slot.status === 'failed'
                  ? 'danger'
                  : slot.status === 'running'
                    ? 'accent'
                    : 'neutral';
            return (
              <div className="bx-item" key={slot.agent}>
                <span className="bx-dot" data-tone={tone} />
                <div className="bx-item-main">
                  <div className="bx-item-t">
                    <span style={{ opacity: 0.6, marginRight: 6 }}>{persona.icon}</span>
                    {persona.label}
                  </div>
                  <div className="bx-item-d">
                    {slot.status === 'failed' ? (
                      <span style={{ color: 'var(--bx-danger)' }}>{slot.error}</span>
                    ) : (
                      slot.summary || persona.domain
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: 'none' }}>
                  <Badge tone={tone}>{slot.status}</Badge>
                  <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', marginTop: 3, fontFamily: 'var(--bx-mono)' }}>
                    {slot.factCount} facts · {slot.durationMs}ms
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {data.factsByCategory && Object.keys(data.factsByCategory).length ? (
        <Card title="Knowledge base composition">
          <div className="bx-btn-row">
            {Object.entries(data.factsByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <Badge key={category} tone="neutral">
                  {category} · {count}
                </Badge>
              ))}
          </div>
        </Card>
      ) : null}

      {data.nextStep ? <Note>{data.nextStep}</Note> : null}
    </Shell>
  );
}
