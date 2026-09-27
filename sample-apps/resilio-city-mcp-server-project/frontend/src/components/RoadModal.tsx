import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/* ══════════════════════════════════════════════════════════════════
   3D ROAD SIMULATION MODAL
   Uses Canvas 2D with isometric projection to render:
   1. Multi-station cross-section (like the reference image)
   2. Depth layer breakdown
   3. Top-down aerial with critical points
   4. Elevation profile
   5. Emergency Services ETA panel
══════════════════════════════════════════════════════════════════ */

interface RoadProps { properties: Record<string, any>; }
interface Props { road: RoadProps; cityId: string; onClose: () => void; }

type ViewMode = 'stations' | 'crosssection' | 'aerial' | 'elevation' | 'emergency';

// ── Canvas helpers ─────────────────────────────────────────────────────────────
const C = (v: number) => Math.round(v);

// Isometric transform: world (x, y, z) → screen (sx, sy)
function iso(x: number, y: number, z: number, ox: number, oy: number, scale: number) {
  const sx = ox + (x - y) * Math.cos(Math.PI / 6) * scale;
  const sy = oy + (x + y) * Math.sin(Math.PI / 6) * scale - z * scale;
  return { sx: C(sx), sy: C(sy) };
}

// ── Color palette ──────────────────────────────────────────────────────────────
const LAYERS = [
  { label: 'Wearing Course',  color: '#2a2a2a', light: '#3d3d3d', depth: 5,  unit: 'Asphalt' },
  { label: 'Binder Course',   color: '#383838', light: '#4a4a4a', depth: 10, unit: 'Asphalt' },
  { label: 'Base Course',     color: '#6b4e1a', light: '#8b6622', depth: 20, unit: 'Crushed Stone' },
  { label: 'Sub-Base',        color: '#8c6b3a', light: '#a87c45', depth: 35, unit: 'Granular Fill' },
  { label: 'Subgrade',        color: '#5a3d18', light: '#6e4c20', depth: 80, unit: 'Natural Soil' },
];

const DAMAGE_COLORS: Record<string, string> = {
  cracking:       '#ff3b6b',
  pothole:        '#ff7b35',
  rutting:        '#ffd93d',
  edge_break:     '#ff3b6b',
  water_intrusion:'#00d4ff',
  subsidence:     '#bd93f9',
  none:           '#00ff9d',
};

