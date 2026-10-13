'use client';

/**
 * Conflict Resolution panel — the human-in-the-loop surface.
 *
 * The swarm pauses here rather than guessing which source is authoritative.
 * Every button calls a real MCP tool through the Widget SDK, so resolving a
 * conflict in this panel writes the ruling into the durable knowledge base and
 * resumes the paused swarm run.
 */

import { useState } from 'react';
import { Badge, Button, Card, Empty, Meter, Note, Shell, Stats, useBridgeTool } from '../../lib/ui';
import type { Tone } from '../../lib/ui';

interface Conflict {
  id: string;
  kind: 'contradiction' | 'semantic-drift';
  topic: string;
  similarity: number;
  divergence: number;
  sourceA: { origin: string; ref: string; text: string };
  sourceB: { origin: string; ref: string; text: string };
  recommendation: 'a' | 'b';
  recommendationReason: string;
  status: 'open' | 'resolved';
  resolution?: { chosen: string; directive: string; resolvedBy: string; resolvedAt: string };
}

interface Payload {
  conflictCount: number;
  openCount: number;
  conflicts: Conflict[];
  thresholds?: { driftBelow: number; contradictionAtOrAbove: number };
  sources?: { jira: string; teams: string };
  nextStep?: string;
  resumedRun?: string;
}

