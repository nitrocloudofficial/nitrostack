# MetricLab AI

WebGPU black hole visualizer. Next.js/TypeScript frontend + NitroStack MCP
backend + Python/SymPy physics engine.

```
metriclab-mcp/            NitroStack MCP backend
  scripts/calc_tensors.py   real SymPy Schwarzschild Christoffel symbols
  src/physics.tools.ts      MCP tools: compute_christoffel_symbols, patch_wgsl_uniforms
  src/index.ts              MCP server entrypoint

metriclab-frontend/       Next.js App Router frontend
  app/page.tsx              mass/cameraDistance sliders -> <SpacetimeCanvas>
  components/SpacetimeCanvas.tsx   WebGPU device/pipeline/uniform-buffer setup
  lib/uniforms.ts            derives the 8-float Uniforms struct (replaces mockPatchUniforms)
  public/shaders/spacetime.wgsl    Phase 1: RK4 null-geodesic ray tracer
```

## Run it

Backend (optional for Phase 1 — the frontend derives uniforms locally in
`lib/uniforms.ts` using the same rs=2M / photon-sphere=1.5rs relations):

```bash
cd metriclab-mcp
npm install
npm run test:tensors   # sanity check: prints Christoffel symbols at r=10
```

Frontend:

```bash
cd metriclab-frontend
npm install
npm run dev
# open http://localhost:3000 in a WebGPU-capable browser (Chrome/Edge 113+)
```

## Status

- [x] Phase 0: adaptive-step fix so rays can actually reach the black hole
- [x] Phase 1: real RK4 Schwarzschild null-geodesic integration, adaptive step near photon sphere
- [ ] Phase 2: accretion disk with Doppler brightening
- [ ] Phase 3: mouse-drag orbit camera
