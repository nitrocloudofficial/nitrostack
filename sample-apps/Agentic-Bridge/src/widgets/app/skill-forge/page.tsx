'use client';

/**
 * Skill Forge — mint a new MCP tool and watch it register on the live server.
 *
 * The presets are the demo: each one is a genuinely useful tool for the bundled
 * Aurora fixture that no generic MCP server could offer, because it encodes
 * something specific to that codebase.
 */

import { useState } from 'react';
import { Badge, Button, Card, Empty, Note, Pre, Shell, Stats, useBridgeTool } from '../../lib/ui';

interface GeneratedSkill {
  name: string;
  description: string;
  rationale: string;
  params: { name: string; type: string; description: string; required: boolean }[];
  sourceFile: string;
  registered: boolean;
  createdAt: string;
}

interface Payload {
  skillCount?: number;
  skills?: GeneratedSkill[];
  generated?: boolean;
  registeredLive?: boolean;
  sourceFile?: string;
  message?: string;
  skill?: GeneratedSkill;
  dryRun?: boolean;
  valid?: boolean;
  generationEnabled?: boolean;
}

interface Preset {
  label: string;
  name: string;
  description: string;
  rationale: string;
  body: string;
}

const PRESETS: Preset[] = [
  {
    label: 'AuroraORM call sites',
    name: 'query_aurora_orm_usage',
    description:
      'Finds every call site of the legacy AuroraORM fluent chain and reports which database tables the codebase actually touches.',
    rationale:
      'AuroraORM is a hand-rolled 2009 mapper with no modern equivalent. Agents need a safe, ' +
      'structured way to see how it is used before changing anything near it.',
    body: `const hits = api.grep("Orm\\\\.q\\\\(");
const tables = {};
for (const hit of hits) {
  const match = hit.text.match(/Orm\\.q\\(\\s*['"]([A-Z_]+)['"]/);
  if (match) tables[match[1]] = (tables[match[1]] || 0) + 1;
}
return {
  callSites: hits.length,
  tables,
  files: [...new Set(hits.map(h => h.path))],
  hits: hits.slice(0, 25)
};`,
  },
  {
    label: 'Raw SQL escape hatches',
    name: 'find_orm_bypasses',
    description:
      'Detects direct oracledb usage outside server/db/, which the contributing guide forbids and reviewers reject.',
    rationale:
      'CONTRIBUTING.md mandates that all data access go through the ORM. This makes the rule ' +
      'machine-checkable instead of relying on a reviewer noticing.',
    body: `const hits = api.grep("oracledb");
const violations = hits.filter(h => !h.path.startsWith('server/db/'));
return {
  compliant: violations.length === 0,
  totalUsages: hits.length,
  violations,
  rule: 'All database access must go through server/db/aurora-orm.js'
};`,
  },
  {
    label: 'Cache key inventory',
    name: 'list_cache_keys',
    description:
      'Extracts every cache key pattern used against the Memcached wrapper, so a change to the caching layer can be scoped accurately.',
    rationale:
      'Cache keys are built by string concatenation scattered across services. Collecting them ' +
      'is the only way to reason about a cache-layer change safely.',
    body: `const hits = api.grep("cache\\\\.(get|set)");
const files = [...new Set(hits.map(h => h.path))];
const patterns = [];
for (const file of files) {
  const src = api.readFile(file) || '';
  for (const m of src.matchAll(/['"]([a-z]+):['"]?\\s*\\+/gi)) patterns.push(m[1]);
}
return { callSites: hits.length, files, keyNamespaces: [...new Set(patterns)], hits };`,
  },
];

