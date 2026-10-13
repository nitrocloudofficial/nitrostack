'use client';

/**
 * Pipeline Builder — compose an SDLC as an ordered chain of stages.
 *
 * Deliberately a click-to-add / reorder list rather than a free-form canvas:
 * the backend executes a topologically sorted graph, an ordered chain is the
 * shape that actually maps onto it, and it stays usable in a narrow widget
 * iframe where drag-and-drop on a canvas does not.
 */

import { useEffect, useState } from 'react';
import { Badge, Button, Card, Empty, Note, Shell, Stats, useBridgeTool } from '../../lib/ui';
import type { Tone } from '../../lib/ui';

interface NodeDescriptor {
  type: string;
  label: string;
  description: string;
  category: 'cognitive' | 'authoring' | 'verification' | 'delivery' | 'communication';
  sideEffecting: boolean;
  backingTool?: string;
}

interface StageResult {
  id: string;
  type: string;
  label: string;
  status: 'ok' | 'planned' | 'paused' | 'skipped';
  executed: boolean;
  output: string;
  evidence: string[];
}

interface Payload {
  nodes: NodeDescriptor[];
  savedPipelines?: { name: string; stages: number }[];
  pipeline?: { name: string; description: string; nodes: { id: string; type: string; requiresApproval: boolean }[] };
  saved?: boolean;
  executionOrder?: string[];
  results?: StageResult[];
  task?: string;
  executed?: number;
  planned?: number;
  pausedAt?: string;
  note?: string;
}

const CATEGORY_TONE: Record<NodeDescriptor['category'], Tone> = {
  cognitive: 'accent',
  authoring: 'ok',
  verification: 'warn',
  delivery: 'danger',
  communication: 'neutral',
};

interface Stage {
  id: string;
  type: string;
  requiresApproval: boolean;
}

