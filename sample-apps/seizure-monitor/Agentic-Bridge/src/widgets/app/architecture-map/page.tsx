'use client';

/**
 * Architecture Map — the Structural Cartographer's output.
 */

import { useState } from 'react';
import { Badge, Button, Card, Empty, Meter, Note, Pre, Shell, Stats, useBridgeTool } from '../../lib/ui';
import type { Tone } from '../../lib/ui';

interface Payload {
  target: string;
  fileCount: number;
  nodeCount?: number;
  truncated: boolean;
  truncationReason?: string;
  languages: Record<string, number>;
  layers: Record<string, number>;
  hotspots: { path: string; inbound: number; layer: string }[];
  tree: string;
  entryPoints: string[];
  cycles: string[][];
  // find_change_surface shares this widget
  seeds?: string[];
  impacted?: { path: string; depth: number; layer: string; reason: string }[];
  summary?: string;
  note?: string;
}

const LAYER_TONE: Record<string, Tone> = {
  route: 'accent',
  service: 'ok',
  'data-access': 'danger',
  middleware: 'warn',
  'ui-component': 'accent',
  'ui-view': 'accent',
  config: 'neutral',
  test: 'ok',
  batch: 'warn',
  docs: 'neutral',
  other: 'neutral',
};

export default function ArchitectureMap() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();
  const [query, setQuery] = useState('aurora-orm');

  if (!data) {
    return (
      <Shell icon="▦" title="Architecture Map" subtitle="Structural Cartographer" error={error}>
        <Empty
          icon="▦"
          title="No map yet"
          hint={
            <>
              Call <code>map_file_dependencies</code> to parse the target into a dependency graph.
            </>
          }
        />
      </Shell>
    );
  }

  const layers = Object.entries(data.layers ?? {}).sort((a, b) => b[1] - a[1]);
  const languages = Object.entries(data.languages ?? {}).sort((a, b) => b[1] - a[1]);
  const maxLayer = Math.max(1, ...layers.map(([, n]) => n));
  const maxInbound = Math.max(1, ...(data.hotspots ?? []).map((h) => h.inbound));

  return (
    <Shell
      icon="▦"
      title="Architecture Map"
      subtitle={`${data.fileCount ?? data.nodeCount ?? 0} files · ${data.target ?? ''}`}
      error={error}
      onDismissError={clearError}
      actions={
        <Button size="sm" variant="ghost" loading={busy === 'map_file_dependencies'} onClick={() => run('map_file_dependencies')}>
          Re-scan
        </Button>
      }
    >
      {data.truncated ? (
        <Note tone="warn">
          Traversal was capped — {data.truncationReason}. The map is partial. Raise the limit in
          WorkspaceService, or point at a narrower subtree.
        </Note>
      ) : null}

      <Stats
        items={[
          { label: 'Files', value: data.fileCount ?? data.nodeCount ?? 0 },
          { label: 'Layers', value: layers.length, tone: 'accent' },
          { label: 'Entry points', value: data.entryPoints?.length ?? 0 },
          {
            label: 'Cycles',
            value: data.cycles?.length ?? 0,
            tone: data.cycles?.length ? 'danger' : 'ok',
          },
        ]}
      />

      {layers.length ? (
        <Card title="Layer distribution">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {layers.map(([layer, count]) => (
              <div key={layer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 3 }}>
                  <span>{layer}</span>
                  <code style={{ color: 'var(--bx-fg-mute)' }}>{count}</code>
                </div>
                <Meter value={count / maxLayer} tone={LAYER_TONE[layer] ?? 'neutral'} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {data.hotspots?.length ? (
        <Card
          title="Blast radius"
          aside={<span style={{ fontSize: 11, color: 'var(--bx-fg-faint)' }}>inbound dependencies</span>}
        >
          <div className="bx-list">
            {data.hotspots.map((hotspot) => (
              <div className="bx-item" key={hotspot.path}>
                <span className="bx-dot" data-tone={LAYER_TONE[hotspot.layer] ?? 'neutral'} />
                <div className="bx-item-main">
                  <div className="bx-item-t" style={{ fontFamily: 'var(--bx-mono)', fontSize: 11.5 }}>
                    {hotspot.path}
                  </div>
                  <div style={{ marginTop: 5 }}>
                    <Meter value={hotspot.inbound / maxInbound} tone="danger" />
                  </div>
                </div>
                <div style={{ flex: 'none', textAlign: 'right' }}>
                  <Badge tone="neutral">{hotspot.layer}</Badge>
                  <div style={{ fontFamily: 'var(--bx-mono)', fontSize: 11, marginTop: 3 }}>
                    ←{hotspot.inbound}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card title="Change surface">
        <div style={{ fontSize: 11.5, color: 'var(--bx-fg-mute)', marginBottom: 8 }}>
          Ask what breaks if you touch a file — walks inbound edges transitively.
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <input
            className="bx-input"
            value={query}
            placeholder="filename fragment, symbol or export"
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            variant="primary"
            disabled={!query.trim()}
            loading={busy === 'find_change_surface'}
            onClick={() => run('find_change_surface', { query, max_depth: 3 })}
          >
            Trace
          </Button>
        </div>

        {data.seeds?.length ? (
          <div style={{ marginTop: 11 }}>
            <div style={{ fontSize: 11.5, marginBottom: 6 }}>
              <strong>Seeds:</strong>{' '}
              {data.seeds.map((s) => (
                <code key={s} style={{ marginRight: 6 }}>
                  {s}
                </code>
              ))}
            </div>
            {data.impacted?.length ? (
              <div className="bx-list">
                {data.impacted.map((item) => (
                  <div className="bx-item" key={item.path}>
                    <span className="bx-dot" data-tone={LAYER_TONE[item.layer] ?? 'neutral'} />
                    <div className="bx-item-main">
                      <div className="bx-item-t" style={{ fontFamily: 'var(--bx-mono)', fontSize: 11.5 }}>
                        {item.path}
                      </div>
                      <div className="bx-item-d">{item.reason}</div>
                    </div>
                    <Badge tone={item.depth === 1 ? 'danger' : item.depth === 2 ? 'warn' : 'neutral'}>
                      depth {item.depth}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Note tone="ok">Nothing else imports it — the change is contained.</Note>
            )}
          </div>
        ) : data.note ? (
          <Note tone="warn">{data.note}</Note>
        ) : null}

        {data.summary ? <Note>{data.summary}</Note> : null}
      </Card>

      {data.cycles?.length ? (
        <Card title="Import cycles">
          <div className="bx-list">
            {data.cycles.map((cycle) => (
              <div className="bx-item" key={cycle.join('|')}>
                <span className="bx-dot" data-tone="danger" />
                <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{cycle.join('  →  ')}</code>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {languages.length ? (
        <Card title="Languages">
          <div className="bx-btn-row">
            {languages.map(([language, count]) => (
              <Badge key={language} tone="neutral">
                {language} · {count}
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      {data.tree ? (
        <Card title="Directory tree">
          <Pre>{data.tree}</Pre>
        </Card>
      ) : null}
    </Shell>
  );
}
