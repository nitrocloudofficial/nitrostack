// spacetime.wgsl
// MetricLab AI — Schwarzschild ray tracer
//
// Phase 1: real null-geodesic integration (RK4) replacing the old fudge-factor
// bending term. Physics reference (photon orbit equation, G=c=1, rs=2M):
//
//   d^2u/dphi^2 + u = 3 M u^2         where u = 1/r
//
// For each pixel we shoot a ray from the camera, find the (unique, by
// spherical symmetry) orbital plane it lies in, and integrate u(phi) with
// RK4 using an adaptive step in phi (fine near the photon sphere r=1.5*rs,
// coarse in flat space). We then reconstruct a 3D exit direction and sample
// a hashed starfield with it — this is what produces visible warping/ring
// smearing near the photon sphere instead of a simple resize.

struct Uniforms {
  mass: f32,
  cameraDistance: f32,
  cameraAzimuth: f32,   // Phase 3: radians, mouse-drag horizontal orbit
  cameraElevation: f32, // Phase 3: radians, mouse-drag vertical orbit (clamped short of the poles)
  eventHorizonRadius: f32,
  photonSphereRadius: f32,
  resolutionX: f32,
  resolutionY: f32,
  time: f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

// ---------- Vertex stage: full-screen triangle ----------

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) idx: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  var out: VertexOutput;
  out.position = vec4<f32>(pos[idx], 0.0, 1.0);
  out.uv = pos[idx] * 0.5 + vec2<f32>(0.5, 0.5);
  return out;
}

// ---------- Hashed starfield background ----------

