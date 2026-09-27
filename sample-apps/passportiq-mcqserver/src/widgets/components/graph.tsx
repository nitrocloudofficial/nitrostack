/**
 * FraudGraph — the linked-applicant reveal.
 *
 * This is the screen the product exists for. One application looks fine in
 * isolation; four applications sharing a phone number, an address and a document
 * image are a coordinated submission. The graph is how that becomes obvious in a
 * second rather than after forty minutes of cross-referencing.
 *
 * WHY A BIPARTITE LAYOUT AND NOT APPLICANT-TO-APPLICANT EDGES
 * ---------------------------------------------------------
 * Drawing an edge between every pair of applicants that shares anything gives
 * n(n-1)/2 edges — six for four applicants, forty-five for ten — and the officer
 * still cannot see WHICH identifier is shared without hovering each one. Routing
 * every link through a labelled hub node ("Phone", "Address", "Document Image")
 * turns the same information into n edges per hub and makes the shared thing the
 * most legible object on screen. It is also literally the truth of the data: the
 * backend's signal index links applications *through* identifiers.
 *
 * WHY THE LAYOUT IS CLOSED-FORM AND NOT FORCE-SIMULATED
 * ---------------------------------------------------
 * A force simulation is animated, non-deterministic and frame-rate dependent. In
 * a widget that means: the graph looks different every mount, a screenshot in a
 * case file cannot be reproduced, and a slow host renders a half-settled tangle.
 * So applicants are placed on a ring by sorted id, and each hub is placed at the
 * centroid of its own applicants, pulled toward the middle. Same input, same
 * pixels, every time — including in the demo.
 *
 * ACCESSIBILITY / PRINT
 * --------------------
 * Risk is encoded three ways (node ring colour, a text badge, and the legend),
 * because this graph gets printed in greyscale and attached to case files.
 */
import React from 'react';
import { COLORS, riskColor, riskSoft } from '../lib/theme.js';
import { asArray, initials, shortId, truncate } from '../lib/format.js';
import { signalIcon } from './icons.jsx';

// ---------------------------------------------------------------------------
// Input normalisation
// ---------------------------------------------------------------------------

interface RawNode {
  nodeId?: string;
  id?: string;
  label?: string;
  kind?: string;
  riskLevel?: string;
  nodeRole?: string;
  isSubject?: boolean;
  metadata?: Record<string, unknown>;
}

interface RawEdge {
  from?: string;
  source?: string;
  to?: string;
  target?: string;
  reason?: string;
  relationship?: string;
  weight?: number;
  metadata?: Record<string, unknown>;
}

interface PlacedNode {
  id: string;
  label: string;
  name: string;
  role: 'applicant' | 'identifier';
  risk: string;
  isSubject: boolean;
  kind: string;
  x: number;
  y: number;
}

interface PlacedEdge {
  id: string;
  from: string;
  to: string;
  reason: string;
  weight: number;
  path: string;
  labelX: number;
  labelY: number;
  color: string;
  /** Identifier links are the interesting ones; structural links are muted. */
  emphasis: boolean;
}

const VIEW_W = 1000;
const VIEW_H = 520;
const APPLICANT_R = 27;
const HUB_R = 21;

function riskLabel(risk: string): string {
  const key = risk.toLowerCase();
  if (key === 'medium') return 'MED';
  if (key === 'high') return 'HIGH';
  if (key === 'low') return 'LOW';
  if (key === 'critical') return 'CRIT';
  return risk.toUpperCase();
}

/**
 * Split a hub label like "reused phone number: +91 98450 12345" into the kind
 * and the actual reused value.
 *
 * The hub is the single authoritative caption for a shared identifier, so it
 * carries both halves: the kind stays readable even when a long value (an
 * address) has to be truncated, and the value is the forensically useful part
 * an officer would quote in a report.
 */
function splitHubLabel(label: string): { kind: string; value: string } {
  const separator = label.indexOf(':');
  if (separator === -1) {
    return { kind: label.replace(/^reused\s+/i, '').trim() || label, value: '' };
  }
  return {
    kind: label.slice(0, separator).replace(/^reused\s+/i, '').trim(),
    value: label.slice(separator + 1).trim(),
  };
}

