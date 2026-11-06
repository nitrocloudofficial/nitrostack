// Generates src/widgets/components/Logo.tsx. No dependencies. Run: node scripts/make-logo.mjs
//
// The mark: a VERTICAL cocoon (tall segmented oval) left of the axis, a straight vertical line as the axis, and to the
// RIGHT of the line only the right half of a butterfly wing in top view (forewing: larger upper lobe, hindwing: smaller
// lower lobe, vein lines). Deliberate wabi-sabi: the cocoon leans two degrees, its segments are unevenly spaced, one
// vein stops short, a short stretch of the hindwing outline is missing, the axis does not reach the bottom edge.
//
// Method: vector shapes -> tone field (0 = paper, 1 = ink, supersampled) -> 1-bit ORDERED DITHER with a Bayer 8x8
// matrix -> horizontal pixel runs merged into rectangles -> one <path> in an inline SVG, shape-rendering crispEdges,
// fill currentColor so it takes the theme text colour. Static: no animation, no filters, no external requests.
// The 16 and 24 px versions are NOT dithered: a solid simplified silhouette (dither is noise at that size).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const BAYER8 = (() => {
  // Bayer matrix by recursive construction: B(2n) = [[4B, 4B+2], [4B+3, 4B+1]].
  let m = [[0]];
  for (let n = 1; n < 8; n *= 2) {
    const s = m.length;
    const out = Array.from({ length: s * 2 }, () => new Array(s * 2));
    for (let y = 0; y < s; y++)
      for (let x = 0; x < s; x++) {
        const v = 4 * m[y][x];
        out[y][x] = v;
        out[y][x + s] = v + 2;
        out[y + s][x] = v + 3;
        out[y + s][x + s] = v + 1;
      }
    m = out;
  }
  return m;
})();

// ---- geometry in a 64 x 64 design grid (y down) ----
const AXIS_X = 29.6;
const COCOON = { cx: 16.2, cy: 33, rx: 9.2, ry: 25.5, tilt: (-2 * Math.PI) / 180 };
const SEGMENTS = [11.5, 17.8, 24.9, 31.2, 38.4, 44.1, 50.6]; // uneven on purpose

// Closed Catmull-Rom spline through the points, as a dense polygon.
function spline(pts, per = 14) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      ]);
    }
  }
  return out;
}
const FORE = spline([[32.6, 30.5], [34.5, 21.5], [40, 12], [48.5, 5.4], [57.5, 2.6], [61.2, 4.4], [60.4, 12.5], [57.2, 21], [51.5, 27.4], [43, 31.6], [36, 33.2]]);
const HIND = spline([[32.6, 31.5], [41, 34.8], [48.4, 39.6], [51.4, 46.8], [48.2, 54], [41.6, 58.6], [35.4, 58], [32.8, 51]]);
const FORE_VEINS = [
  [[32.8, 30.6], [41, 24], [50, 13.6], [57.6, 4.6]],
  [[32.8, 31], [45, 26.4], [55, 19], [60, 10]],
  [[32.8, 31.4], [46, 30.4], [54, 26]],
  [[32.8, 30], [37, 19.5], [43, 10.8], [49, 6.2]],
  [[40.5, 25.5], [43, 31]] // short cross vein
];
const HIND_VEINS = [
  [[32.8, 32.4], [43, 39.4], [49.6, 46.4]],
  [[32.8, 32.8], [41.6, 47], [39.6, 56.4]],
  [[32.8, 32.6], [45.6, 45.4]] // stops short on purpose
];
const GAP = { x: 50.6, y: 44.2, r: 2.1 }; // missing stretch of the hindwing outline