fn hash13(p3in: vec3<f32>) -> f32 {
  var p3 = fract(p3in * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn starfield(dir: vec3<f32>) -> vec3<f32> {
  let cell = floor(dir * 220.0);
  let h = hash13(cell);
  let star = step(0.9965, h);
  let twinkle = 0.6 + 0.4 * sin(u.time * 3.0 + h * 62.83);
  let brightness = star * twinkle * (0.5 + 0.5 * hash13(cell + 7.0));
  let tint = mix(vec3<f32>(0.75, 0.82, 1.0), vec3<f32>(1.0, 0.95, 0.85), hash13(cell + 3.1));
  return brightness * tint;
}

// ---------- RK4 null-geodesic integrator ----------
// State: (u, v) where u = 1/r, v = du/dphi.
// ODE:   u'  = v
//        v'  = 3*M*u*u - u

struct GeoState {
  u: f32,
  v: f32,
};

fn geoDeriv(s: GeoState, M: f32) -> GeoState {
  return GeoState(s.v, 3.0 * M * s.u * s.u - s.u);
}

fn geoAdd(a: GeoState, b: GeoState, scale: f32) -> GeoState {
  return GeoState(a.u + b.u * scale, a.v + b.v * scale);
}

fn rk4Step(s: GeoState, M: f32, dphi: f32) -> GeoState {
  let k1 = geoDeriv(s, M);
  let k2 = geoDeriv(geoAdd(s, k1, 0.5 * dphi), M);
  let k3 = geoDeriv(geoAdd(s, k2, 0.5 * dphi), M);
  let k4 = geoDeriv(geoAdd(s, k3, dphi), M);
  let du = (dphi / 6.0) * (k1.u + 2.0 * k2.u + 2.0 * k3.u + k4.u);
  let dv = (dphi / 6.0) * (k1.v + 2.0 * k2.v + 2.0 * k3.v + k4.v);
  return GeoState(s.u + du, s.v + dv);
}

// Adaptive step: small near the photon sphere (r ~ 1.5*rs = 3M), large in
// flat space far from the black hole.
fn adaptiveDPhi(r: f32, photonSphereRadius: f32) -> f32 {
  let rel = (r - photonSphereRadius) / max(photonSphereRadius, 0.001);
  let closeness = 1.0 / (1.0 + rel * rel * 6.0);
  return clamp(mix(0.09, 0.004, closeness), 0.003, 0.09);
}

struct TraceResult {
  captured: bool,
  exitDir: vec3<f32>,
};

const MAX_GEO_STEPS: i32 = 700;
const MAX_PHI: f32 = 37.7; // ~12*pi -- enough winding near the critical impact parameter

fn traceGeodesic(origin: vec3<f32>, dir: vec3<f32>, M: f32, rs: f32, photonSphereRadius: f32, escapeR: f32) -> TraceResult {
  let r0 = length(origin);

  // Degenerate case: ray is (numerically) radial -> no well-defined orbital
  // plane, and radial null geodesics don't bend. March straight.
  let Lvec = cross(origin, dir);
  let Lmag = length(Lvec);
  if (Lmag < 1e-5) {
    if (dot(origin, dir) < 0.0) {
      // heading toward the BH: does it cross the horizon?
      return TraceResult(true, dir);
    }
    return TraceResult(false, dir);
  }

  let n = Lvec / Lmag;
  let e1 = origin / r0;
  let e2 = cross(n, e1);

  let vr = dot(dir, e1);
  let vt = dot(dir, e2);

  var s = GeoState(1.0 / r0, 0.0);
  if (abs(vt) > 1e-6) {
    s.v = -vr / (r0 * vt);
  }

  var phi = 0.0;
  var captured = false;

  for (var i = 0; i < MAX_GEO_STEPS; i = i + 1) {
    let r = 1.0 / max(s.u, 1e-6);
    if (r <= rs * 1.001) {
      captured = true;
      break;
    }
    if (r > escapeR || phi > MAX_PHI) {
      break;
    }
    let dphi = adaptiveDPhi(r, photonSphereRadius);
    s = rk4Step(s, M, dphi);
    phi = phi + dphi;
  }

  if (captured) {
    return TraceResult(true, dir);
  }

  // Reconstruct an exit direction from the final (u, v, phi) state.
  let rFinal = 1.0 / max(s.u, 1e-6);
  let rHat = cos(phi) * e1 + sin(phi) * e2;
  let tHat = -sin(phi) * e1 + cos(phi) * e2;
  let drdphi = -rFinal * rFinal * s.v;
  let vel = drdphi * rHat + rFinal * tHat;
  let vlen = length(vel);
  if (vlen < 1e-6) {
    return TraceResult(false, dir);
  }
  return TraceResult(false, vel / vlen);
}

// ---------- Fragment stage ----------

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
  let aspect = u.resolutionX / max(u.resolutionY, 1.0);
  let ndc = (in.uv * 2.0 - vec2<f32>(1.0, 1.0)) * vec2<f32>(aspect, 1.0);
  let fovScale = 1.0; // ~53deg vertical FOV pinhole

  // Phase 3: orbit camera. cameraAzimuth/cameraElevation come from mouse
  // drag (see SpacetimeCanvas.tsx) and place the camera anywhere on a
  // sphere of radius cameraDistance around the black hole, always looking
  // back at the origin.
  let az = u.cameraAzimuth;
  let el = u.cameraElevation;
  let cameraPos = u.cameraDistance * vec3<f32>(
    cos(el) * sin(az),
    sin(el),
    cos(el) * cos(az)
  );

  let worldUp = vec3<f32>(0.0, 1.0, 0.0);
  let forward = normalize(-cameraPos);
  let right = normalize(cross(worldUp, forward));
  let camUp = cross(forward, right);
  let rayDir = normalize(forward + right * (ndc.x * fovScale) + camUp * (ndc.y * fovScale));

  let rs = u.eventHorizonRadius;
  let M = rs * 0.5;
  let escapeR = max(u.cameraDistance * 3.0, rs * 60.0);

  let result = traceGeodesic(cameraPos, rayDir, M, rs, u.photonSphereRadius, escapeR);

  var color: vec3<f32>;
  if (result.captured) {
    color = vec3<f32>(0.0, 0.0, 0.0);
  } else {
    color = starfield(result.exitDir);
  }

  return vec4<f32>(color, 1.0);
}