export default function PipelineBuilder() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();

  const [name, setName] = useState('Aurora feature SDLC');
  const [stages, setStages] = useState<Stage[]>([]);
  const [task, setTask] = useState('Add pagination to the customer tier listing');
  const [seeded, setSeeded] = useState(false);

  const catalog = data?.nodes ?? [];

  // Seed the canvas from a saved pipeline the first time one arrives, but never
  // clobber edits the administrator has already made in this session.
  useEffect(() => {
    // `pipeline` is not one shape across the tools that feed this widget:
    // get_pipeline returns the full object, while run_pipeline returns just the
    // NAME as a string. Seeding the canvas only makes sense for the former, and
    // reading .nodes off the latter is what crashed this widget.
    const saved = data?.pipeline;
    if (seeded || !saved || typeof saved !== 'object' || !Array.isArray(saved.nodes)) return;
    setName(saved.name);
    setStages(
      saved.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        requiresApproval: !!n.requiresApproval,
      }))
    );
    setSeeded(true);
  }, [data?.pipeline, seeded]);

  const add = (type: string) =>
    setStages((prev) => [...prev, { id: `n${prev.length + 1}-${type}`, type, requiresApproval: false }]);

  const move = (index: number, delta: number) =>
    setStages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (index: number) => setStages((prev) => prev.filter((_, i) => i !== index));

  const toggleApproval = (index: number) =>
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, requiresApproval: !s.requiresApproval } : s))
    );

  const save = () =>
    run('save_pipeline', {
      name,
      description: 'Composed in the pipeline-builder widget',
      nodes: stages.map((s) => ({
        id: s.id,
        type: s.type,
        requiresApproval: s.requiresApproval,
        config: {},
      })),
      // A straight chain: each stage feeds the next.
      edges: stages.slice(1).map((s, i) => ({ from: stages[i].id, to: s.id })),
    });

  const results = data?.results ?? [];

  return (
    <Shell
      icon="⇉"
      title="Pipeline Builder"
      subtitle="Compose the SDLC an agent must follow for every feature"
      error={error}
      onDismissError={clearError}
      actions={
        <Button size="sm" variant="ghost" loading={busy === 'list_pipeline_nodes'} onClick={() => run('list_pipeline_nodes')}>
          Reload catalog
        </Button>
      }
    >
      {!catalog.length ? (
        <Empty
          icon="⇉"
          title="Node catalog not loaded"
          hint={
            <>
              Call <code>list_pipeline_nodes</code> to load the available stages.
            </>
          }
        />
      ) : (
        <>
          <Card title="Stage palette" aside={<span style={{ fontSize: 11, color: 'var(--bx-fg-faint)' }}>click to append</span>}>
            <div className="bx-btn-row">
              {catalog.map((node) => (
                <button
                  key={node.type}
                  className="bx-btn"
                  data-size="sm"
                  title={`${node.description}${node.backingTool ? `\n\nBacking tool: ${node.backingTool}` : ''}`}
                  onClick={() => add(node.type)}
                >
                  <span
                    className="bx-dot"
                    data-tone={CATEGORY_TONE[node.category]}
                    style={{ display: 'inline-block', marginTop: 0, marginRight: 6, verticalAlign: 'middle' }}
                  />
                  {node.label}
                  {node.sideEffecting ? <span style={{ marginLeft: 5, opacity: 0.6 }}>⚡</span> : null}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', marginTop: 8 }}>
              ⚡ marks a stage with real side effects. Those are planned and shown to you, never executed
              automatically.
            </div>
          </Card>

          <Card
            title="Pipeline"
            aside={<Badge tone={stages.length ? 'accent' : 'neutral'}>{stages.length} stage(s)</Badge>}
          >
            <div className="bx-field">
              <label className="bx-label" htmlFor="pipeline-name">
                Name
              </label>
              <input
                id="pipeline-name"
                className="bx-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {!stages.length ? (
              <div style={{ fontSize: 12, color: 'var(--bx-fg-mute)', padding: '10px 0' }}>
                Empty. Add stages from the palette above.
              </div>
            ) : (
              <div className="bx-list">
                {stages.map((stage, index) => {
                  const descriptor = catalog.find((n) => n.type === stage.type);
                  return (
                    <div className="bx-item" key={stage.id}>
                      <span
                        style={{
                          fontFamily: 'var(--bx-mono)',
                          fontSize: 11,
                          color: 'var(--bx-fg-faint)',
                          flex: 'none',
                          minWidth: 18,
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className="bx-item-main">
                        <div className="bx-item-t">
                          {descriptor?.label ?? stage.type}
                          {descriptor?.sideEffecting ? (
                            <Badge tone="warn">
                              <span>side effect</span>
                            </Badge>
                          ) : null}
                          {stage.requiresApproval ? <Badge tone="accent">approval gate</Badge> : null}
                        </div>
                        <div className="bx-item-d">{descriptor?.description}</div>
                      </div>
                      <div className="bx-btn-row" style={{ flex: 'none' }}>
                        <Button size="sm" variant="ghost" onClick={() => move(index, -1)}>
                          ↑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => move(index, 1)}>
                          ↓
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleApproval(index)}>
                          {stage.requiresApproval ? 'ungate' : 'gate'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(index)}>
                          ✕
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="bx-btn-row" style={{ marginTop: 11 }}>
              <Button
                variant="primary"
                disabled={!stages.length || !name.trim()}
                loading={busy === 'save_pipeline'}
                onClick={save}
              >
                Save pipeline
              </Button>
              <Button variant="ghost" onClick={() => setStages([])} disabled={!stages.length}>
                Clear
              </Button>
            </div>

            {data?.saved && data.executionOrder ? (
              <Note tone="ok">
                Saved. Execution order: <code>{data.executionOrder.join(' → ')}</code>
              </Note>
            ) : null}
          </Card>

          <Card title="Run against a feature request">
            <div className="bx-field">
              <label className="bx-label" htmlFor="pipeline-task">
                Feature request
              </label>
              <input
                id="pipeline-task"
                className="bx-input"
                value={task}
                onChange={(e) => setTask(e.target.value)}
              />
            </div>
            <Button
              variant="primary"
              disabled={!task.trim()}
              loading={busy === 'run_pipeline'}
              onClick={() => run('run_pipeline', { task, pipeline_name: name })}
            >
              Run pipeline
            </Button>
          </Card>

          {results.length ? (
            <>
              <Stats
                items={[
                  { label: 'Stages', value: results.length },
                  { label: 'Executed', value: data?.executed ?? 0, tone: 'ok' },
                  { label: 'Planned only', value: data?.planned ?? 0, tone: 'warn' },
                ]}
              />
              <Card title={`Run output — ${data?.task ?? ''}`}>
                <div className="bx-list">
                  {results.map((result) => (
                    <div className="bx-item" key={result.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span
                          className="bx-dot"
                          data-tone={
                            result.status === 'ok'
                              ? 'ok'
                              : result.status === 'paused'
                                ? 'warn'
                                : result.status === 'planned'
                                  ? 'accent'
                                  : 'neutral'
                          }
                          style={{ marginTop: 0 }}
                        />
                        <strong style={{ fontSize: 12.5 }}>{result.label}</strong>
                        <Badge tone={result.executed ? 'ok' : 'warn'}>
                          {result.executed ? 'executed' : 'planned only'}
                        </Badge>
                      </div>
                      <pre className="bx-pre" style={{ whiteSpace: 'pre-wrap', maxHeight: 180 }}>
                        {result.output}
                      </pre>
                    </div>
                  ))}
                </div>
                {data?.note ? <Note tone="warn">{data.note}</Note> : null}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Shell>
  );
}
