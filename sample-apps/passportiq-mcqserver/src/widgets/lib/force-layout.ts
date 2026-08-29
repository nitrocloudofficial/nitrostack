/**
 * Deterministic graph layout.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT A FORCE SIMULATION
 * ---------------------------------------------------------------------------
 * The obvious choice is a d3-style velocity Verlet force simulation. It is wrong
 * here for two reasons:
 *
 *  1. A force sim needs a random or arbitrary seed, so the same fraud ring lays
 *     out differently on every render. This graph is EVIDENCE. An officer who
 *     reopens an application, or a supervisor reviewing the same case an hour
 *     later, must see the identical picture — otherwise "the node top-left" in a
 *     case note means nothing and two people describing the same ring disagree.
 *
 *  2. A sim converges over animation frames. Widgets are frequently screenshotted
 *     or rendered into a static frame, which catches the layout mid-flight with
 *     nodes still overlapping.
 *
 * So: a closed-form radial layout, seeded from the subject, followed by a FIXED
 * number of relaxation passes (no randomness, no timing dependency). Same input
 * always produces byte-identical coordinates.
 */

export interface LayoutNode {
  id: string;
  label: string;
  riskLevel: string;
  isSubject: boolean;
  applicantName: string;
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  reason: string;
  severity: string;
  /** Midpoint of the quadratic curve, where the edge caption is anchored. */
  labelX: number;
  labelY: number;
  /** SVG path with a consistent bow so parallel edges never overlap. */
  path: string;
}

interface RawNode {
  nodeId?: string;
  id?: string;
  label?: string;
  riskLevel?: string;
  isSubject?: boolean;
  metadata?: { applicantName?: string };
}

interface RawEdge {
  from?: string;
  source?: string;
  to?: string;
  target?: string;
  reason?: string;
  relationship?: string;
  metadata?: { severity?: string; identifierKind?: string };
}

const RELAX_PASSES = 220;

/**
 * Place nodes inside a `width x height` box.
 *
 * The subject sits at the centre because the whole screen answers one question:
 * "who is this applicant connected to". Peers ring it at a radius that grows with
 * cluster size so a 12-node ring does not collapse into a blob.
 */
