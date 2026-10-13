/**
 * Path templating: collapses concrete access-log paths (e.g. "/orders/10432")
 * into stable templates (e.g. "/orders/{orderId}") by walking a trie of path
 * segments and deciding, at each position, whether its distinct sibling
 * values look like a parameter or a fixed route segment.
 *
 * Pure and deterministic: same input paths always produce the same Map, in
 * the same iteration order, regardless of input ordering (the trie doesn't
 * care what order paths arrive in, and each original path is resolved
 * independently against the finished, fully-annotated trie).
 */

const NUMERIC = /^\d+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBJID = /^[0-9a-f]{24}$/i;
const HASHY = /^[A-Za-z0-9_-]{16,}$/;

const STOPLIST = new Set([
  'api', 'v0', 'v1', 'v2', 'admin', 'internal', 'auth', 'login', 'logout',
  'export', 'health', 'debug', 'search', 'me', 'current', 'latest', 'all',
]);

// Explicit naming dictionary per spec — NOT a generic singularise+Id
// transform. "documents" -> docId and "webhooks" -> hookId are deliberate
// exceptions; any parent not listed here falls back to the generic "id".
const PARAM_NAME_BY_PARENT: Record<string, string> = {
  users: 'userId',
  orders: 'orderId',
  documents: 'docId',
  webhooks: 'hookId',
  invoices: 'invoiceId',
  tenants: 'tenantId',
};

interface TrieNode {
  children: Map<string, TrieNode>;
  /** Set only when this node's children collapse into a single parameter. */
  paramCandidates?: Set<string>;
  /** The literal segment value that leads INTO this node — used to name the param at this node's children. */
  ownKey: string | null;
}

function matchesKnownIdShape(value: string): boolean {
  return NUMERIC.test(value) || UUID.test(value) || OBJID.test(value) || HASHY.test(value);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  // Two EMPTY grandchild sets are not "identical shape" — they're the
  // absence of any shape evidence at all. Treating empty/empty as a perfect
  // match was a real bug: on real traffic (NASA-HTTP), five or more sibling
  // static filenames — genuinely unrelated leaf files like different .GIFs
  // in the same directory — all have empty grandchild sets by construction
  // (nothing follows a leaf file), so every pair trivially "matched" and
  // rule (b) collapsed them into a false {id} parameter. Returning 0 here
  // means a set of leaf siblings needs an actual reason to collapse (rule
  // (a)'s ID-shape check), not just the coincidence of having nothing below
  // them. Legitimate rule-(b) cases (tenant slugs each followed by the same
  // real sub-resources, e.g. "/users", "/orders") are unaffected — their
  // overlap comes from genuinely shared non-empty key sets.
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/**
 * Decides whether a node's children should collapse into a single {param}.
 * Stoplisted values are always excluded from candidacy — see the module
 * comment on why that's a safety net rather than the primary mechanism.
 */
function decideParameterization(children: Map<string, TrieNode>): Set<string> | null {
  const allKeys = [...children.keys()];
  const candidates = allKeys.filter((k) => !STOPLIST.has(k.toLowerCase()));
  if (candidates.length === 0) return null;

  // Rule (a): >60% of distinct candidate values look like a known ID shape.
  const idShapeCount = candidates.filter(matchesKnownIdShape).length;
  if (idShapeCount / candidates.length > 0.6) return new Set(candidates);

  // Rule (b): >=5 distinct candidates whose grandchild key sets are, on
  // average, at least 60% overlapping — this is what catches slug/tenant IDs
  // no regex will match, as long as their subtrees look alike (e.g. every
  // tenant slug is followed by the same set of sub-resources).
  if (candidates.length >= 5) {
    const keySets = candidates.map((k) => new Set(children.get(k)!.children.keys()));
    let total = 0;
    let pairs = 0;
    for (let i = 0; i < keySets.length; i++) {
      for (let j = i + 1; j < keySets.length; j++) {
        total += jaccard(keySets[i], keySets[j]);
        pairs++;
      }
    }
    const avgOverlap = pairs === 0 ? 0 : total / pairs;
    if (avgOverlap >= 0.6) return new Set(candidates);
  }

  return null;
}

function annotate(node: TrieNode): void {
  const candidates = decideParameterization(node.children);
  if (candidates) node.paramCandidates = candidates;
  for (const child of node.children.values()) annotate(child);
}

function paramNameFor(parentSegment: string | null): string {
  if (parentSegment && parentSegment.toLowerCase() in PARAM_NAME_BY_PARENT) {
    return PARAM_NAME_BY_PARENT[parentSegment.toLowerCase()];
  }
  return 'id';
}

function resolvePath(root: TrieNode, segments: string[]): string {
  const usedNames = new Set<string>();
  const out: string[] = [];
  let node = root;
  for (const seg of segments) {
    if (node.paramCandidates?.has(seg)) {
      const base = paramNameFor(node.ownKey);
      let name = base;
      if (usedNames.has(name)) {
        let n = 2;
        while (usedNames.has(`${base}${n}`)) n++;
        name = `${base}${n}`;
      }
      usedNames.add(name);
      out.push(`{${name}}`);
    } else {
      out.push(seg);
    }
    const next = node.children.get(seg);
    if (!next) break; // defensive: shouldn't happen, every path was inserted into this trie
    node = next;
  }
  return '/' + out.join('/');
}

export function templatisePaths(paths: string[]): Map<string, string> {
  const uniquePaths = [...new Set(paths)];
  const segmented = uniquePaths.map((p) => ({ orig: p, segs: p.split('/').filter((s) => s.length > 0) }));

  const root: TrieNode = { children: new Map(), ownKey: null };
  for (const { segs } of segmented) {
    let node = root;
    for (const seg of segs) {
      let next = node.children.get(seg);
      if (!next) {
        next = { children: new Map(), ownKey: seg };
        node.children.set(seg, next);
      }
      node = next;
    }
  }

  annotate(root);

  const result = new Map<string, string>();
  for (const { orig, segs } of segmented) {
    result.set(orig, resolvePath(root, segs));
  }
  return result;
}