// ── Draw one isometric road station slice ─────────────────────────────────────
function drawStation(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  scale: number,
  label: string,
  damage: string,
  hasCritical: boolean,
  animPhase: number,
  pavement: Record<string, number>,
) {
  const ROAD_W = 10;    // world units wide
  const ROAD_D = 3;     // world units deep (terrain)
  const laneW = ROAD_W / 4;
  const dividerX = ROAD_W / 2;

  // ── Ground / terrain sides ──
  // Left shoulder (grass)
  const grassL = [
    iso(-3, 0, 0, ox, oy, scale),
    iso(0, 0, 0, ox, oy, scale),
    iso(0, ROAD_D, 0, ox, oy, scale),
    iso(-3, ROAD_D, 0, ox, oy, scale),
  ];
  ctx.beginPath();
  ctx.moveTo(grassL[0].sx, grassL[0].sy);
  grassL.forEach(p => ctx.lineTo(p.sx, p.sy));
  ctx.closePath();
  ctx.fillStyle = '#2d4a1e';
  ctx.fill();
  ctx.strokeStyle = '#1a2e10'; ctx.lineWidth = 0.5; ctx.stroke();

  // Right shoulder (grass)
  const grassR = [
    iso(ROAD_W, 0, 0, ox, oy, scale),
    iso(ROAD_W + 3, 0, 0, ox, oy, scale),
    iso(ROAD_W + 3, ROAD_D, 0, ox, oy, scale),
    iso(ROAD_W, ROAD_D, 0, ox, oy, scale),
  ];
  ctx.beginPath();
  ctx.moveTo(grassR[0].sx, grassR[0].sy);
  grassR.forEach(p => ctx.lineTo(p.sx, p.sy));
  ctx.closePath();
  ctx.fillStyle = '#2d4a1e'; ctx.fill();
  ctx.strokeStyle = '#1a2e10'; ctx.lineWidth = 0.5; ctx.stroke();

  // ── Pavement layers (depth cut on left side) ──
  const totalDepth = Object.values(pavement).reduce((a, v) => a + v, 0);
  let curZ = 0;
  LAYERS.forEach((layer, li) => {
    const dPct = (layer.depth / totalDepth);
    const thick = dPct * 2.2; // world units
    const p = [
      iso(0, 0, -curZ, ox, oy, scale),
      iso(ROAD_W, 0, -curZ, ox, oy, scale),
      iso(ROAD_W, 0, -(curZ + thick), ox, oy, scale),
      iso(0, 0, -(curZ + thick), ox, oy, scale),
    ];
    ctx.beginPath();
    ctx.moveTo(p[0].sx, p[0].sy);
    p.forEach(pt => ctx.lineTo(pt.sx, pt.sy));
    ctx.closePath();
    ctx.fillStyle = layer.color; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.5; ctx.stroke();
    curZ += thick;
  });

  // ── Road surface top ──
  const road = [
    iso(0, 0, 0, ox, oy, scale),
    iso(ROAD_W, 0, 0, ox, oy, scale),
    iso(ROAD_W, ROAD_D, 0, ox, oy, scale),
    iso(0, ROAD_D, 0, ox, oy, scale),
  ];
  // base asphalt
  ctx.beginPath();
  ctx.moveTo(road[0].sx, road[0].sy);
  road.forEach(p => ctx.lineTo(p.sx, p.sy));
  ctx.closePath();
  const surfaceGrad = ctx.createLinearGradient(road[0].sx, road[0].sy, road[1].sx, road[1].sy);
  surfaceGrad.addColorStop(0, '#282828');
  surfaceGrad.addColorStop(0.5, '#333');
  surfaceGrad.addColorStop(1, '#282828');
  ctx.fillStyle = surfaceGrad; ctx.fill();

  // Lane markings
  [laneW, dividerX, ROAD_W - laneW].forEach((lx, li) => {
    const p1 = iso(lx, 0, 0.05, ox, oy, scale);
    const p2 = iso(lx, ROAD_D, 0.05, ox, oy, scale);
    ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
    ctx.strokeStyle = li === 1 ? '#ffe066' : '#ffffff';
    ctx.lineWidth = li === 1 ? 2.5 : 1.5;
    ctx.setLineDash(li === 1 ? [] : [4, 4]);
    ctx.stroke(); ctx.setLineDash([]);
  });

  // Shoulder lines
  [0.3, ROAD_W - 0.3].forEach(lx => {
    const p1 = iso(lx, 0, 0.05, ox, oy, scale);
    const p2 = iso(lx, ROAD_D, 0.05, ox, oy, scale);
    ctx.beginPath(); ctx.moveTo(p1.sx, p1.sy); ctx.lineTo(p2.sx, p2.sy);
    ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 1; ctx.stroke();
  });

  // Barriers (guard rails)
  [0, ROAD_W].forEach((bx, bi) => {
    const b1 = iso(bx, 0, 0.8, ox, oy, scale);
    const b2 = iso(bx, ROAD_D, 0.8, ox, oy, scale);
    ctx.beginPath(); ctx.moveTo(b1.sx, b1.sy); ctx.lineTo(b2.sx, b2.sy);
    ctx.strokeStyle = '#aaaaaa'; ctx.lineWidth = 2; ctx.stroke();
    // posts
    for (let pyi = 0; pyi <= ROAD_D; pyi += 0.8) {
      const top = iso(bx, pyi, 1.0, ox, oy, scale);
      const bot = iso(bx, pyi, 0, ox, oy, scale);
      ctx.beginPath(); ctx.moveTo(top.sx, top.sy); ctx.lineTo(bot.sx, bot.sy);
      ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  });

  // ── Critical point marker ──
  if (hasCritical) {
    const dmgCol = DAMAGE_COLORS[damage] ?? '#ff3b6b';
    const cx2 = dividerX + Math.sin(animPhase * 2) * 0.5;
    const cp = iso(cx2, ROAD_D / 2, 0.1, ox, oy, scale);
    // glow ring (animated)
    const ring = Math.abs(Math.sin(animPhase)) * 25 + 8;
    const grad = ctx.createRadialGradient(cp.sx, cp.sy, 0, cp.sx, cp.sy, ring);
    grad.addColorStop(0, dmgCol + 'cc');
    grad.addColorStop(0.4, dmgCol + '66');
    grad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(cp.sx, cp.sy, ring, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    // dot
    ctx.beginPath(); ctx.arc(cp.sx, cp.sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = dmgCol; ctx.fill();
    // label
    ctx.fillStyle = dmgCol; ctx.font = 'bold 9px Inter, sans-serif';
    ctx.fillText('⚠', cp.sx - 4, cp.sy - 10);
  }

  // ── Station label ──
  const labelP = iso(ROAD_W / 2, -0.5, 0.1, ox, oy, scale);
  ctx.fillStyle = 'rgba(0,212,255,0.9)';
  ctx.font = 'bold 10px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, labelP.sx, labelP.sy - 8);
  ctx.textAlign = 'left';
}

// ── Draw cross-section depth view ─────────────────────────────────────────────
function drawCrossSection(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  pavement: Record<string, number>,
  damage: string,
  roadName: string,
) {
  ctx.clearRect(0, 0, W, H);

  const startX = 160, endX = W - 60;
  const roadWidth = endX - startX;
  const totalDepthPx = H * 0.6;
  const topY = H * 0.15;

  const totalCm = Object.values(pavement).reduce((a, v) => a + v, 0);
  const layers = [
    { label: 'Wearing Course', cm: pavement.wearing_course_cm ?? 5, color: '#2a2a2a', light: '#4a4a4a' },
    { label: 'Binder Course',  cm: pavement.binder_course_cm ?? 10, color: '#383838', light: '#555' },
    { label: 'Base Course',    cm: pavement.base_course_cm ?? 20,   color: '#6b4e1a', light: '#8b6622' },
    { label: 'Sub-Base',       cm: pavement.subbase_cm ?? 35,       color: '#8c6b3a', light: '#a87c45' },
    { label: 'Subgrade',       cm: pavement.subgrade_cm ?? 80,      color: '#5a3d18', light: '#6e4c20' },
  ];

  let curY = topY;

  layers.forEach((layer, i) => {
    const h = (layer.cm / totalCm) * totalDepthPx;
    // Main fill
    const g = ctx.createLinearGradient(startX, curY, endX, curY);
    g.addColorStop(0, layer.color);
    g.addColorStop(0.5, layer.light);
    g.addColorStop(1, layer.color);
    ctx.fillStyle = g;
    ctx.fillRect(startX, curY, roadWidth, h);

    // Top edge highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(startX, curY, roadWidth, 2);

    // Border
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(startX, curY, roadWidth, h);

    // Dimension line (left)
    const midY = curY + h / 2;
    ctx.beginPath(); ctx.moveTo(startX - 40, curY); ctx.lineTo(startX - 10, curY);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(startX - 40, curY + h); ctx.lineTo(startX - 10, curY + h);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(startX - 25, curY); ctx.lineTo(startX - 25, curY + h);
    ctx.stroke();
    // arrowheads
    [[curY, -1], [curY + h, 1]].forEach(([ay, dir]) => {
      ctx.beginPath();
      ctx.moveTo(startX - 25, ay);
      ctx.lineTo(startX - 28, ay + dir * 4);
      ctx.lineTo(startX - 22, ay + dir * 4);
      ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${layer.cm}cm`, startX - 30, midY + 3);

    // Right label
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(layer.label, endX + 10, midY - 1);
    ctx.fillStyle = 'rgba(160,200,230,0.5)'; ctx.font = '9px Inter, sans-serif';
    ctx.fillText(layer.label === 'Wearing Course' || layer.label === 'Binder Course' ? 'Asphalt' : layer.label === 'Base Course' ? 'Crushed Stone' : layer.label === 'Sub-Base' ? 'Granular Fill' : 'Natural Soil', endX + 10, midY + 12);

    curY += h;
  });

  // Lane markings on surface
  const laneW = roadWidth / 4;
  [startX + laneW, startX + laneW * 2, startX + laneW * 3].forEach((lx, i) => {
    ctx.strokeStyle = i === 1 ? '#ffe066' : '#ffffffaa';
    ctx.lineWidth = i === 1 ? 2 : 1;
    ctx.setLineDash(i === 1 ? [] : [4, 4]);
    ctx.beginPath(); ctx.moveTo(lx, topY); ctx.lineTo(lx, topY + layers[0].cm / totalCm * totalDepthPx);
    ctx.stroke(); ctx.setLineDash([]);
  });

  // Damage overlay
  const dmgCol = DAMAGE_COLORS[damage] ?? '#00ff9d';
  if (damage !== 'none') {
    ctx.fillStyle = dmgCol + '22';
    ctx.fillRect(startX + laneW, topY, laneW, layers[0].cm / totalCm * totalDepthPx + layers[1].cm / totalCm * totalDepthPx);
    ctx.strokeStyle = dmgCol + 'aa'; ctx.lineWidth = 2;
    ctx.strokeRect(startX + laneW, topY, laneW, layers[0].cm / totalCm * totalDepthPx + layers[1].cm / totalCm * totalDepthPx);
    // Label
    ctx.fillStyle = dmgCol; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`⚠ ${damage.replace(/_/g,' ').toUpperCase()}`, startX + laneW * 1.5, topY + 12);
  }

  // Road width dimension (top)
  ctx.strokeStyle = 'rgba(0,212,255,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(startX, topY - 20); ctx.lineTo(endX, topY - 20); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(startX, topY - 25); ctx.lineTo(startX, topY - 15); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(endX, topY - 25); ctx.lineTo(endX, topY - 15); ctx.stroke();
  ctx.fillStyle = 'var(--cyan, #00d4ff)'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
  ctx.fillText('Road Cross-Section', W / 2, topY - 30);
  ctx.font = '9px JetBrains Mono'; ctx.fillStyle = 'rgba(0,212,255,0.7)';
  ctx.fillText(`Width: ~${Math.round(roadWidth / 8)} m (4 lanes)`, W / 2, topY - 18);
  ctx.textAlign = 'left';
}

// ── Draw top-down aerial view ─────────────────────────────────────────────────
function drawAerial(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  damage: string,
  critPts: { x: number; y: number; label: string }[],
  animPhase: number,
) {
  ctx.clearRect(0, 0, W, H);
  const pad = 60;
  const rW = W - pad * 2, rH = 80;
  const roadY = H / 2 - rH / 2;

  // Grass background
  ctx.fillStyle = '#1a3010'; ctx.fillRect(0, 0, W, H);
  // Road
  const rg = ctx.createLinearGradient(pad, roadY, pad, roadY + rH);
  rg.addColorStop(0, '#2e2e2e'); rg.addColorStop(0.5, '#383838'); rg.addColorStop(1, '#2e2e2e');
  ctx.fillStyle = rg; ctx.fillRect(pad, roadY, rW, rH);
  // Shoulders
  ctx.fillStyle = '#1c1c1c'; ctx.fillRect(pad, roadY, rW, 6); ctx.fillRect(pad, roadY + rH - 6, rW, 6);
  // Lane dividers
  const laneH = rH / 4;
  [laneH, laneH * 2, laneH * 3].forEach((ly, i) => {
    ctx.strokeStyle = i === 1 ? '#ffe066' : '#ffffffaa';
    ctx.lineWidth = i === 1 ? 2.5 : 1;
    ctx.setLineDash(i === 1 ? [] : [12, 8]);
    ctx.beginPath(); ctx.moveTo(pad, roadY + ly); ctx.lineTo(pad + rW, roadY + ly); ctx.stroke();
    ctx.setLineDash([]);
  });

  // Road name text
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.font = 'bold 18px Space Grotesk'; ctx.textAlign = 'center';
  ctx.fillText('N →', W / 2, roadY + rH / 2 - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.font = '10px Inter';
  ctx.fillText('← S', W / 2, roadY + rH / 2 + 16);

  // Critical points
  critPts.forEach((pt, i) => {
    const cx = pad + pt.x * rW;
    const cy = roadY + pt.y * rH;
    const dmgCol = DAMAGE_COLORS[damage] ?? '#ff3b6b';
    const r = 12 + Math.abs(Math.sin(animPhase + i)) * 6;
    // Glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r + 10);
    grad.addColorStop(0, dmgCol + 'cc');
    grad.addColorStop(0.4, dmgCol + '55');
    grad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
    // Dot
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fillStyle = dmgCol; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    // Label
    ctx.fillStyle = dmgCol; ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center';
    ctx.fillText(pt.label, cx, cy - 16);
    // Connector line
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 14);
    ctx.strokeStyle = dmgCol + 'aa'; ctx.lineWidth = 1; ctx.stroke();
  });

  // Compass rose
  ctx.save(); ctx.translate(W - 40, 40);
  ['N','E','S','W'].forEach((dir, i) => {
    const ang = (i * Math.PI / 2) - Math.PI / 2;
    ctx.fillStyle = i === 0 ? '#ff3b6b' : 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 9px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dir, Math.cos(ang) * 18, Math.sin(ang) * 18);
  });
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

// ── Draw elevation profile ────────────────────────────────────────────────────
function drawElevation(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  roadAge: number, damage: string,
  critPts: { x: number; label: string }[],
) {
  ctx.clearRect(0, 0, W, H);
  const pad = { l: 60, r: 30, t: 40, b: 50 };
  const gW = W - pad.l - pad.r;
  const gH = H - pad.t - pad.b;

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = pad.t + (i / 5) * gH;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + gW, y); ctx.stroke();
    const val = 250 - (i / 5) * 30;
    ctx.fillStyle = 'rgba(160,200,230,0.4)'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'right';
    ctx.fillText(`${val.toFixed(0)}m`, pad.l - 6, y + 3);
  }
  for (let i = 0; i <= 10; i++) {
    const x = pad.l + (i / 10) * gW;
    ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, pad.t + gH); ctx.stroke();
    ctx.fillStyle = 'rgba(160,200,230,0.4)'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'center';
    ctx.fillText(`${i * 100}m`, x, pad.t + gH + 14);
  }
  ctx.textAlign = 'left';

  // Generate pseudo-realistic terrain elevation
  const pts: { x: number; y: number }[] = [];
  const seed = roadAge * 7;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const elev = 235
      + Math.sin(t * Math.PI * 2 + seed) * 5
      + Math.sin(t * Math.PI * 4 + seed * 0.5) * 3
      + Math.sin(t * Math.PI * 7 + seed * 0.3) * 1.5
      + (damage !== 'none' ? Math.sin(t * Math.PI * 15) * 1.5 : 0);
    pts.push({ x: pad.l + t * gW, y: pad.t + gH - ((elev - 220) / 30) * gH });
  }

  // Fill under curve
  ctx.beginPath(); ctx.moveTo(pts[0].x, pad.t + gH);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length-1].x, pad.t + gH); ctx.closePath();
  const fillG = ctx.createLinearGradient(0, pad.t, 0, pad.t + gH);
  fillG.addColorStop(0, 'rgba(0,212,255,0.25)');
  fillG.addColorStop(1, 'rgba(0,212,255,0.03)');
  ctx.fillStyle = fillG; ctx.fill();

  // Line
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.stroke();

  // Critical point markers
  critPts.forEach(cp => {
    const xi = Math.round(cp.x * 100);
    const pt = pts[Math.min(xi, pts.length - 1)];
    ctx.beginPath(); ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = DAMAGE_COLORS[damage] ?? '#ff3b6b'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    // Drop line
    ctx.beginPath(); ctx.moveTo(pt.x, pt.y); ctx.lineTo(pt.x, pad.t + gH);
    ctx.strokeStyle = (DAMAGE_COLORS[damage] ?? '#ff3b6b') + '55'; ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    // Label
    ctx.fillStyle = DAMAGE_COLORS[damage] ?? '#ff3b6b'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
    ctx.fillText(cp.label, pt.x, pt.y - 10);
  });
  ctx.textAlign = 'left';

  // Axes labels
  ctx.fillStyle = 'rgba(0,212,255,0.8)'; ctx.font = 'bold 10px Inter'; ctx.textAlign = 'center';
  ctx.fillText('Road Elevation Profile', W / 2, 20);
  ctx.fillStyle = 'rgba(160,200,230,0.5)'; ctx.font = '9px Inter';
  ctx.fillText('Station Distance (m)', pad.l + gW / 2, H - 10);
  ctx.save(); ctx.translate(12, pad.t + gH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('Elevation (m)', 0, 0); ctx.restore();
  ctx.textAlign = 'left';
}

// ── Main Modal Component ───────────────────────────────────────────────────────────────────────
export default function RoadModal({ road, cityId, onClose }: Props) {
  const p = road.properties;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef<number>(0);
  const [view, setView] = useState<ViewMode>('stations');
  const [emergencyData, setEmergencyData] = useState<any>(null);
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  // Fetch nearest emergency services when emergency tab is opened
  useEffect(() => {
    if (view === 'emergency' && !emergencyData && p.id) {
      setEmergencyLoading(true);
      axios.get(`${API}/city/road/${p.id}/emergency`)
        .then(r => setEmergencyData(r.data))
        .catch(() => setEmergencyData({ error: true }))
        .finally(() => setEmergencyLoading(false));
    }
  }, [view, p.id]); // eslint-disable-line react-hooks/exhaustive-deps


  // Build critical points deterministically from road data
  const hasCritical = p.damage_type && p.damage_type !== 'none';
  const critPts = hasCritical ? [
    { x: 0.25, y: 0.3, label: 'CP-01' },
    { x: 0.6,  y: 0.65, label: 'CP-02' },
    { x: 0.82, y: 0.45, label: 'CP-03' },
  ] : [];
  const critPtsElev = hasCritical ? [
    { x: 0.25, label: 'CP-01' },
    { x: 0.60, label: 'CP-02' },
    { x: 0.82, label: 'CP-03' },
  ] : [];

  const pavement = p.pavement_layers ?? {
    wearing_course_cm: 5, binder_course_cm: 10, base_course_cm: 20,
    subbase_cm: 35, subgrade_cm: 80,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STATIONS = ['100+00', '200+00', '300+00', '400+00'];

    const render = () => {
      phaseRef.current += 0.03;
      const ph = phaseRef.current;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      if (view === 'stations') {
        // Dark background
        ctx.fillStyle = '#070c16'; ctx.fillRect(0, 0, W, H);

        // Draw 4 staggered isometric station slices
        const scale = 18;
        const stepY = H / 5;
        STATIONS.forEach((label, i) => {
          const ox = W / 2 + (i - 1.5) * 30;
          const oy = 60 + i * stepY;
          const critical = hasCritical && (i === 1 || i === 3);
          drawStation(ctx, ox, oy, scale, `Station ${label}`, p.damage_type ?? 'none', critical, ph + i, pavement);
        });

        // Title
        ctx.fillStyle = 'rgba(0,212,255,0.9)'; ctx.font = 'bold 13px Space Grotesk'; ctx.textAlign = 'center';
        ctx.fillText('ROAD CONDITION SURVEY — MULTI-STATION VIEW', W / 2, 24);
        ctx.fillStyle = 'rgba(160,200,230,0.5)'; ctx.font = '10px Inter';
        ctx.fillText('Showing 4 Stations along road alignment', W / 2, 40);
        ctx.textAlign = 'left';

      } else if (view === 'crosssection') {
        ctx.fillStyle = '#070c16'; ctx.fillRect(0, 0, W, H);
        drawCrossSection(ctx, W, H, pavement, p.damage_type ?? 'none', p.name ?? 'Road');

      } else if (view === 'aerial') {
        drawAerial(ctx, W, H, p.damage_type ?? 'none', critPts, ph);
        // Overlay title
        ctx.fillStyle = 'rgba(0,212,255,0.9)'; ctx.font = 'bold 12px Space Grotesk'; ctx.textAlign = 'center';
        ctx.fillText('AERIAL PLAN VIEW — CRITICAL POINT LOCATIONS', W / 2, 20);
        ctx.textAlign = 'left';

      } else if (view === 'elevation') {
        ctx.fillStyle = '#070c16'; ctx.fillRect(0, 0, W, H);
        drawElevation(ctx, W, H, p.road_age ?? 5, p.damage_type ?? 'none', critPtsElev);
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [view, p.damage_type, hasCritical]);

  const rciColor = (rci: number) =>
    rci >= 75 ? 'var(--green)' : rci >= 50 ? 'var(--yellow)' : 'var(--red)';

  const dmgCol = DAMAGE_COLORS[p.damage_type ?? 'none'] ?? '#00ff9d';

  const views: { id: ViewMode; label: string; icon: string }[] = [
    { id: 'stations',     label: 'Station Views',     icon: '🏗️' },
    { id: 'crosssection', label: 'Cross-Section',     icon: '📐' },
    { id: 'aerial',       label: 'Aerial Plan',       icon: '🛰️' },
    { id: 'elevation',    label: 'Elevation Profile', icon: '📈' },
    { id: 'emergency',    label: 'Emergency ETA',     icon: '🚨' },
  ];

  // ── skip canvas loop for non-canvas views ──
  return (
    <div className="modal-wrap" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-lg modal-box">

        {/* ── MODAL HEADER ── */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Space Grotesk' }}>3D Road Simulation</div>
              <div className="badge badge-cyan">AI Analysis</div>
              {hasCritical && <div className="badge badge-red">⚠ Critical Damage</div>}
            </div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>
              {p.road_name ?? p.name ?? 'Unknown Road'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
              {p.name ?? ''} &nbsp;·&nbsp; {p.city_id?.replace(/_/g,' ').toUpperCase() ?? 'City Network'}
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { l: 'RCI', v: (p.rci ?? 0).toFixed(1), c: rciColor(p.rci ?? 0) },
              { l: 'Criticality', v: (p.criticality ?? 0).toFixed(1), c: 'var(--yellow)' },
              { l: 'Fail Prob', v: ((p.failure_probability ?? 0) * 100).toFixed(0) + '%', c: (p.failure_probability ?? 0) > 0.7 ? 'var(--red)' : 'var(--green)' },
              { l: 'Age', v: `${p.road_age ?? 0}yr`, c: 'var(--text)' },
            ].map(s => (
              <div key={s.l} className="stat-card" style={{ padding: '8px 14px', textAlign: 'center' }}>
                <div className="stat-label">{s.l}</div>
                <div className="stat-value" style={{ fontSize: 18, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginLeft: 8 }}>✕ Close</button>
        </div>

        {/* ── BODY ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left info sidebar */}
          <div style={{ width: 240, borderRight: '1px solid var(--border)', padding: '16px', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Road info */}
            <div>
              <div className="sec">Road Details</div>
              {[
                { l: 'Surface', v: p.surface ?? '–' },
                { l: 'Lanes', v: p.lanes ?? '–' },
                { l: 'Width', v: `${p.width ?? '–'} m` },
                { l: 'Length', v: `${((p.length ?? 0) / 1000).toFixed(2)} km` },
                { l: 'Traffic Capacity', v: (p.traffic_capacity ?? 0).toLocaleString() + '/hr' },
                { l: 'Avg Traffic', v: (p.average_traffic ?? 0).toLocaleString() + '/hr' },
                { l: 'Population Served', v: (p.population_served ?? 0).toLocaleString() },
                { l: 'Bridge', v: p.is_bridge ? '✓ Yes' : 'No' },
                { l: 'Built', v: p.construction_year ?? '–' },
              ].map(row => (
                <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 11 }}>
                  <span style={{ color: 'var(--text-dim)' }}>{row.l}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 11 }}>{String(row.v)}</span>
                </div>
              ))}
            </div>

            <div className="hr" />

            {/* Damage info */}
            <div>
              <div className="sec">Damage Assessment</div>
              <div style={{ background: `${dmgCol}15`, border: `1px solid ${dmgCol}40`, borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Damage Type</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: dmgCol }}>
                  {(p.damage_type ?? 'none').replace(/_/g, ' ').toUpperCase()}
                </div>
              </div>
              {[
                { l: 'Flood Risk',       v: ((p.flood_risk ?? 0) * 100).toFixed(0) + '%',      c: 'var(--cyan)' },
                { l: 'Earthquake Risk',  v: ((p.earthquake_risk ?? 0) * 100).toFixed(0) + '%', c: 'var(--orange)' },
                { l: 'Landslide Risk',   v: ((p.landslide_risk ?? 0) * 100).toFixed(0) + '%',  c: 'var(--yellow)' },
              ].map(row => (
                <div key={row.l} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-dim)' }}>{row.l}</span>
                    <span style={{ fontWeight: 700, color: row.c }}>{row.v}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: row.v, background: row.c }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hr" />

            {/* Pavement layers */}
            <div>
              <div className="sec">Pavement Layers</div>
              {LAYERS.map((layer, i) => {
                const val = Object.values(pavement)[i] ?? layer.depth;
                return (
                  <div key={layer.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, background: layer.light, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{layer.label}</div>
                    </div>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 600 }}>{val}cm</span>
                  </div>
                );
              })}
            </div>

            <div className="hr" />

            {/* Critical points */}
            {hasCritical && (
              <div>
                <div className="sec">Critical Points</div>
                {critPts.map((cp, i) => (
                  <div key={cp.label} style={{ background: `${dmgCol}10`, border: `1px solid ${dmgCol}30`, borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 11, color: dmgCol }}>⚠ {cp.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Ch. {(cp.x * (p.length ?? 1000)).toFixed(0)}m
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
                      {i === 0 ? 'Surface cracking detected' : i === 1 ? 'Structural weakness identified' : 'Drainage failure zone'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Cost */}
            <div>
              <div className="sec">Cost Estimates</div>
              {[
                { l: 'Maintenance', v: `₹${((p.maintenance_cost ?? 0) / 1e5).toFixed(1)}L`, c: 'var(--cyan)' },
                { l: 'Repair',      v: `₹${((p.repair_cost ?? 0) / 1e6).toFixed(2)}Cr`,    c: 'var(--yellow)' },
                { l: 'Upgrade',     v: `₹${((p.upgrade_cost ?? 0) / 1e6).toFixed(2)}Cr`,   c: 'var(--purple)' },
              ].map(row => (
                <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'var(--text-dim)' }}>{row.l}</span>
                  <span style={{ fontWeight: 700, color: row.c, fontFamily: 'var(--font-mono)' }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* View tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
              {views.map(v => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  style={{
                    background: view === v.id ? 'rgba(0,212,255,0.1)' : 'transparent',
                    border: 'none', borderBottom: view === v.id ? '2px solid var(--cyan)' : '2px solid transparent',
                    color: view === v.id ? 'var(--cyan)' : 'var(--text-dim)',
                    padding: '12px 18px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    fontFamily: 'Inter', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {/* Canvas — hidden when on Emergency tab */}
            <div style={{ flex: 1, background: '#070c16', position: 'relative', overflow: 'hidden', display: view === 'emergency' ? 'none' : 'block' }}>
              <canvas
                ref={canvasRef}
                width={900}
                height={600}
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
              {/* Overlay corner labels */}
              <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 10, color: 'rgba(0,212,255,0.4)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                <div>RESILIO CITY — AI Road Simulation Engine</div>
                <div>Road ID: {p.id?.slice(0, 8) ?? '–'}...</div>
              </div>
              {hasCritical && (
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6 }}>
                  <div className="badge badge-red">🔴 {critPts.length} Critical Points</div>
                  <div className="badge" style={{ background: `${dmgCol}20`, color: dmgCol, border: `1px solid ${dmgCol}40` }}>
                    {(p.damage_type ?? '').replace(/_/g,' ')}
                  </div>
                </div>
              )}
            </div>

            {/* ── EMERGENCY ETA PANEL ── */}
            {view === 'emergency' && (
              <div style={{ flex: 1, background: '#070c16', overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 16, color: 'var(--red)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                  🚨 Emergency Services — Nearest Response Units
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 20 }}>
                  Road: <b style={{ color: 'var(--text)' }}>{p.road_name ?? p.name ?? 'Unknown'}</b>
                  &nbsp;·&nbsp; All ETAs include 20% traffic overhead
                </div>

                {emergencyLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-dim)', padding: '40px 0' }}>
                    <div className="spinner" /> <span>Calculating nearest emergency services...</span>
                  </div>
                )}

                {!emergencyLoading && emergencyData?.error && (
                  <div style={{ color: 'var(--red)', padding: '20px', textAlign: 'center' }}>
                    ⚠ Could not fetch emergency data. Ensure the backend is running.
                  </div>
                )}

                {!emergencyLoading && emergencyData?.nearest_services && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {emergencyData.nearest_services.map((svc: any, i: number) => {
                      const isNearest = i === 0;
                      const typeColors: Record<string,string> = {
                        hospital: '#ff4444', fire_station: '#ff8800', police: '#4488ff'
                      };
                      const col = typeColors[svc.type] ?? '#ffffff';
                      const etaUrgency = svc.eta_minutes < 5 ? 'var(--green)' : svc.eta_minutes < 12 ? 'var(--yellow)' : 'var(--red)';
                      return (
                        <div key={svc.id} style={{
                          background: isNearest ? `${col}12` : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isNearest ? col + '50' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 12, padding: '14px 18px',
                          boxShadow: isNearest ? `0 0 24px ${col}20` : 'none',
                          transition: 'all 0.2s ease',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                            <div>
                              {isNearest && (
                                <div style={{ fontSize: 10, color: col, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
                                  ★ NEAREST UNIT
                                </div>
                              )}
                              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                                {svc.label} — {svc.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                {svc.distance_km} km away · travelling at {svc.speed_kmh} km/h
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 26, color: etaUrgency, lineHeight: 1 }}>
                                {svc.eta_minutes} <span style={{ fontSize: 12, fontWeight: 600 }}>min</span>
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>ETA</div>
                            </div>
                          </div>
                          {/* ETA progress bar */}
                          <div className="progress-bar">
                            <div className="progress-fill" style={{
                              width: `${Math.min(100, (svc.eta_minutes / 30) * 100)}%`,
                              background: etaUrgency,
                            }} />
                          </div>
                          {svc.type === 'hospital' && svc.ambulances && (
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                              🏥 Capacity: {svc.capacity?.toLocaleString()} beds · {svc.ambulances} ambulances available
                            </div>
                          )}
                          {svc.type === 'fire_station' && (
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                              🚒 {svc.trucks} fire trucks · {svc.personnel} personnel on duty
                            </div>
                          )}
                          {svc.type === 'police' && (
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 8 }}>
                              🚔 {svc.vehicles} patrol vehicles · {svc.personnel} officers
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Summary row */}
                    <div style={{ marginTop: 8, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '12px 18px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 8 }}>📊 Response Summary</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Ambulance ETA', val: emergencyData.nearest_services.find((s:any)=>s.type==='hospital')?.eta_minutes + ' min', col: '#ff4444' },
                          { label: 'Fire Unit ETA', val: emergencyData.nearest_services.find((s:any)=>s.type==='fire_station')?.eta_minutes + ' min', col: '#ff8800' },
                          { label: 'Police ETA',    val: emergencyData.nearest_services.find((s:any)=>s.type==='police')?.eta_minutes + ' min',    col: '#4488ff' },
                        ].map(r => (
                          <div key={r.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px' }}>
                            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{r.label}</div>
                            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: 18, color: r.col }}>{r.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
