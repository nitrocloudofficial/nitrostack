/**
 * earth.ts — the dotted-globe "earth UI" shared by the login page and the
 * landing hero.
 *
 * WHAT IT IS
 * ----------
 * A vanilla-JS canvas renderer of an orthographically projected, slowly
 * rotating dot-matrix Earth — white dots on black, with a graticule — in the
 * visual language of the NitroStack docs. No dependency, no build step: the
 * script is emitted inline into the server-rendered pages, so it renders even
 * if the widget bundles were never built.
 *
 * HOW THE GEOMETRY WORKS
 * ----------------------
 * The landmass comes from `earth-mask.ts` (generated offline from Natural
 * Earth coastlines by scripts/gen-earth-mask.mjs): a 240x120 equirectangular
 * bit-grid. At load time each land bit becomes a unit-sphere point; every
 * frame the set is rotated around the Y axis (plus a fixed axial tilt), and
 * only the front hemisphere is drawn. Dot rows are thinned near the poles
 * (step ∝ 1/cosφ) because an equirectangular grid oversamples high latitudes.
 *
 * The graticule (meridians + parallels) is drawn by sampling each circle and
 * stroking only the front-facing segments — cheaper to reason about than
 * deriving the projected ellipse parameters, and comfortably under 2k points
 * per frame.
 */
import { EARTH_MASK_B64, EARTH_MASK_H, EARTH_MASK_LAT_MAX, EARTH_MASK_W } from './earth-mask.js';

/**
 * Inline <script> that renders the globe onto `canvas#${canvasId}`.
 *
 * Options are baked in at render time (server-side) so the page stays a single
 * self-contained string.
 */
export function earthGlobeScript(
  canvasId: string,
  opts: { rpm?: number; dotColor?: string; lineColor?: string } = {}
): string {
  const rpm = opts.rpm ?? 0.55;
  const dotColor = opts.dotColor ?? '255,255,255';
  const lineColor = opts.lineColor ?? '255,255,255';

  return `<script>
(function () {
  var MASK_B64 = '${EARTH_MASK_B64}';
  var MW = ${EARTH_MASK_W}, MH = ${EARTH_MASK_H}, LAT_MAX = ${EARTH_MASK_LAT_MAX};
  var canvas = document.getElementById('${canvasId}');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // ---- decode the land bitmap -------------------------------------------
  var bin = atob(MASK_B64);
  var bits = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
  function land(x, y) { var k = y * MW + x; return (bits[k >> 3] >> (k & 7)) & 1; }

  // ---- land dots on the unit sphere, thinned near the poles -------------
  var pts = [];
  for (var y = 0; y < MH; y++) {
    var lat = (LAT_MAX - ((y + 0.5) / MH) * (LAT_MAX * 2)) * Math.PI / 180;
    var c = Math.cos(lat), s = Math.sin(lat);
    var step = Math.max(1, Math.round(1 / Math.max(c, 0.08)));
    for (var x = 0; x < MW; x += step) {
      if (!land(x, y)) continue;
      var lon = (-Math.PI + ((x + 0.5) / MW) * 2 * Math.PI);
      pts.push(c * Math.sin(lon), s, c * Math.cos(lon));
    }
  }

  var TILT = -23.4 * Math.PI / 180, ct = Math.cos(TILT), st = Math.sin(TILT);
  var W = 0, H = 0, R = 0, CX = 0, CY = 0, DPR = 1;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    W = Math.max(rect.width, 10); H = Math.max(rect.height, 10);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    R = Math.min(W, H) * 0.46; CX = W / 2; CY = H / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function project(px, py, pz, rot) {
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var x1 = px * cr + pz * sr, z1 = -px * sr + pz * cr;
    var y2 = py * ct - z1 * st, z2 = py * st + z1 * ct;
    return [CX + R * x1, CY - R * y2, z2];
  }

  function strokeCircle(samples, rot, alpha) {
    ctx.beginPath();
    var pen = false;
    for (var i = 0; i <= samples.length - 3; i += 3) {
      var p = project(samples[i], samples[i + 1], samples[i + 2], rot);
      if (p[2] > -0.02) { pen ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); pen = true; }
      else pen = false;
    }
    ctx.strokeStyle = 'rgba(${lineColor},' + alpha + ')';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // Pre-sample the graticule circles once.
  var meridians = [], parallels = [];
  for (var m = 0; m < 12; m++) {
    var lam = (m / 12) * 2 * Math.PI, arr = [];
    for (var a = 0; a <= 90; a++) {
      var phi = -Math.PI / 2 + (a / 90) * Math.PI;
      arr.push(Math.cos(phi) * Math.sin(lam), Math.sin(phi), Math.cos(phi) * Math.cos(lam));
    }
    meridians.push(arr);
  }
  for (var pdeg = -75; pdeg <= 75; pdeg += 15) {
    var phi2 = pdeg * Math.PI / 180, arr2 = [];
    for (var b = 0; b <= 120; b++) {
      var lam2 = (b / 120) * 2 * Math.PI;
      arr2.push(Math.cos(phi2) * Math.sin(lam2), Math.sin(phi2), Math.cos(phi2) * Math.cos(lam2));
    }
    parallels.push(arr2);
  }

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = performance.now();

  function frame(now) {
    var rot = reduced ? 0.6 : ((now - start) / 60000) * ${rpm} * 2 * Math.PI;
    ctx.clearRect(0, 0, W, H);

    // rim
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(${lineColor},0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (var i = 0; i < meridians.length; i++) strokeCircle(meridians[i], rot, 0.14);
    for (var j = 0; j < parallels.length; j++) strokeCircle(parallels[j], rot, 0.12);

    // land dots — brightness by depth so the sphere reads as a sphere
    for (var k = 0; k < pts.length; k += 3) {
      var p = project(pts[k], pts[k + 1], pts[k + 2], rot);
      if (p[2] <= 0) continue;
      var r = 0.55 + p[2] * (R / 300);
      ctx.globalAlpha = 0.22 + p[2] * 0.66;
      ctx.fillStyle = 'rgb(${dotColor})';
      ctx.beginPath();
      ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!reduced) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
</script>`;
}