/**
 * Normalise whatever the tool returned.
 *
 * The backend mirrors every key (`nodeId`/`id`, `from`/`source`), and a widget may
 * also be handed a hand-written sample. Normalising once here means no render code
 * has to branch on shape, and a payload missing a field degrades to a sensible
 * default instead of drawing an edge to `undefined`.
 */
function normalise(rawNodes: unknown, rawEdges: unknown) {
  const nodes = asArray<RawNode>(rawNodes)
    .map((n) => {
      const id = String(n.nodeId ?? n.id ?? '');
      const kind = String(n.kind ?? 'application');
      // nodeRole is authoritative when present; otherwise infer from `kind`,
      // where anything that is not an application/applicant is an identifier.
      const role: 'applicant' | 'identifier' =
        n.nodeRole === 'identifier'
          ? 'identifier'
          : n.nodeRole === 'applicant'
            ? 'applicant'
            : kind === 'application' || kind === 'applicant'
              ? 'applicant'
              : 'identifier';

      const meta = (n.metadata ?? {}) as Record<string, unknown>;
      const name =
        typeof meta['applicantName'] === 'string' && meta['applicantName']
          ? (meta['applicantName'] as string)
          : String(n.label ?? id).replace(/\s*\(.*\)$/, '');

      return {
        id,
        label: String(n.label ?? id),
        name,
        role,
        kind,
        risk: String(n.riskLevel ?? 'low'),
        isSubject: n.isSubject === true,
      };
    })
    .filter((n) => n.id.length > 0);

  const known = new Set(nodes.map((n) => n.id));

  const edges = asArray<RawEdge>(rawEdges)
    .map((e) => ({
      from: String(e.from ?? e.source ?? ''),
      to: String(e.to ?? e.target ?? ''),
      reason: String(e.reason ?? e.relationship ?? 'linked'),
      relationship: String(e.relationship ?? ''),
      weight: typeof e.weight === 'number' ? e.weight : 0.5,
    }))
    // Dropping dangling edges rather than rendering them: a line to a node that
    // does not exist reads as a missing applicant, which is a false accusation.
    .filter((e) => e.from && e.to && e.from !== e.to && known.has(e.from) && known.has(e.to));

  return { nodes, edges };
}

