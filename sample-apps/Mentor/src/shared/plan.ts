// ─────────────────────────────────────────────────────────────────────────────
// GENERATED FILE — do not edit here.
//
// The original is shared/plan.ts at the monorepo root. Three deployed services
// need the same copy of the bridge contracts, and each deploys as a lone folder,
// so the file is duplicated and the duplication is guarded:
//
//   npm run sync:shared            regenerate every copy
//   npm run sync:shared -- --check fail if any copy has drifted (runs in verify)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The PLAN half of MENTOR's input — `lumina.plan/v1`.
 *
 * This is what the student *intended to build*, exported from the Lumina canvas
 * (`lumina/export_plan.py`) before they wrote any code. It is the artifact no
 * other tool in this space has, and it's the reason MENTOR can answer "when did
 * I go wrong" rather than "what's wrong with this code".
 *
 * Parsing is deliberately strict about shape and forgiving about content: a
 * student's half-drawn canvas should still yield a usable plan, with the damage
 * described in `warnings`, because refusing to run is a worse outcome than
 * running with stated uncertainty. But a malformed *envelope* throws — silently
 * treating junk as a plan would make MENTOR point at a line for no reason, and
 * `MENTOR-CONCEPT.md` §10 is explicit that a confidently wrong line is worse
 * than useless in education.
 */

export const PLAN_SCHEMA = 'lumina.plan/v1';

export interface PlanNode {
  readonly id: string;
  readonly type: string | null;
  /** What the student called it — the word MENTOR quotes back at them. */
  readonly label: string;
  readonly position: { x: number; y: number };
  readonly data: Record<string, unknown>;
}

export interface PlanEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
}

export interface Plan {
  readonly schema: string;
  readonly name: string;
  readonly nodes: readonly PlanNode[];
  readonly edges: readonly PlanEdge[];
  /** The intended sequence, topologically sorted by the exporter. */
  readonly order: readonly string[];
  readonly entry: readonly string[];
  readonly terminal: readonly string[];
  /** True → `order` is not a real intended sequence. Confidence must reflect this. */
  readonly cyclic: boolean;
  readonly warnings: readonly string[];
}

export class PlanParseError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/**
 * Parse a `lumina.plan/v1` document (object or JSON string).
 *
 * @throws PlanParseError when the envelope is unusable — wrong schema, no nodes
 *   array, or an `order` that doesn't correspond to the nodes.
 */
export function parsePlan(input: unknown): Plan {
  const raw: unknown = typeof input === 'string' ? safeJson(input, 'plan') : input;
  if (!isObj(raw)) throw new PlanParseError('plan must be a JSON object');

  const schema = str(raw.schema);
  if (schema !== PLAN_SCHEMA) {
    throw new PlanParseError(
      `unsupported plan schema ${JSON.stringify(schema || '(missing)')} — expected ${PLAN_SCHEMA}. ` +
        'Re-export from Lumina with the Plan button.',
    );
  }
  if (!Array.isArray(raw.nodes)) throw new PlanParseError('plan.nodes must be an array');

  const warnings: string[] = [...toStringArray(raw.warnings)];

  const nodes: PlanNode[] = [];
  const seen = new Set<string>();
  for (const n of raw.nodes) {
    if (!isObj(n)) continue;
    const id = str(n.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const pos = isObj(n.position) ? n.position : {};
    nodes.push({
      id,
      type: typeof n.type === 'string' ? n.type : null,
      // Trust the exporter's label, but never let a node go nameless — the
      // explanation reads "you designed <label> after <label>".
      label: str(n.label).trim() || str(n.type).trim() || id,
      position: { x: num(pos.x), y: num(pos.y) },
      data: isObj(n.data) ? n.data : {},
    });
  }

  const edges: PlanEdge[] = [];
  for (const e of Array.isArray(raw.edges) ? raw.edges : []) {
    if (!isObj(e)) continue;
    const source = str(e.source);
    const target = str(e.target);
    // A dangling edge would fabricate a dependency the student never drew.
    if (!seen.has(source) || !seen.has(target)) {
      warnings.push(`ignored edge ${source || '?'}->${target || '?'} — endpoint not on the canvas`);
      continue;
    }
    edges.push({ id: str(e.id) || `${source}->${target}`, source, target });
  }

  const order = toStringArray(raw.order).filter((id) => seen.has(id));
  if (order.length !== nodes.length) {
    // `order` is the whole reason this artifact exists; if it doesn't cover the
    // nodes we cannot make an ordering claim at all.
    throw new PlanParseError(
      `plan.order lists ${order.length} of ${nodes.length} node(s) — it must cover every node exactly once`,
    );
  }

  return {
    schema,
    name: str(raw.name, 'Untitled plan'),
    nodes,
    edges,
    order,
    entry: toStringArray(raw.entry).filter((id) => seen.has(id)),
    terminal: toStringArray(raw.terminal).filter((id) => seen.has(id)),
    cyclic: raw.cyclic === true,
    warnings,
  };
}

/** Node id -> the student's label. */
export function labelOf(plan: Plan, nodeId: string): string {
  return plan.nodes.find((n) => n.id === nodeId)?.label ?? nodeId;
}

/** The intended sequence as labels — what the student said should happen, in order. */
export function plannedLabels(plan: Plan): string[] {
  return plan.order.map((id) => labelOf(plan, id));
}

/**
 * Is there a directed path `from -> ... -> to` in the plan graph?
 *
 * This is how MENTOR separates a real violated dependency from a coincidence of
 * layout. If the student drew `discount -> tax`, building tax first broke a
 * stated intent. If the two sit on unconnected branches, the plan never said
 * which came first and MENTOR has no business claiming drift — so this drives
 * the confidence score rather than just decorating it.
 *
 * @returns `'direct'` for an explicit edge, `'transitive'` for a longer path,
 *   `'none'` if the plan never ordered them.
 */
export function dependencyPath(
  plan: Plan,
  from: string,
  to: string,
): 'direct' | 'transitive' | 'none' {
  if (from === to) return 'none';
  if (plan.edges.some((e) => e.source === from && e.target === to)) return 'direct';

  const adjacency = new Map<string, string[]>();
  for (const e of plan.edges) {
    const list = adjacency.get(e.source);
    if (list) list.push(e.target);
    else adjacency.set(e.source, [e.target]);
  }

  const stack = [from];
  const visited = new Set<string>([from]);
  while (stack.length) {
    const current = stack.pop() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (next === to) return 'transitive';
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return 'none';
}

/**
 * Fraction of node pairs the plan actually commits to an order for.
 *
 * A strict chain (`a->b->c->d`) orders every pair: 1.0 — the student stated a
 * full sequence. Four disconnected boxes order none: 0.0 — `order` is then just
 * canvas position, and "drift" against it is an artefact of layout rather than a
 * broken intent. Everything real sits between.
 */
export function orderDeterminism(plan: Plan): number {
  const n = plan.nodes.length;
  if (n < 2) return 1;
  const totalPairs = (n * (n - 1)) / 2;
  let ordered = 0;
  for (let i = 0; i < plan.order.length; i++) {
    for (let j = i + 1; j < plan.order.length; j++) {
      if (dependencyPath(plan, plan.order[i], plan.order[j]) !== 'none') ordered++;
    }
  }
  return ordered / totalPairs;
}

// ── helpers ────────────────────────────────────────────────────────────────
function safeJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new PlanParseError(
      `${what} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
