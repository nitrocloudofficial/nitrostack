/**
 * Agentic surfaces: reasoning trace, autopilot control, live activity stream,
 * triage queue, escalation banner.
 *
 * WHY THE TRACE IS RENDERED VERBATIM
 * ---------------------------------
 * A passport decision is a legal act. If an officer is going to lean on a machine
 * recommendation at all, the machine has to show its working in the officer's own
 * language — what it looked at, what it concluded, how sure it was, and how long
 * it took. So `AgentTrace` prints every observe -> think -> act turn as the agent
 * actually emitted it. Nothing is summarised away, and the trace always ends with
 * the handoff notice: the agent has no authority to decide.
 *
 * Every component tolerates `{}`. The data arrives from `window.openai.toolOutput`
 * or from the console REST API, both untyped at the boundary; a throw here blanks
 * the entire bundle with no error surface.
 */
import React from 'react';
import { COLORS, bandLabel, bandOf, riskBorder, riskColor, riskSoft } from '../lib/theme.js';
import { asArray, clockTime, humanise, ms, pctOf1, shortId, truncate } from '../lib/format.js';
import { Bar, Button, Card, Chip, Empty, Pill, RiskPill } from './chrome.jsx';
import {
  IconAgent,
  IconAlert,
  IconBolt,
  IconCheck,
  IconClock,
  IconEye,
  IconLink,
  IconPause,
  IconPlay,
  IconRefresh,
} from './icons.jsx';

// ---------------------------------------------------------------------------
// Reasoning trace
// ---------------------------------------------------------------------------

export interface AgentStepView {
  index?: number;
  step?: number;
  phase?: string;
  tool?: string;
  toolName?: string;
  thought?: string;
  observation?: unknown;
  action?: string;
  confidence?: number;
  durationMs?: number;
  at?: string;
  ok?: boolean;
  error?: string;
}

/** Phase -> colour. Unknown phases fall back to the machine violet. */
function phaseTone(phase: string | undefined): string {
  switch ((phase ?? '').toLowerCase()) {
    case 'observe':
      return COLORS.info;
    case 'think':
    case 'reason':
      return COLORS.machine;
    case 'act':
    case 'tool':
      return COLORS.accent;
    case 'conclude':
    case 'finish':
      return COLORS.low;
    default:
      return COLORS.machine;
  }
}

/**
 * Render an observation. The agent's observations are whatever the tool returned,
 * so this has to handle a string, a number, an object and `undefined` without
 * ever throwing or dumping an unreadable wall of JSON.
 */
function renderObservation(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return truncate(value, 460);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return truncate(JSON.stringify(value, null, 2), 700);
  } catch {
    return '[unserialisable observation]';
  }
}