export default function ConflictResolver() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  // Every row dereferences sourceA/sourceB directly, so a conflict missing either
  // one takes the whole widget down with an unhandled TypeError. Rendering a
  // partial list — or the empty state — is always better than a red error box.
  const conflicts = (data?.conflicts ?? []).filter((c) => c?.sourceA && c?.sourceB);
  const open = conflicts.filter((c) => c.status === 'open');
  const resolved = conflicts.filter((c) => c.status === 'resolved');

  const resolve = (id: string, chosen: 'a' | 'b' | 'custom') =>
    run('resolve_conflict', {
      conflict_id: id,
      chosen,
      resolved_by: 'admin',
      ...(chosen === 'custom' ? { directive: custom[id] ?? '' } : {}),
    });

  return (
    <Shell
      icon="⚖"
      title="Conflict Resolution"
      subtitle={
        data?.sources
          ? `${data.sources.jira}  ·  ${data.sources.teams}`
          : 'Written tickets vs. spoken decisions'
      }
      error={error}
      onDismissError={clearError}
      actions={
        <>
          <Button size="sm" variant="ghost" loading={busy === 'list_conflicts'} onClick={() => run('list_conflicts')}>
            Refresh
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={busy === 'detect_conflicts'}
            onClick={() => run('detect_conflicts')}
          >
            Re-scan sources
          </Button>
        </>
      }
    >
      <Stats
        items={[
          { label: 'Detected', value: conflicts.length },
          { label: 'Open', value: open.length, tone: open.length ? 'danger' : 'ok' },
          { label: 'Resolved', value: resolved.length, tone: resolved.length ? 'ok' : 'neutral' },
        ]}
      />

      {data?.resumedRun ? (
        <Note tone="ok">
          All conflicts cleared — swarm run <code>{data.resumedRun}</code> resumed. Run{' '}
          <code>synthesize_claude_md</code> to regenerate the manifest.
        </Note>
      ) : null}

      {!conflicts.length ? (
        <Empty
          icon="✓"
          title="No conflicts detected"
          hint={
            <>
              The ticket tracker and the meeting transcript agree. Press{' '}
              <strong>Re-scan sources</strong> to check again.
            </>
          }
        />
      ) : null}

      {conflicts.map((conflict) => {
        const isOpen = conflict.status === 'open';
        const kindTone: Tone = conflict.kind === 'contradiction' ? 'danger' : 'warn';
        const isExpanded = expanded === conflict.id;

        return (
          <Card
            key={conflict.id}
            title={conflict.topic}
            aside={
              <div className="bx-btn-row">
                <Badge tone={kindTone}>{conflict.kind}</Badge>
                <Badge tone={isOpen ? 'warn' : 'ok'}>{isOpen ? 'open' : 'resolved'}</Badge>
              </div>
            }
          >
            {/* The two-signal scoring, shown because it is the interesting part. */}
            <div className="bx-split" style={{ marginBottom: 11 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--bx-fg-mute)' }}>Alignment (cosine)</span>
                  <code>{conflict.similarity.toFixed(3)}</code>
                </div>
                <Meter value={conflict.similarity} tone="accent" />
                <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', marginTop: 3 }}>
                  are these about the same thing?
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: 'var(--bx-fg-mute)' }}>Divergence (decision)</span>
                  <code>{conflict.divergence.toFixed(3)}</code>
                </div>
                <Meter value={conflict.divergence} tone={conflict.divergence >= 0.6 ? 'danger' : 'warn'} />
                <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', marginTop: 3 }}>
                  do they choose differently?
                </div>
              </div>
            </div>

            <div className="bx-split">
              <SourcePanel
                letter="A"
                origin={conflict.sourceA.origin}
                reference={conflict.sourceA.ref}
                text={conflict.sourceA.text}
                recommended={conflict.recommendation === 'a'}
                chosen={conflict.resolution?.chosen === 'a'}
              />
              <SourcePanel
                letter="B"
                origin={conflict.sourceB.origin}
                reference={conflict.sourceB.ref}
                text={conflict.sourceB.text}
                recommended={conflict.recommendation === 'b'}
                chosen={conflict.resolution?.chosen === 'b'}
              />
            </div>

            <div className="bx-note" style={{ marginTop: 10 }}>
              <strong>Suggestion:</strong> source {conflict.recommendation.toUpperCase()} —{' '}
              {conflict.recommendationReason}
            </div>

            {isOpen ? (
              <>
                <div className="bx-btn-row" style={{ marginTop: 11 }}>
                  <Button
                    variant={conflict.recommendation === 'a' ? 'primary' : undefined}
                    loading={busy === 'resolve_conflict'}
                    onClick={() => resolve(conflict.id, 'a')}
                  >
                    Source A is authoritative
                  </Button>
                  <Button
                    variant={conflict.recommendation === 'b' ? 'primary' : undefined}
                    loading={busy === 'resolve_conflict'}
                    onClick={() => resolve(conflict.id, 'b')}
                  >
                    Source B is authoritative
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(isExpanded ? null : conflict.id)}
                  >
                    {isExpanded ? 'Cancel' : 'Write my own ruling'}
                  </Button>
                </div>

                {isExpanded ? (
                  <div style={{ marginTop: 10 }}>
                    <label className="bx-label" htmlFor={`custom-${conflict.id}`}>
                      Authoritative directive (written verbatim into CLAUDE.md section 0)
                    </label>
                    <textarea
                      id={`custom-${conflict.id}`}
                      className="bx-textarea"
                      placeholder="e.g. Neither. Use the existing in-process LRU until the PCI review lands in Q1."
                      value={custom[conflict.id] ?? ''}
                      onChange={(e) => setCustom((prev) => ({ ...prev, [conflict.id]: e.target.value }))}
                    />
                    <div className="bx-btn-row" style={{ marginTop: 7 }}>
                      <Button
                        variant="primary"
                        disabled={!(custom[conflict.id] ?? '').trim()}
                        loading={busy === 'resolve_conflict'}
                        onClick={() => resolve(conflict.id, 'custom')}
                      >
                        Record this ruling
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            ) : conflict.resolution ? (
              <Note tone="ok">
                <strong>Ruling:</strong> {conflict.resolution.directive}
                <div style={{ marginTop: 4, fontSize: 10.5, opacity: 0.85 }}>
                  by {conflict.resolution.resolvedBy} · {conflict.resolution.resolvedAt}
                </div>
              </Note>
            ) : null}
          </Card>
        );
      })}

      {data?.nextStep ? <Note>{data.nextStep}</Note> : null}
    </Shell>
  );
}

function SourcePanel({
  letter,
  origin,
  reference,
  text,
  recommended,
  chosen,
}: {
  letter: string;
  origin: string;
  reference: string;
  text: string;
  recommended: boolean;
  chosen: boolean;
}) {
  return (
    <div
      className="bx-card bx-card-tight"
      style={{
        background: 'var(--bx-bg)',
        borderColor: chosen ? 'var(--bx-ok)' : recommended ? 'var(--bx-accent)' : 'var(--bx-line)',
      }}
    >
      <div className="bx-card-h" style={{ marginBottom: 6 }}>
        <span className="bx-card-t">
          {letter} · {origin}
        </span>
        {chosen ? <Badge tone="ok">chosen</Badge> : recommended ? <Badge tone="accent">suggested</Badge> : null}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', fontFamily: 'var(--bx-mono)', marginBottom: 5 }}>
        {reference}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}
