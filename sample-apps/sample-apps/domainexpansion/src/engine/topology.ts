/**
 * Aggregates access-log records into EndpointTemplate summaries and builds
 * the path-trie Topology consumed by the topology_graph widget. Pure: no
 * clock, no randomness — timeRange comes from the records themselves.
 */

import type { AccessLogRecord, EndpointTemplate, PathParam, HttpMethod, Topology, TopologyNode, Finding, Severity } from './types.js';
import { templatisePaths } from './templatise.js';

function extractParams(template: string): PathParam[] {
  return template
    .split('/')
    .filter((s) => s.length > 0)
    .map((seg, position) => ({ seg, position }))
    .filter((x) => x.seg.startsWith('{'))
    .map((x) => ({ name: x.seg.slice(1, -1), position: x.position }));
}

/**
 * Groups raw access-log records by their templatised path. Shared by
 * buildTopology and by callers of diffSpec (spec.ts), which needs this same
 * EndpointTemplate[] shape as its "observed" input.
 */
export function aggregateEndpoints(records: AccessLogRecord[], documentedTemplates: string[]): EndpointTemplate[] {
  const templateMap = templatisePaths(records.map((r) => r.path));
  const documentedSet = new Set(documentedTemplates);

  interface Group {
    methods: Set<HttpMethod>;
    requestCount: number;
    statusCounts: Record<string, number>;
    actors: Set<string>;
    firstSeen: string;
    lastSeen: string;
  }
  const groups = new Map<string, Group>();

  for (const r of records) {
    const template = templateMap.get(r.path);
    if (template === undefined) continue; // defensive; every path was fed into templatisePaths above
    let g = groups.get(template);
    if (!g) {
      g = { methods: new Set(), requestCount: 0, statusCounts: {}, actors: new Set(), firstSeen: r.ts, lastSeen: r.ts };
      groups.set(template, g);
    }
    g.methods.add(r.method);
    g.requestCount++;
    const statusKey = String(r.status);
    g.statusCounts[statusKey] = (g.statusCounts[statusKey] ?? 0) + 1;
    if (r.actor.sub) g.actors.add(r.actor.sub);
    if (r.ts < g.firstSeen) g.firstSeen = r.ts;
    if (r.ts > g.lastSeen) g.lastSeen = r.ts;
  }

  const out: EndpointTemplate[] = [...groups.entries()].map(([template, g]) => ({
    template,
    params: extractParams(template),
    methods: [...g.methods].sort(),
    requestCount: g.requestCount,
    statusCounts: g.statusCounts,
    distinctActors: g.actors.size,
    firstSeen: g.firstSeen,
    lastSeen: g.lastSeen,
    documented: documentedSet.has(template),
  }));

  out.sort((a, b) => a.template.localeCompare(b.template));
  return out;
}

const SEVERITY_RANK: Record<Severity, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
function maxSeverityOf(severities: Severity[]): Severity | null {
  if (severities.length === 0) return null;
  return severities.reduce((max, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[max] ? s : max));
}

export function buildTopology(
  records: AccessLogRecord[],
  documentedTemplates: string[],
  findings?: Finding[],
): Topology {
  const templates = aggregateEndpoints(records, documentedTemplates);
  const documentedSet = new Set(documentedTemplates);

  const nodeById = new Map<string, TopologyNode>();
  const childrenOf = new Map<string, Set<string>>();

  function ensureNode(id: string, depth: number, label: string, isParam: boolean): void {
    if (!nodeById.has(id)) {
      nodeById.set(id, { id, label, depth, isEndpoint: false, isParam, documented: false, requestCount: 0, maxSeverity: null });
    }
  }

  function markLeaf(leafId: string, t: EndpointTemplate): void {
    const leaf = nodeById.get(leafId)!;
    leaf.isEndpoint = true;
    leaf.documented = documentedSet.has(t.template);
    leaf.requestCount = t.requestCount;
    if (findings) {
      const severities = findings.filter((f) => f.template === t.template).map((f) => f.severity);
      leaf.maxSeverity = maxSeverityOf(severities);
    }
  }

  for (const t of templates) {
    const segs = t.template.split('/').filter((s) => s.length > 0);

    // The bare root path ("/") templatises to zero segments — a browser
    // requesting a homepage is extremely common in real traffic (never
    // exercised by our synthetic fixture, which has no root-path request).
    // Give it an explicit root node instead of falling through to an
    // empty `prefix` that was never registered. depth is defined as "number
    // of path segments" throughout this function (segs[i] gets depth i+1
    // below) so the zero-segment root correctly gets depth 0 — not an
    // off-by-one, the same rule applied consistently at n=0.
    if (segs.length === 0) {
      ensureNode('/', 0, '/', false);
      markLeaf('/', t);
      continue;
    }

    let prefix = '';
    let parent: string | null = null;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      prefix = `${prefix}/${seg}`;
      ensureNode(prefix, i + 1, seg, seg.startsWith('{'));
      if (parent !== null) {
        if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
        childrenOf.get(parent)!.add(prefix);
      }
      parent = prefix;
    }
    markLeaf(prefix, t);
  }

  function subtreeTotal(id: string): number {
    const node = nodeById.get(id)!;
    const kids = childrenOf.get(id);
    const childSum = kids ? [...kids].reduce((sum, c) => sum + subtreeTotal(c), 0) : 0;
    return node.requestCount + childSum;
  }

  const edges = [...childrenOf.entries()].flatMap(([from, kids]) =>
    [...kids].map((to) => ({ from, to, weight: subtreeTotal(to) })),
  );

  const nodes = [...nodeById.values()].sort((a, b) => (a.depth !== b.depth ? a.depth - b.depth : a.id.localeCompare(b.id)));
  edges.sort((a, b) => (a.from !== b.from ? a.from.localeCompare(b.from) : a.to.localeCompare(b.to)));

  const observedEndpoints = templates.length;
  const documentedEndpoints = templates.filter((t) => t.documented).length;
  // Prefer R5_SHADOW's own finding set over the naive "not documented"
  // count. With a spec imported these already agree exactly (R5's
  // spec-mode branch IS `!t.documented`), but without one, R5 only flags a
  // heuristic subset (internal/debug/legacy prefixes, low-traffic no-
  // OPTIONS/HEAD endpoints) — the naive count previously called EVERY
  // undocumented endpoint "shadow" even when R5 itself hadn't flagged it,
  // which reads as two different numbers claiming to answer the same
  // question. When findings aren't supplied, fall back to the naive count.
  const shadowEndpoints = findings
    ? new Set(findings.filter((f) => f.rule === 'R5_SHADOW').map((f) => f.template)).size
    : observedEndpoints - documentedEndpoints;
  const distinctActors = new Set(records.map((r) => r.actor.sub).filter((s): s is string => s !== null)).size;

  let from = '';
  let to = '';
  for (const r of records) {
    if (from === '' || r.ts < from) from = r.ts;
    if (to === '' || r.ts > to) to = r.ts;
  }

  return {
    nodes,
    edges,
    stats: {
      observedEndpoints,
      documentedEndpoints,
      shadowEndpoints,
      totalRequests: records.length,
      distinctActors,
      timeRange: { from, to },
    },
  };
}