export default function SkillForge() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();
  const [preset, setPreset] = useState<Preset>(PRESETS[0]);
  const [showBody, setShowBody] = useState(false);

  const skills = data?.skills ?? [];

  const mint = (dryRun: boolean) =>
    run('generate_custom_skill', {
      name: preset.name,
      description: preset.description,
      rationale: preset.rationale,
      params: [],
      body: preset.body,
      dry_run: dryRun,
    });

  return (
    <Shell
      icon="⚒"
      title="Skill Forge"
      subtitle="The swarm mints its own MCP tools for this codebase"
      error={error}
      onDismissError={clearError}
      actions={
        <Button size="sm" variant="ghost" loading={busy === 'list_generated_skills'} onClick={() => run('list_generated_skills')}>
          Refresh registry
        </Button>
      }
    >
      <Stats
        items={[
          { label: 'Generated', value: skills.length || (data?.skillCount ?? 0), tone: 'accent' },
          {
            label: 'Live now',
            value: skills.filter((s) => s.registered).length,
            tone: skills.some((s) => s.registered) ? 'ok' : 'neutral',
          },
        ]}
      />

      {data?.generationEnabled === false ? (
        <Note tone="danger">
          Skill generation is disabled via <code>BRIDGE_ALLOW_SKILL_GENERATION</code>. Unset it to enable.
        </Note>
      ) : null}

      <Card title="Mint a skill">
        <div className="bx-field">
          <label className="bx-label" htmlFor="preset">
            Discovery
          </label>
          <select
            id="preset"
            className="bx-select"
            value={preset.name}
            onChange={(e) => setPreset(PRESETS.find((p) => p.name === e.target.value) ?? PRESETS[0])}
          >
            {PRESETS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <code style={{ color: 'var(--bx-accent)' }}>{preset.name}</code>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--bx-fg-mute)', marginBottom: 6 }}>{preset.description}</div>
        <Note>
          <strong>Why the swarm wants this:</strong> {preset.rationale}
        </Note>

        <div className="bx-btn-row" style={{ marginTop: 10 }}>
          <Button variant="primary" loading={busy === 'generate_custom_skill'} onClick={() => mint(false)}>
            Mint &amp; register live
          </Button>
          <Button variant="ghost" loading={busy === 'generate_custom_skill'} onClick={() => mint(true)}>
            Validate only
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowBody((v) => !v)}>
            {showBody ? 'Hide' : 'Show'} implementation
          </Button>
        </div>

        {showBody ? (
          <div style={{ marginTop: 9 }}>
            <Pre>{preset.body}</Pre>
            <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', marginTop: 5 }}>
              Runs against a restricted <code>api</code> — <code>readFile</code>, <code>listFiles</code>,{' '}
              <code>grep</code>, <code>root</code> — all routed through the workspace allow-list. Module
              access, <code>process</code> and network calls are rejected before compilation.
            </div>
          </div>
        ) : null}

        {data?.dryRun ? <Note tone="ok">Spec compiles cleanly. Mint it for real when ready.</Note> : null}

        {data?.generated ? (
          <Note tone={data.registeredLive ? 'ok' : 'warn'}>
            <strong>{data.message}</strong>
            {data.sourceFile ? (
              <div style={{ marginTop: 4 }}>
                Source written to <code>{data.sourceFile}</code>
              </div>
            ) : null}
          </Note>
        ) : null}
      </Card>

      {skills.length ? (
        <Card title="Registry">
          <div className="bx-list">
            {skills.map((skill) => (
              <div className="bx-item" key={skill.name}>
                <span className="bx-dot" data-tone={skill.registered ? 'ok' : 'warn'} />
                <div className="bx-item-main">
                  <div className="bx-item-t" style={{ fontFamily: 'var(--bx-mono)' }}>
                    {skill.name}
                  </div>
                  <div className="bx-item-d">{skill.description}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--bx-fg-faint)', marginTop: 3 }}>
                    <code>{skill.sourceFile}</code>
                  </div>
                </div>
                <Badge tone={skill.registered ? 'ok' : 'warn'}>
                  {skill.registered ? 'live' : 'next boot'}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Empty
          icon="⚒"
          title="No skills minted yet"
          hint="Pick a discovery above and mint it — the new tool appears in your client's tool list immediately."
        />
      )}
    </Shell>
  );
}