export function AgentTrace({
  steps,
  handoff,
  stopReason,
  planner,
  model,
  live,
  title = 'Agent reasoning trace',
  subtitle,
}: {
  steps?: AgentStepView[] | null;
  handoff?: string | null;
  stopReason?: string | null;
  planner?: string | null;
  model?: string | null;
  live?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const rows = asArray<AgentStepView>(steps);

  return (
    <Card
      title={title}
      subtitle={subtitle ?? 'Every turn the agent took, in the order it took them.'}
      eyebrow="Autonomous investigation"
      icon={<IconAgent size={16} color={COLORS.machine} />}
      actions={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {planner ? <Chip>{humanise(planner)}</Chip> : null}
          {model ? <Chip>{model}</Chip> : null}
          {live ? (
            <span className="piq-live">
              <span className="piq-live-dot" />
              thinking
            </span>
          ) : null}
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty>
          No agent run recorded for this application yet. Trigger one from the queue, or let
          autopilot pick it up on the next sweep.
        </Empty>
      ) : (
        <ol className="piq-timeline" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {rows.map((step, i) => {
            const phase = step.phase ?? 'think';
            const tone = phaseTone(phase);
            const tool = step.tool ?? step.toolName;
            const obs = renderObservation(step.observation);
            const failed = step.ok === false || Boolean(step.error);

            return (
              <li className="piq-tl-item" key={`${i}-${step.at ?? phase}`}>
                <span
                  className="piq-tl-dot"
                  style={{
                    background: failed ? COLORS.highSoft : `${tone}1A`,
                    borderColor: failed ? COLORS.high : tone,
                    color: failed ? COLORS.high : tone,
                  }}
                >
                  {failed ? <IconAlert size={12} /> : <span style={{ fontSize: 10, fontWeight: 700 }}>{step.index ?? step.step ?? i + 1}</span>}
                </span>

                <div className="piq-tl-body">
                  <div className="piq-tl-title">
                    <span style={{ color: tone, fontWeight: 650, textTransform: 'capitalize' }}>{phase}</span>
                    {tool ? (
                      <code
                        style={{
                          marginLeft: 8,
                          fontSize: 11.5,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: COLORS.surfaceAlt,
                          border: `1px solid ${COLORS.border}`,
                          color: COLORS.textSecondary,
                        }}
                      >
                        {tool}
                      </code>
                    ) : null}
                  </div>

                  {step.thought ? (
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        lineHeight: 1.6,
                        fontStyle: 'italic',
                        color: COLORS.textPrimary,
                      }}
                    >
                      {step.thought}
                    </p>
                  ) : null}

                  {step.action ? (
                    <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: COLORS.textSecondary }}>
                      {step.action}
                    </p>
                  ) : null}

                  {obs ? (
                    <pre
                      style={{
                        margin: '8px 0 0',
                        padding: '8px 10px',
                        fontSize: 11.5,
                        lineHeight: 1.55,
                        background: COLORS.surfaceSunken,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 6,
                        color: COLORS.textSecondary,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        maxHeight: 190,
                        overflow: 'auto',
                      }}
                    >
                      {obs}
                    </pre>
                  ) : null}

                  {step.error ? (
                    <p style={{ margin: '6px 0 0', fontSize: 12.5, color: COLORS.high }}>{step.error}</p>
                  ) : null}

                  <div className="piq-tl-meta">
                    {typeof step.confidence === 'number' ? <span>confidence {pctOf1(step.confidence)}</span> : null}
                    {typeof step.durationMs === 'number' ? <span>{ms(step.durationMs)}</span> : null}
                    {step.at ? <span>{clockTime(step.at)}</span> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {stopReason ? (
        <p style={{ margin: '14px 0 0', fontSize: 12.5, color: COLORS.textMuted }}>
          Run ended: <strong style={{ color: COLORS.textSecondary }}>{humanise(stopReason)}</strong>
        </p>
      ) : null}

      <div
        style={{
          marginTop: 14,
          padding: '12px 14px',
          borderRadius: 8,
          background: COLORS.machineSoft,
          border: `1px solid ${COLORS.machine}33`,
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <IconEye size={15} color={COLORS.machine} />
          <strong style={{ fontSize: 12.5, color: COLORS.machine, letterSpacing: '0.02em' }}>
            HANDOFF TO OFFICER
          </strong>
        </div>
        <p style={{ margin: '7px 0 0', fontSize: 13, lineHeight: 1.65, color: COLORS.textPrimary }}>
          {handoff ??
            'The investigation is complete and the evidence is assembled. What follows requires judgement, not computation.'}
        </p>
        <p style={{ margin: '7px 0 0', fontSize: 12.5, lineHeight: 1.6, color: COLORS.textSecondary }}>
          The agent has no authority to approve, reject or request clarification. This is where it
          always stops.
        </p>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Autopilot
// ---------------------------------------------------------------------------

/**
 * The autopilot's live status, mirroring `AutopilotStatusSchema` on the server
 * exactly. An earlier revision of this interface invented its own names
 * (`running`, `sweeps`, `ringsSurfaced`, `lastSweepAt`, `batchSize`) — none of
 * which the server emits, so the panel reported "idle · 0 · 0 · 0" forever while
 * the autopilot was in fact sweeping the queue. Every field below is on the wire.
 */
export interface AutopilotView {
  enabled?: boolean;
  /** 'idle' | 'sweeping' | 'stopped'. There is no separate boolean — mode IS the state. */
  mode?: string;
  intervalSeconds?: number;
  sweepsCompleted?: number;
  applicationsInvestigated?: number;
  escalations?: number;
  ringsDetected?: number;
  lastSweepStartedAt?: string | null;
  lastSweepFinishedAt?: string | null;
  lastSweepDurationMs?: number | null;
  nextSweepEta?: string | null;
  currentApplicationId?: string | null;
  /** The autopilot's own one-line account of what it is doing right now. */
  detail?: string;
}

/** The last completed sweep, so the panel can show what the machine actually found. */
export interface AutopilotSweepView {
  sweepId?: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  applicationsInvestigated?: number;
  escalated?: string[];
  ringsDetected?: number;
  topPriority?: {
    applicationId?: string;
    applicantName?: string;
    riskScore?: number | null;
    recommendation?: string;
    headline?: string;
  } | null;
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="piq-ministat">
      <div className="piq-ministat-value" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      <div className="piq-ministat-label">{label}</div>
    </div>
  );
}

export function AutopilotPanel({
  status,
  lastSweep,
  onSweep,
  onStart,
  onStop,
  onSelect,
  busy,
  error,
  compact = false,
}: {
  status?: AutopilotView | null;
  lastSweep?: AutopilotSweepView | null;
  onSweep?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onSelect?: (applicationId: string) => void;
  busy?: boolean;
  error?: string | null;
  /** Side-rail placement: stats wrap 2-up instead of 4-up so nothing clips. */
  compact?: boolean;
}) {
  const s = status ?? {};
  const sweeping = s.mode === 'sweeping';
  const armed = s.enabled === true && s.mode !== 'stopped';
  const stateLabel = sweeping ? 'sweeping' : s.mode === 'stopped' ? 'disarmed' : armed ? 'armed' : 'idle';
  const stateColor = sweeping ? COLORS.machine : armed ? COLORS.low : COLORS.textSecondary;
  const stateSoft = sweeping ? COLORS.machineSoft : armed ? COLORS.lowSoft : COLORS.surfaceAlt;
  const stateBorder = sweeping ? '#E9D5FF' : armed ? COLORS.lowBorder : COLORS.border;

  const top = lastSweep?.topPriority ?? null;

  return (
    <Card
      title="Autopilot"
      subtitle="Works the queue on its own — picks the riskiest unworked application, investigates it, escalates, and stops before deciding."
      eyebrow="Automation"
      icon={<IconBolt size={16} color={COLORS.machine} />}
      actions={
        <Pill color={stateColor} background={stateSoft} border={stateBorder}>
          <span className={sweeping ? 'piq-pulse-dot' : undefined} />
          {stateLabel}
        </Pill>
      }
    >
      <div className={compact ? 'piq-grid-2' : 'piq-grid-4'} style={{ marginBottom: 14 }}>
        <MiniStat label="Sweeps" value={s.sweepsCompleted ?? 0} />
        <MiniStat label="Investigated" value={s.applicationsInvestigated ?? 0} tone={COLORS.accent} />
        <MiniStat label="Escalated" value={s.escalations ?? 0} tone={COLORS.high} />
        <MiniStat label="Rings found" value={s.ringsDetected ?? 0} tone={COLORS.medium} />
      </div>

      {/* The autopilot narrates itself. Preferring its own `detail` over a
          sentence assembled here means the UI cannot drift from what the
          service actually did. */}
      <p className="piq-autopilot-detail">
        {s.detail
          ? s.detail
          : armed
            ? `Sweeping the queue every ${s.intervalSeconds ?? 45}s.`
            : 'Not sweeping on a timer. Run one sweep, or arm it to work continuously.'}
      </p>

      <div className="piq-autopilot-meta">
        {s.currentApplicationId ? (
          <span className="piq-chip">
            <span className="piq-pulse-dot" />
            investigating {s.currentApplicationId}
          </span>
        ) : null}
        {s.lastSweepFinishedAt ? (
          <span className="piq-chip">last sweep {clockTime(s.lastSweepFinishedAt)}</span>
        ) : null}
        {typeof s.lastSweepDurationMs === 'number' ? (
          <span className="piq-chip">{Math.round(s.lastSweepDurationMs)}ms</span>
        ) : null}
        {s.nextSweepEta && !sweeping ? (
          <span className="piq-chip">next {clockTime(s.nextSweepEta)}</span>
        ) : null}
      </div>

      {/* What the last sweep concluded. Without this the counters are trivia;
          with it the panel answers "so what did it find?". */}
      {top?.applicationId ? (
        <button
          type="button"
          className="piq-autopilot-top"
          onClick={() => top.applicationId && onSelect?.(top.applicationId)}
          disabled={!onSelect}
          style={onSelect ? undefined : { cursor: 'default' }}
        >
          <span className="piq-eyebrow">Top priority from the last sweep</span>
          <span className="piq-autopilot-top-name">
            {top.applicantName ?? top.applicationId}
            <span className="piq-autopilot-top-id">{top.applicationId}</span>
          </span>
          {top.headline ? <span className="piq-autopilot-top-head">{top.headline}</span> : null}
          <span className="piq-autopilot-top-foot">
            {typeof top.riskScore === 'number' ? `risk ${Math.round(top.riskScore)}` : 'not scored'}
            {top.recommendation ? ` · machine recommends ${humanise(top.recommendation)}` : ''}
            {' · a human still decides'}
          </span>
        </button>
      ) : null}

      {error ? <p className="piq-inline-error">{error}</p> : null}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <Button variant="machine" onClick={onSweep} disabled={busy || sweeping} icon={<IconRefresh size={14} />}>
          {sweeping ? 'Sweeping…' : busy ? 'Working…' : 'Run one sweep'}
        </Button>
        {armed ? (
          <Button onClick={onStop} disabled={busy} icon={<IconPause size={14} />}>
            Disarm
          </Button>
        ) : (
          <Button onClick={onStart} disabled={busy} icon={<IconPlay size={14} />}>
            Arm continuous
          </Button>
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Live activity stream
// ---------------------------------------------------------------------------

export interface StreamEvent {
  id?: string | number;
  event?: string;
  type?: string;
  at?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

const EVENT_TONE: Record<string, string> = {
  'console.connected': COLORS.textMuted,
  'pipeline.stage_completed': COLORS.info,
  'pipeline.pipeline_completed': COLORS.low,
  'risk.scored': COLORS.medium,
  'duplicate.signals_detected': COLORS.high,
  'graph.built': COLORS.accent,
  'decision.recorded': COLORS.low,
  'agent.run_started': COLORS.machine,
  'agent.step': COLORS.machine,
  'agent.run_finished': COLORS.machine,
  'agent.escalated': COLORS.high,
  'autopilot.sweep_started': COLORS.machine,
  'autopilot.sweep_finished': COLORS.machine,
  'autopilot.application_picked': COLORS.accent,
  'autopilot.state_changed': COLORS.textSecondary,
};

function num(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/**
 * One officer-readable sentence per event. The stream is the most-watched surface
 * in a demo, and raw event names ("pipeline.stage_completed") say nothing about
 * what actually happened to whose application.
 */
export function describe(evt: StreamEvent): string {
  const name = evt.event ?? evt.type ?? 'event';
  const p = (evt.payload ?? evt.data ?? {}) as Record<string, unknown>;
  const app = str(p.applicationId) ?? str(p.application_id);
  const who = app ? shortId(app) : 'the queue';

  switch (name) {
    case 'console.connected':
      return 'Console attached to the live event stream.';
    case 'pipeline.stage_completed':
      return `${who} — ${humanise(str(p.stage) ?? 'stage')} completed.`;
    case 'pipeline.pipeline_completed':
      return `${who} — all verification stages finished; ready for an officer.`;
    case 'risk.scored': {
      const score = num(p.riskScore) ?? num(p.score);
      return `${who} scored ${score ?? '—'} (${bandLabel(bandOf(score))}).`;
    }
    case 'duplicate.signals_detected': {
      const count = num(p.signalCount) ?? asArray(p.signals).length;
      return `${who} — ${count} duplicate signal(s) detected against other live applications.`;
    }
    case 'graph.built': {
      const nodes = num(p.nodeCount) ?? asArray(p.nodes).length;
      return `${who} — relationship graph rebuilt with ${nodes} node(s).`;
    }
    case 'decision.recorded':
      return `${who} — officer recorded ${humanise(str(p.decision) ?? 'a decision')}.`;
    case 'agent.run_started':
      return `Agent opened an investigation into ${who} (goal: ${humanise(str(p.goal) ?? 'assess')}).`;
    case 'agent.step':
      return `Agent ${humanise(str(p.phase) ?? 'thinking')}${p.tool ? ` — ${String(p.tool)}` : ''} on ${who}.`;
    case 'agent.run_finished': {
      const score = num(p.riskScore);
      return `Agent finished ${who}${score !== undefined ? ` at risk ${score}` : ''} and handed it to an officer.`;
    }
    case 'agent.escalated':
      return `Agent escalated ${who} — ${str(p.reason) ?? 'requires officer attention'}.`;
    case 'autopilot.sweep_started':
      return `Autopilot started a sweep of ${num(p.batchSize) ?? '—'} application(s).`;
    case 'autopilot.sweep_finished':
      return `Autopilot sweep finished — ${num(p.investigated) ?? 0} investigated, ${num(p.escalated) ?? 0} escalated.`;
    case 'autopilot.application_picked':
      return `Autopilot picked ${who} — ${str(p.reason) ?? 'highest unworked priority'}.`;
    case 'autopilot.state_changed':
      return `Autopilot is now ${humanise(str(p.mode) ?? 'idle')}.`;
    default:
      return `${humanise(name)}${app ? ` — ${who}` : ''}`;
  }
}

export function ActivityStream({
  events,
  max = 60,
  emptyHint,
  title = 'Live activity',
  live,
  height,
}: {
  events?: StreamEvent[] | null;
  max?: number;
  emptyHint?: string;
  title?: string;
  live?: boolean;
  height?: number;
}) {
  const rows = asArray<StreamEvent>(events).slice(-max).reverse();

  return (
    <Card
      title={title}
      subtitle="Every pipeline, agent and autopilot event, as it happens."
      eyebrow="Event stream"
      icon={<IconClock size={16} color={COLORS.info} />}
      actions={
        live ? (
          <span className="piq-live">
            <span className="piq-live-dot" />
            streaming
          </span>
        ) : null
      }
    >
      {rows.length === 0 ? (
        <Empty>{emptyHint ?? 'Nothing has happened yet. Run a pipeline or a sweep to see the stream fill.'}</Empty>
      ) : (
        <div className="piq-stream piq-scroll" style={height ? { maxHeight: height, overflow: 'auto' } : undefined}>
          {rows.map((evt, i) => {
            const name = evt.event ?? evt.type ?? 'event';
            const tone = EVENT_TONE[name] ?? COLORS.textSecondary;
            return (
              <div className="piq-stream-row" key={`${evt.id ?? i}-${name}`}>
                <span className="piq-stream-time">{evt.at ? clockTime(evt.at) : '--:--'}</span>
                <span className="piq-stream-tag" style={{ background: `${tone}1A`, color: tone, borderColor: `${tone}40` }}>
                  {name.split('.')[0]}
                </span>
                <span className="piq-stream-text">{describe(evt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Triage queue
// ---------------------------------------------------------------------------

export interface TriageRowView {
  applicationId?: string;
  applicantName?: string;
  riskScore?: number | null;
  riskBand?: string;
  clusterSize?: number;
  signalCount?: number;
  status?: string;
  decision?: string | null;
  agentRuns?: number;
  headline?: string;
  recommendation?: string;
  pipelineComplete?: boolean;
  stagesCompleted?: number;
  stagesTotal?: number;
}

export function TriageQueue({
  rows,
  selectedId,
  onSelect,
  title = 'Officer queue',
  subtitle,
  actions,
  limit,
}: {
  rows?: TriageRowView[] | null;
  selectedId?: string | null;
  onSelect?: (applicationId: string) => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  limit?: number;
}) {
  const all = asArray<TriageRowView>(rows);
  const list = typeof limit === 'number' ? all.slice(0, limit) : all;

  return (
    <Card
      title={title}
      subtitle={
        subtitle ??
        'Ordered by what actually needs a human first: undecided, then highest risk, then largest cluster.'
      }
      eyebrow="Prioritised work"
      icon={<IconAlert size={16} color={COLORS.accent} />}
      actions={actions}
      flush
    >
      {list.length === 0 ? (
        <div style={{ padding: 18 }}>
          <Empty>The queue is empty.</Empty>
        </div>
      ) : (
        <div className="piq-scroll" style={{ overflowX: 'auto' }}>
          <table className="piq-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>#</th>
                <th>Applicant</th>
                <th>Risk</th>
                <th>Cluster</th>
                <th>Progress</th>
                <th>Why it is here</th>
              </tr>
            </thead>
            <tbody>
              {list.map((row, i) => {
                const id = row.applicationId ?? '';
                const selected = Boolean(selectedId && id === selectedId);
                const total = row.stagesTotal ?? 0;
                const done = row.stagesCompleted ?? 0;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <tr
                    key={id || i}
                    onClick={onSelect && id ? () => onSelect(id) : undefined}
                    style={{
                      cursor: onSelect && id ? 'pointer' : 'default',
                      background: selected ? COLORS.accentSoft : undefined,
                      boxShadow: selected ? `inset 3px 0 0 ${COLORS.accent}` : undefined,
                    }}
                  >
                    <td style={{ color: COLORS.textMuted, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: COLORS.textPrimary }}>{row.applicantName ?? '—'}</div>
                      <div style={{ marginTop: 2, fontSize: 11.5, color: COLORS.textMuted }}>
                        {id || '—'}
                        {row.decision ? ` · ${humanise(row.decision)}` : ''}
                      </div>
                    </td>
                    <td>
                      <RiskPill band={(row.riskBand as never) ?? bandOf(row.riskScore ?? undefined)} score={row.riskScore ?? undefined} showScore />
                    </td>
                    <td>
                      {(row.clusterSize ?? 1) > 1 ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12.5,
                            color: COLORS.high,
                            fontWeight: 600,
                          }}
                        >
                          <IconLink size={13} />
                          {row.clusterSize}
                          <span style={{ color: COLORS.textMuted, fontWeight: 400 }}>
                            · {row.signalCount ?? 0} sig
                          </span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>isolated</span>
                      )}
                    </td>
                    <td style={{ minWidth: 108 }}>
                      <Bar percent={pct} color={row.pipelineComplete ? COLORS.low : COLORS.accent} />
                      <div style={{ marginTop: 4, fontSize: 11, color: COLORS.textMuted }}>
                        {done}/{total || '—'} stages
                        {(row.agentRuns ?? 0) > 0 ? ` · ${row.agentRuns} agent run(s)` : ''}
                      </div>
                    </td>
                    <td style={{ maxWidth: 340, fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.55 }}>
                      {row.headline ?? row.recommendation ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Escalation banner
// ---------------------------------------------------------------------------

export function EscalationBanner({
  ids,
  onSelect,
}: {
  ids?: string[] | null;
  onSelect?: (applicationId: string) => void;
}) {
  const list = asArray<string>(ids).filter(Boolean);
  if (list.length === 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 16px',
        marginBottom: 16,
        borderRadius: 8,
        background: COLORS.highSoft,
        border: `1px solid ${COLORS.highBorder}`,
      }}
    >
      <span style={{ marginTop: 1, flexShrink: 0 }}>
        <IconAlert size={17} color={COLORS.high} />
      </span>
      <div style={{ minWidth: 0 }}>
        <strong style={{ fontSize: 13, color: COLORS.high }}>
          {list.length} application{list.length === 1 ? '' : 's'} escalated by the agent
        </strong>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, lineHeight: 1.6, color: COLORS.textSecondary }}>
          The agent found evidence it could not resolve on its own. These are waiting on an officer.
        </p>
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {list.map((id) => (
            <button
              key={id}
              type="button"
              className="piq-btn piq-btn-sm"
              onClick={onSelect ? () => onSelect(id) : undefined}
              style={{ borderColor: COLORS.highBorder, color: COLORS.high, background: COLORS.surface }}
            >
              {id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent run history
// ---------------------------------------------------------------------------

/**
 * One row of investigation history.
 *
 * `steps` is deliberately `unknown[] | number`: `/api/agent/runs` ships the full
 * step array, while the per-application projection in `/api/applications/:id`
 * compacts it to a count. Accepting both means the same table renders either
 * source without the caller having to pre-flatten — and `stepsOf` below is the
 * single place that difference is resolved.
 */
export interface AgentRunView {
  runId?: string;
  applicationId?: string;
  goal?: string;
  steps?: unknown[] | number;
  stepCount?: number;
  riskScore?: number | null;
  /** Legacy flat flag. Prefer `handoff.requiresSeniorReview`. */
  escalated?: boolean;
  handoff?: {
    recommendation?: string;
    requiresSeniorReview?: boolean;
  } | null;
  planner?: string;
  startedAt?: string;
  finishedAt?: string;
  /** Older callers passed `durationMs`; the server field is `totalDurationMs`. */
  durationMs?: number;
  totalDurationMs?: number;
  stopReason?: string;
}

function stepsOf(run: AgentRunView): number | null {
  if (Array.isArray(run.steps)) return run.steps.length;
  if (typeof run.steps === 'number') return run.steps;
  if (typeof run.stepCount === 'number') return run.stepCount;
  return null;
}

export function AgentRunHistory({
  runs,
  onSelect,
  selectedRunId,
}: {
  runs?: AgentRunView[] | null;
  onSelect?: (runId: string) => void;
  selectedRunId?: string | null;
}) {
  const rows = asArray<AgentRunView>(runs);

  return (
    <Card
      title="Investigation history"
      subtitle="Every autonomous run the agent has completed in this session."
      eyebrow="Agent memory"
      icon={<IconAgent size={16} color={COLORS.machine} />}
      flush
    >
      {rows.length === 0 ? (
        <div style={{ padding: 18 }}>
          <Empty>No runs yet.</Empty>
        </div>
      ) : (
        <div className="piq-scroll" style={{ overflowX: 'auto' }}>
          <table className="piq-table">
            <thead>
              <tr>
                <th>Run</th>
                <th>Application</th>
                <th>Goal</th>
                <th>Steps</th>
                <th>Risk</th>
                <th>Recommended</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run, i) => {
                const selected = Boolean(selectedRunId && run.runId === selectedRunId);
                const stepCount = stepsOf(run);
                const duration = run.totalDurationMs ?? run.durationMs;
                const escalated = run.escalated === true || run.handoff?.requiresSeniorReview === true;
                const recommendation = run.handoff?.recommendation ?? null;
                return (
                  <tr
                    key={run.runId ?? i}
                    onClick={onSelect && run.runId ? () => onSelect(run.runId as string) : undefined}
                    style={{
                      cursor: onSelect && run.runId ? 'pointer' : 'default',
                      background: selected ? COLORS.accentSoft : undefined,
                    }}
                  >
                    <td style={{ fontSize: 11.5, color: COLORS.textMuted }}>
                      {run.runId ? shortId(run.runId) : '—'}
                      {run.startedAt ? <div>{clockTime(run.startedAt)}</div> : null}
                    </td>
                    <td style={{ fontWeight: 600 }}>{run.applicationId ?? '—'}</td>
                    <td style={{ fontSize: 12.5, color: COLORS.textSecondary }}>{humanise(run.goal ?? '—')}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {stepCount ?? '—'}
                      {typeof duration === 'number' ? (
                        <div style={{ fontSize: 11, color: COLORS.textMuted }}>{ms(duration)}</div>
                      ) : null}
                    </td>
                    <td>
                      {run.riskScore === null || run.riskScore === undefined ? (
                        <span style={{ color: COLORS.textMuted }}>—</span>
                      ) : (
                        <RiskPill band={bandOf(run.riskScore)} score={run.riskScore} showScore />
                      )}
                    </td>
                    {/* The machine's recommendation, labelled as advisory. Showing it
                        beside the score is what lets an officer spot a run whose
                        recommendation does not follow from its own number. */}
                    <td>
                      {recommendation ? (
                        <Pill
                          color={COLORS.machine}
                          background={COLORS.machineSoft}
                          border="#E9D5FF"
                        >
                          {humanise(recommendation)}
                        </Pill>
                      ) : (
                        <span style={{ color: COLORS.textMuted }}>—</span>
                      )}
                    </td>
                    <td>
                      {escalated ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: COLORS.high,
                          }}
                        >
                          <IconAlert size={13} /> escalated
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            fontSize: 12.5,
                            color: COLORS.low,
                          }}
                        >
                          <IconCheck size={13} /> handed off
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Small helper used by pages to colour a risk cell without importing theme. */
export { riskColor, riskSoft, riskBorder };