/** Applicants on a ring (subject centre-left), hubs at their shared centroid. */
function layout(
  nodes: ReturnType<typeof normalise>['nodes'],
  edges: ReturnType<typeof normalise>['edges']
): { placed: PlacedNode[]; placedEdges: PlacedEdge[] } {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;

  const applicants = nodes.filter((n) => n.role === 'applicant');
  const hubs = nodes.filter((n) => n.role === 'identifier');

  // Subject first, then peers by id — deterministic ordering is the whole point.
  const subject = applicants.find((n) => n.isSubject) ?? applicants[0];
  const peers = applicants.filter((n) => n.id !== subject?.id).sort((a, b) => a.id.localeCompare(b.id));
  const ordered = subject ? [subject, ...peers] : peers;

  const position = new Map<string, { x: number; y: number }>();
  const placed: PlacedNode[] = [];

  const count = ordered.length;
  const radiusX = count <= 2 ? 250 : count <= 4 ? 320 : 380;
  const radiusY = count <= 2 ? 120 : count <= 4 ? 165 : 195;

  ordered.forEach((node, index) => {
    let x: number;
    let y: number;

    if (count === 1) {
      x = cx;
      y = cy;
    } else {
      // Start at 180° (west) so the subject sits on the left, the way the
      // reference design reads: subject → shared signals → the others.
      const angle = Math.PI + (index * 2 * Math.PI) / count;
      x = cx + radiusX * Math.cos(angle);
      y = cy + radiusY * Math.sin(angle);
    }

    position.set(node.id, { x, y });
    placed.push({ ...node, x, y });
  });

  // Hubs go in a zig-zag band across the middle.
  //
  // The obvious layout — park each hub at the centroid of the applicants it
  // links, then push overlapping ones apart — collapses in the common case.
  // With applicants ringed at N/S/E/W every centroid is the centre, so the
  // separation pass resolves them into a single vertical column at x = cx,
  // which is precisely where the north–south applicant edge runs. The result is
  // a dashed edge drawn straight through every hub caption.
  //
  // A deterministic two-row band instead: ordered by the mean x of the
  // applicants each hub links (so spatial correspondence roughly survives),
  // alternating between an upper and lower row so consecutive captions never
  // sit in the same horizontal strip. Rows are inset from the applicant ring so
  // hub captions cannot reach the east/west applicant captions.
  const hubCentroidX = new Map<string, number>();
  for (const hub of hubs) {
    const attached = edges
      .filter((e) => e.from === hub.id || e.to === hub.id)
      .map((e) => (e.from === hub.id ? e.to : e.from))
      .map((id) => position.get(id))
      .filter((p): p is { x: number; y: number } => p !== undefined);
    hubCentroidX.set(
      hub.id,
      attached.length === 0 ? cx : attached.reduce((s, p) => s + p.x, 0) / attached.length
    );
  }

  const hubOrder = [...hubs].sort((a, b) => {
    const delta = (hubCentroidX.get(a.id) ?? cx) - (hubCentroidX.get(b.id) ?? cx);
    // Tie-break on id so the layout is stable across renders.
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });

  const useTwoRows = hubOrder.length > 2;
  // 0.62 of the applicant ring keeps the band clear of the east/west applicants
  // and their captions.
  const bandHalf = radiusX * 0.62;
  const rowGap = 46;

  hubOrder.forEach((hub, index) => {
    const row = useTwoRows ? index % 2 : 0;
    const slots = useTwoRows
      ? Math.ceil((hubOrder.length - row) / 2)
      : hubOrder.length;
    const slot = useTwoRows ? Math.floor(index / 2) : index;

    // A single hub in a row centres; otherwise spread evenly across the band.
    const x =
      slots <= 1
        ? cx
        : cx - bandHalf + (slot * (bandHalf * 2)) / (slots - 1);
    const y = useTwoRows ? (row === 0 ? cy - rowGap : cy + rowGap) : cy;

    position.set(hub.id, { x, y });
    placed.push({ ...hub, x, y });
  });

  const placedEdges: PlacedEdge[] = edges.map((edge, index) => {
    const a = position.get(edge.from)!;
    const b = position.get(edge.to)!;

    // A consistent perpendicular bow keeps parallel edges (two applicants sharing
    // two identifiers) from drawing exactly on top of each other.
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const bow = (index % 2 === 0 ? 1 : -1) * Math.min(34, len * 0.13);
    const qx = mx + (-dy / len) * bow;
    const qy = my + (dx / len) * bow;

    const emphasis = edge.relationship === 'shares_identifier' || edge.relationship === 'matches';
    const color = emphasis
      ? edge.weight >= 0.75
        ? COLORS.high
        : edge.weight >= 0.5
          ? COLORS.medium
          : COLORS.borderStrong
      : COLORS.border;

    return {
      id: `${edge.from}->${edge.to}-${index}`,
      from: edge.from,
      to: edge.to,
      reason: edge.reason,
      weight: edge.weight,
      path: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
      // Anchor the caption at the true quadratic midpoint, not the chord midpoint,
      // or labels float off curved edges.
      labelX: 0.25 * a.x + 0.5 * qx + 0.25 * b.x,
      labelY: 0.25 * a.y + 0.5 * qy + 0.25 * b.y,
      color,
      emphasis,
    };
  });

  return { placed, placedEdges };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FraudGraph({
  nodes,
  edges,
  selectedId,
  onSelect,
  height = 460,
  /** Animate the identifier links — used while the autopilot is investigating. */
  live = false,
  showLegend = true,
}: {
  nodes: unknown;
  edges: unknown;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  height?: number;
  live?: boolean;
  showLegend?: boolean;
}) {
  const [zoom, setZoom] = React.useState(1);

  const { placed, placedEdges } = React.useMemo(() => {
    const norm = normalise(nodes, edges);
    return layout(norm.nodes, norm.edges);
  }, [nodes, edges]);

  if (placed.length === 0) {
    return (
      <div className="piq-empty">
        No relationship graph yet. Run <strong>build_risk_graph</strong> for this application to
        reveal shared identifiers across the queue.
      </div>
    );
  }

  // Zooming by shrinking the viewBox around the centre keeps the graph centred,
  // which a scale transform on the group would not.
  const vw = VIEW_W / zoom;
  const vh = VIEW_H / zoom;
  const viewBox = `${(VIEW_W - vw) / 2} ${(VIEW_H - vh) / 2} ${vw} ${vh}`;

  const applicants = placed.filter((n) => n.role === 'applicant');
  const hubs = placed.filter((n) => n.role === 'identifier');

  return (
    <div className="piq-graph-wrap" style={{ height }}>
      <svg
        className="piq-graph-svg"
        viewBox={viewBox}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Relationship graph: ${applicants.length} applications linked through ${hubs.length} shared identifiers`}
      >
        <defs>
          <pattern id="piq-dots" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="1.2" fill={COLORS.border} />
          </pattern>
          <filter id="piq-node-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0F172A" floodOpacity="0.13" />
          </filter>
        </defs>

        <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="url(#piq-dots)" opacity="0.55" />

        {/* Edges first so nodes always sit on top of their own connections. */}
        <g>
          {placedEdges.map((edge) => (
            <path
              key={edge.id}
              d={edge.path}
              fill="none"
              stroke={edge.color}
              strokeWidth={edge.emphasis ? 1.6 + edge.weight * 1.4 : 1.2}
              // Dashed = a shared identifier (an inference). Solid = a structural
              // fact (this applicant submitted this application). The distinction
              // matters: one is evidence, the other is bookkeeping.
              strokeDasharray={edge.emphasis ? '6 4' : undefined}
              className={live && edge.emphasis ? 'piq-edge-live' : undefined}
              opacity={edge.emphasis ? 0.95 : 0.6}
            />
          ))}
        </g>

        {/* No per-edge captions.
            In a bipartite hub layout every edge running into a hub reuses the
            same identifier, so an edge caption can only ever repeat what the hub
            already says — and because all edges converge on the hubs, those
            repeated captions land on top of each other in the middle of the
            canvas and turn the centre into unreadable mush. The hub carries the
            one authoritative caption instead; the edge still communicates
            through colour and dash, which the legend decodes. */}

        {/* Identifier hubs — the shared thing, named. */}
        <g>
          {hubs.map((hub) => (
            <g
              key={hub.id}
              className="piq-graph-node"
              onClick={() => onSelect?.(hub.id)}
              filter="url(#piq-node-shadow)"
            >
              <rect
                x={hub.x - HUB_R}
                y={hub.y - HUB_R}
                width={HUB_R * 2}
                height={HUB_R * 2}
                rx="10"
                fill={COLORS.surface}
                stroke={COLORS.borderStrong}
                strokeWidth="1.5"
              />
              <foreignObject
                x={hub.x - 8}
                y={hub.y - 8}
                width="16"
                height="16"
                pointerEvents="none"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLORS.textSecondary,
                    width: 16,
                    height: 16,
                  }}
                >
                  {signalIcon(hub.kind === 'contact' ? hub.label : hub.kind, 15)}
                </div>
              </foreignObject>
              {(() => {
                const kind = truncate(splitHubLabel(hub.label).kind, 20);
                const value = truncate(splitHubLabel(hub.label).value, 22);
                // An opaque plate behind the caption. Edges cross the middle of
                // the canvas by definition, and text sitting directly on a
                // dashed red line is unreadable at any font weight.
                const plateWidth = Math.max(kind.length * 5.6, value.length * 5.4) + 14;
                const plateHeight = value ? 25 : 14;
                return (
                  <g pointerEvents="none">
                    <rect
                      x={hub.x - plateWidth / 2}
                      y={hub.y + HUB_R + 4}
                      width={plateWidth}
                      height={plateHeight}
                      rx="4"
                      fill={COLORS.surface}
                      opacity="0.94"
                    />
                    <text
                      x={hub.x}
                      y={hub.y + HUB_R + 13}
                      textAnchor="middle"
                      style={{
                        fontSize: 9,
                        fontWeight: 750,
                        fill: COLORS.textSecondary,
                        letterSpacing: '.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {kind}
                    </text>
                    {value ? (
                      <text
                        x={hub.x}
                        y={hub.y + HUB_R + 24}
                        textAnchor="middle"
                        style={{
                          fontSize: 9,
                          fontWeight: 600,
                          fill: COLORS.textMuted,
                          fontFamily: 'var(--mono)',
                        }}
                      >
                        {value}
                      </text>
                    ) : null}
                  </g>
                );
              })()}
            </g>
          ))}
        </g>

        {/* Applicant nodes on top — the subjects of the review. */}
        <g>
          {applicants.map((node) => {
            const selected = selectedId === node.id;
            const ring = riskColor(node.risk);
            return (
              <g
                key={node.id}
                className="piq-graph-node"
                onClick={() => onSelect?.(node.id)}
                filter="url(#piq-node-shadow)"
              >
                {/* Selection halo, and a permanent one on the subject so the case
                    under review is never ambiguous. */}
                {(selected || node.isSubject) && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={APPLICANT_R + 6}
                    fill="none"
                    stroke={selected ? COLORS.accent : COLORS.accentBorder}
                    strokeWidth={selected ? 2.4 : 1.6}
                    strokeDasharray={node.isSubject && !selected ? '4 3' : undefined}
                  />
                )}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={APPLICANT_R}
                  fill={riskSoft(node.risk)}
                  stroke={ring}
                  strokeWidth="2.2"
                />
                <text
                  x={node.x}
                  y={node.y + 4.5}
                  textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 750, fill: ring, letterSpacing: '-.01em' }}
                >
                  {initials(node.name)}
                </text>

                <text
                  x={node.x}
                  y={node.y + APPLICANT_R + 15}
                  textAnchor="middle"
                  style={{ fontSize: 11, fontWeight: 650, fill: COLORS.textPrimary }}
                >
                  {truncate(node.name, 20)}
                </text>
                <text
                  x={node.x}
                  y={node.y + APPLICANT_R + 27}
                  textAnchor="middle"
                  style={{ fontSize: 9.5, fontWeight: 600, fill: COLORS.textMuted }}
                >
                  #{shortId(node.id)}
                  {node.isSubject ? ' · subject' : ''}
                </text>

                {/* Risk badge — the text label that survives greyscale. */}
                {(() => {
                  // Never abbreviate by slicing: 'high'.slice(0,3) reads "HIG",
                  // which looks like a rendering fault on the most important
                  // badge in the product. Width is derived from the real label.
                  const label = riskLabel(node.risk);
                  const boxWidth = label.length * 6 + 12;
                  return (
                    <g
                      transform={`translate(${node.x + APPLICANT_R - 6}, ${node.y - APPLICANT_R - 4})`}
                    >
                      <rect
                        x={-boxWidth / 2}
                        y="-8"
                        width={boxWidth}
                        height="15"
                        rx="7.5"
                        fill={ring}
                      />
                      <text
                        x="0"
                        y="2.6"
                        textAnchor="middle"
                        style={{
                          fontSize: 8.5,
                          fontWeight: 750,
                          fill: '#fff',
                          letterSpacing: '.05em',
                        }}
                      >
                        {label}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>
      </svg>

      {showLegend && (
        <div className="piq-legend">
          <span className="piq-legend-item">
            <span className="piq-legend-swatch" style={{ background: COLORS.high }} />
            High
          </span>
          <span className="piq-legend-item">
            <span className="piq-legend-swatch" style={{ background: COLORS.medium }} />
            Medium
          </span>
          <span className="piq-legend-item">
            <span className="piq-legend-swatch" style={{ background: COLORS.low }} />
            Low
          </span>
          <span className="piq-legend-item">
            <svg width="20" height="8" aria-hidden="true">
              <path
                d="M1 4h18"
                stroke={COLORS.high}
                strokeWidth="1.8"
                strokeDasharray="5 3"
                fill="none"
              />
            </svg>
            Shared identifier
          </span>
          <span className="piq-legend-item">
            <svg width="20" height="8" aria-hidden="true">
              <path d="M1 4h18" stroke={COLORS.borderStrong} strokeWidth="1.5" fill="none" />
            </svg>
            Structural
          </span>
        </div>
      )}

      <div className="piq-zoom">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.2).toFixed(2)))}
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
          aria-label="Zoom out"
        >
          −
        </button>
        <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom" title="Reset zoom">
          ⌾
        </button>
      </div>
    </div>
  );
}