export function layoutGraph(
  rawNodes: unknown,
  rawEdges: unknown,
  width: number,
  height: number,
): { nodes: LayoutNode[]; edges: LayoutEdge[] } {
  const nodesIn: RawNode[] = Array.isArray(rawNodes) ? (rawNodes as RawNode[]) : [];
  const edgesIn: RawEdge[] = Array.isArray(rawEdges) ? (rawEdges as RawEdge[]) : [];

  const cx = width / 2;
  const cy = height / 2;

  // Stable identity resolution: the backend emits both `nodeId` and `id`, and
  // both `from/to` and `source/target`. Normalise once, here, so no downstream
  // code has to know about the duplication.
  const norm = nodesIn
    .map((n) => ({
      id: String(n.nodeId ?? n.id ?? ''),
      label: String(n.label ?? n.nodeId ?? n.id ?? ''),
      riskLevel: String(n.riskLevel ?? 'low'),
      isSubject: n.isSubject === true,
      applicantName: String(n.metadata?.applicantName ?? stripId(String(n.label ?? ''))),
    }))
    .filter((n) => n.id.length > 0);

  if (norm.length === 0) return { nodes: [], edges: [] };

  // Subject first, then id-sorted peers. Sorting is what makes the layout
  // reproducible regardless of the order the backend happened to emit.
  const subjectIdx = norm.findIndex((n) => n.isSubject);
  const subject = subjectIdx >= 0 ? norm[subjectIdx] : norm[0];
  const peers = norm.filter((n) => n.id !== subject.id).sort((a, b) => a.id.localeCompare(b.id));

  const radius = Math.min(width, height) * (peers.length <= 3 ? 0.3 : 0.36);

  const placed: LayoutNode[] = [{ ...subject, x: cx, y: cy }];
  peers.forEach((p, i) => {
    // -90deg start puts the first peer directly above the subject, which reads
    // as a deliberate diagram rather than an arbitrary rotation.
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / Math.max(peers.length, 1);
    placed.push({ ...p, x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  });

  relax(placed, cx, cy, width, height);

  const index = new Map(placed.map((n) => [n.id, n]));

  // Count edges per unordered pair so the Nth edge between the same two nodes
  // bows further out. Without this, a pair sharing a phone AND an address draws
  // two identical lines and one caption hides the other.
  const pairSeen = new Map<string, number>();

  const edges: LayoutEdge[] = [];
  for (const e of edgesIn) {
    const from = String(e.from ?? e.source ?? '');
    const to = String(e.to ?? e.target ?? '');
    const a = index.get(from);
    const b = index.get(to);
    if (!a || !b || a === b) continue;

    const key = [from, to].sort().join('|');
    const nth = pairSeen.get(key) ?? 0;
    pairSeen.set(key, nth + 1);

    const geo = curve(a.x, a.y, b.x, b.y, nth);
    edges.push({
      from,
      to,
      reason: String(e.reason ?? e.metadata?.identifierKind ?? e.relationship ?? 'linked'),
      severity: String(e.metadata?.severity ?? 'medium'),
      labelX: geo.labelX,
      labelY: geo.labelY,
      path: geo.path,
    });
  }

  return { nodes: placed, edges };
}

/**
 * Fixed-iteration relaxation: mutual repulsion, a weak pull to centre, and hard
 * clamping inside the viewport. No velocity, no damping schedule, no RNG — this
 * is a deterministic function of the seeded positions.
 */
function relax(nodes: LayoutNode[], cx: number, cy: number, width: number, height: number): void {
  const pad = 62; // avatar radius + caption height, so nothing clips the frame
  const minDist = 118; // avatar diameter + breathing room

  for (let pass = 0; pass < RELAX_PASSES; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.isSubject) continue; // the subject is pinned; it anchors the diagram

      let dx = 0;
      let dy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        let ox = a.x - b.x;
        let oy = a.y - b.y;
        let d = Math.sqrt(ox * ox + oy * oy);
        if (d < 0.01) {
          // Exactly coincident nodes have no gradient to follow. Nudge along a
          // deterministic axis derived from the index so the result is stable.
          ox = (i % 2 === 0 ? 1 : -1) * 0.5;
          oy = (i % 3 === 0 ? 1 : -1) * 0.5;
          d = 0.7;
        }
        if (d < minDist) {
          const push = (minDist - d) / d * 0.5;
          dx += ox * push;
          dy += oy * push;
        }
      }

      dx += (cx - a.x) * 0.012;
      dy += (cy - a.y) * 0.012;

      a.x = clamp(a.x + dx * 0.5, pad, width - pad);
      a.y = clamp(a.y + dy * 0.5, pad, height - pad);
    }
  }
}

function curve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  nth: number,
): { path: string; labelX: number; labelY: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  // Perpendicular offset. Alternating sign keeps a bundle of parallel edges
  // spread symmetrically around the straight line instead of drifting one way.
  const bow = 26 + nth * 30;
  const sign = nth % 2 === 0 ? 1 : -1;
  const px = (-dy / len) * bow * sign;
  const py = (dx / len) * bow * sign;

  const qx = mx + px;
  const qy = my + py;

  return {
    path: `M ${r(x1)} ${r(y1)} Q ${r(qx)} ${r(qy)} ${r(x2)} ${r(y2)}`,
    // The caption sits on the curve itself (t=0.5 of a quadratic Bézier is the
    // midpoint of control-point and chord), not on the chord — otherwise labels
    // float off strongly bowed edges.
    labelX: r(0.25 * x1 + 0.5 * qx + 0.25 * x2),
    labelY: r(0.25 * y1 + 0.5 * qy + 0.25 * y2),
  };
}

function r(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function stripId(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim() || label;
}