const inPoly = (poly, x, y) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const distSeg = (x, y, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
};
const distPoly = (poly, x, y) => {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) d = Math.min(d, distSeg(x, y, poly[i], poly[(i + 1) % poly.length]));
  return d;
};
const distLines = (lines, x, y) => {
  let d = Infinity;
  for (const l of lines) for (let i = 0; i < l.length - 1; i++) d = Math.min(d, distSeg(x, y, l[i], l[i + 1]));
  return d;
};
const smooth = (a, b, v) => {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Ellipse (tilted) -> normalised coordinates u (-1 left .. 1 right), v (-1 top .. 1 bottom), radius r.
function cocoonUV(x, y) {
  const dx = x - COCOON.cx, dy = y - COCOON.cy;
  const c = Math.cos(-COCOON.tilt), s = Math.sin(-COCOON.tilt);
  const px = dx * c - dy * s, py = dx * s + dy * c;
  return { u: px / COCOON.rx, v: py / COCOON.ry, px, py };
}

// Tone at a point of the 64 grid for the DITHERED mark. 0 paper .. 1 ink. Later layers paint over earlier ones.
function toneDetail(x, y) {
  let t = 0;
  // hindwing (under the forewing)
  if (inPoly(HIND, x, y)) {
    const e = distPoly(HIND, x, y);
    t = 0.08 + 0.4 * (1 - smooth(0, 7, e)); // darker near the margin, airy in the middle
    if (distLines(HIND_VEINS, x, y) < 0.55) t = 1;
  }
  const hindEdge = distPoly(HIND, x, y) < 0.85 && Math.hypot(x - GAP.x, y - GAP.y) > GAP.r;
  if (hindEdge && (inPoly(HIND, x, y) || distPoly(HIND, x, y) < 0.5)) t = 1;
  // forewing
  if (inPoly(FORE, x, y)) {
    const e = distPoly(FORE, x, y);
    t = 0.1 + 0.42 * (1 - smooth(0, 8, e));
    if (distLines(FORE_VEINS, x, y) < 0.55) t = 1;
  }
  if (distPoly(FORE, x, y) < 0.85 && (inPoly(FORE, x, y) || distPoly(FORE, x, y) < 0.5)) t = 1;
  // cocoon
  const { u, v, px, py } = cocoonUV(x, y);
  const r = Math.hypot(u, v);
  if (r <= 1) {
    t = 0.6 - 0.46 * smooth(-1, 1, u); // lit from the right, shaded on the left
    for (const sy of SEGMENTS) {
      const bulge = 1.6 * (1 - u * u); // segment lines arc downwards
      if (Math.abs(y - (sy + bulge)) < 0.6) t = 1;
    }
    // the inner rim: one pixel of ink along the outline, thinner at the top (hand-drawn feel)
    const rim = 0.9 / Math.min(COCOON.rx, COCOON.ry * 0.55);
    if (r > 1 - rim * (1.3 - 0.3 * (1 - v) / 2)) t = 1;
  }
  // the axis
  if (x >= AXIS_X - 0.55 && x <= AXIS_X + 0.55 && y >= 1.2 && y <= 61.2) t = 1;
  return t;
}

// Coverage (0..1) of the SIMPLIFIED solid silhouette at a point (used for 16 and 24 px).
function solidShape(x, y, withCuts) {
  const { u, v } = cocoonUV(x, y);
  if (Math.hypot(u, v) <= 1) {
    if (withCuts) for (const sy of [18, 31, 44]) if (Math.abs(y - (sy + 1.6 * (1 - u * u))) < 1.5) return 0;
    return 1;
  }
  if (x >= AXIS_X - 1.1 && x <= AXIS_X + 1.1 && y >= 1 && y <= 62) return 1;
  if (inPoly(FORE, x, y) || inPoly(HIND, x, y)) return 1;
  return 0;
}

function sampleGrid(n, fn, ss = 4) {
  const k = 64 / n;
  const grid = [];
  for (let j = 0; j < n; j++) {
    const row = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let b = 0; b < ss; b++) for (let a = 0; a < ss; a++) sum += fn((i + (a + 0.5) / ss) * k, (j + (b + 0.5) / ss) * k);
      row.push(sum / (ss * ss));
    }
    grid.push(row);
  }
  return grid;
}

// Merge a boolean grid into maximal rectangles: runs per row, then identical runs on consecutive rows.
function toPath(bits) {
  const n = bits.length;
  const open = new Map(); // "x:w" -> {x,w,y,h}
  const rects = [];
  for (let y = 0; y <= n; y++) {
    const runs = [];
    if (y < n) {
      let x = 0;
      while (x < n) {
        if (!bits[y][x]) { x++; continue; }
        let w = 1;
        while (x + w < n && bits[y][x + w]) w++;
        runs.push([x, w]);
        x += w;
      }
    }
    const next = new Map();
    for (const [x, w] of runs) {
      const key = `${x}:${w}`;
      const prev = open.get(key);
      if (prev) { prev.h++; next.set(key, prev); open.delete(key); }
      else next.set(key, { x, w, y, h: 1 });
    }
    for (const r of open.values()) rects.push(r);
    open.clear();
    for (const [k, r] of next) open.set(k, r);
  }
  return { d: rects.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join(''), count: rects.length };
}

// ---- 64 px dithered ----
const tone64 = sampleGrid(64, toneDetail, 3);
const bits64 = tone64.map((row, y) => row.map((t, x) => t > (BAYER8[y % 8][x % 8] + 0.5) / 64));
const p64 = toPath(bits64);
// ---- 24 and 16 px solid ----
const grid24 = sampleGrid(24, (x, y) => solidShape(x, y, true), 4).map((r) => r.map((c) => c >= 0.5));
const grid16 = sampleGrid(16, (x, y) => solidShape(x, y, false), 4).map((r) => r.map((c) => c >= 0.5));
const p24 = toPath(grid24);
const p16 = toPath(grid16);

if (process.argv.includes('--ascii')) {
  for (const row of bits64) console.log(row.map((b) => (b ? '#' : '.')).join(''));
  for (const g of [grid24, grid16]) { console.log(); for (const row of g) console.log(row.map((b) => (b ? '#' : '.')).join('')); }
}

const out = `// GENERATED by scripts/make-logo.mjs. Do not edit by hand: change the script and run it again.
// One of at most three hand-made art pieces (logo, empty-state wing-vein dither, loading state). Static: no animation.
// The 64 px mark is a 1-bit Bayer 8x8 ordered dither; the 24 and 16 px marks are solid silhouettes.
import React from 'react';

const D64 = '${p64.d}';
const D24 = '${p24.d}';
const D16 = '${p16.d}';

export type LogoProps = { size?: number; title?: string; className?: string };

// Uses currentColor, so the mark takes the text colour of the theme. Sizes up to 16 use the 16 px silhouette, up to 24
// the 24 px one, anything larger the dithered 64 px mark (scale it by whole multiples to keep the pixels crisp).
export function Logo({ size = 64, title, className }: LogoProps) {
  const grid = size <= 16 ? 16 : size <= 24 ? 24 : 64;
  const d = grid === 16 ? D16 : grid === 24 ? D24 : D64;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={\`0 0 \${grid} \${grid}\`}
      shapeRendering="crispEdges"
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}

export default Logo;
`;
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/widgets/components/Logo.tsx');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out);
console.log(`wrote ${target}: 64px ${p64.count} rects (${p64.d.length} chars), 24px ${p24.count}, 16px ${p16.count}`);

// ---- second art piece: the empty-state wing-vein dither (128 x 64, static, deterministic) ----
// A fan of veins from the lower left corner, branching, fading out to the right. Seeded, so the output never changes.
function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry(1907);
const W = 128, H = 64;
const veinLines = [];
function grow(x, y, ang, len, depth) {
  const pts = [[x, y]];
  const steps = Math.floor(len / 3);
  let a = ang;
  const bend = (rnd() - 0.5) * 0.06;
  for (let i = 0; i < steps; i++) {
    a += bend + (rnd() - 0.5) * 0.05;
    x += Math.cos(a) * 3;
    y += Math.sin(a) * 3;
    pts.push([x, y]);
    if (depth < 3 && i > 3 && i < steps - 3 && rnd() < 0.2) grow(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.35 + rnd() * 0.3), len * (0.4 + rnd() * 0.2), depth + 1);
  }
  veinLines.push(pts);
}
for (const deg of [-78, -62, -47, -33, -20, -9, 2]) grow(5, 58, (deg * Math.PI) / 180, 118 - Math.abs(deg + 40) * 0.5, 0);
const toneWing = (x, y) => {
  const d = distLines(veinLines, x, y);
  let t = d < 0.62 ? 1 : 0;
  // the wing margin: a loose arc, drawn lighter so it dithers into dots
  const r = Math.hypot(x - 5, y - 58);
  if (Math.abs(r - 112) < 0.9) t = Math.max(t, 0.45);
  return t * (1 - smooth(0.25, 1, (x - 5) / 118) * 0.85);
};
const toneW = sampleGridWH(W, H, toneWing, 3);
function sampleGridWH(w, h, fn, ss) {
  const rows = [];
  for (let j = 0; j < h; j++) {
    const row = [];
    for (let i = 0; i < w; i++) {
      let sum = 0;
      for (let b = 0; b < ss; b++) for (let a = 0; a < ss; a++) sum += fn(i + (a + 0.5) / ss, j + (b + 0.5) / ss);
      row.push(sum / (ss * ss));
    }
    rows.push(row);
  }
  return rows;
}
const bitsW = toneW.map((row, y) => row.map((t, x) => t > (BAYER8[y % 8][x % 8] + 0.5) / 64));
// toPath assumes a square grid; pad to 128 x 128 would waste memory, so merge on the rectangular grid here.
function toPathRect(bits) {
  const h = bits.length, w = bits[0].length;
  const open = new Map();
  const rects = [];
  for (let y = 0; y <= h; y++) {
    const runs = [];
    if (y < h) {
      let x = 0;
      while (x < w) {
        if (!bits[y][x]) { x++; continue; }
        let n = 1;
        while (x + n < w && bits[y][x + n]) n++;
        runs.push([x, n]);
        x += n;
      }
    }
    const next = new Map();
    for (const [x, n] of runs) {
      const key = `${x}:${n}`;
      const prev = open.get(key);
      if (prev) { prev.h++; next.set(key, prev); open.delete(key); } else next.set(key, { x, w: n, y, h: 1 });
    }
    for (const r of open.values()) rects.push(r);
    open.clear();
    for (const [k, r] of next) open.set(k, r);
  }
  return { d: rects.map((r) => `M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`).join(''), count: rects.length };
}
const pW = toPathRect(bitsW);
const wingOut = `// GENERATED by scripts/make-logo.mjs. Do not edit by hand.
// Art piece 2 of 3: the empty-state wing-vein dither. 1-bit Bayer 8x8 ordered dither, static, currentColor.
import React from 'react';

const D = '${pW.d}';

export function WingVeins({ width = 256, className }: { width?: number; className?: string }) {
  return (
    <svg className={className} width={width} height={width / 2} viewBox="0 0 ${W} ${H}" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" focusable="false">
      <path d={D} />
    </svg>
  );
}

export default WingVeins;
`;
writeFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../src/widgets/components/WingVeins.tsx'), wingOut);
console.log(`wrote WingVeins.tsx: ${pW.count} rects`);
