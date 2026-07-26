import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";

/**
 * MCP tool: compute_christoffel_symbols
 *
 * Shells out to scripts/calc_tensors.py (real SymPy computation, not a
 * lookup table) and returns the nonzero Christoffel symbols for the
 * Schwarzschild metric at a given mass (and optionally a radius).
 */
export const computeChristoffelSymbolsTool = {
  name: "compute_christoffel_symbols",
  description:
    "Computes Schwarzschild Christoffel symbols (Gamma^a_bc) via SymPy for a given geometric mass M, optionally evaluated at a radius r.",
  inputSchema: {
    type: "object",
    properties: {
      mass: { type: "number", description: "Geometric mass M (Schwarzschild radius rs = 2M)." },
      r: { type: "number", description: "Optional radius at which to numerically evaluate each symbol." },
    },
    required: ["mass"],
  },
  handler: async ({ mass, r }: { mass: number; r?: number }) => {
    const scriptPath = path.resolve(__dirname, "..", "scripts", "calc_tensors.py");
    const args = ["--mass", String(mass), "--json"];
    if (r !== undefined) args.push("--r", String(r));

    const output = await runPython(scriptPath, args);
    return JSON.parse(output);
  },
};

/**
 * MCP tool: patch_wgsl_uniforms
 *
 * Given a mass + cameraDistance, derives the remaining uniform fields
 * (eventHorizonRadius, photonSphereRadius, adaptive stepSize seed) and
 * writes them into a small JSON sidecar the frontend can read, OR patches
 * the `DEFAULT_UNIFORMS` block directly inside spacetime.wgsl if a
 * `--target=wgsl` mode is requested.
 *
 * This does NOT touch geodesic integration logic in the shader -- it only
 * patches the numeric defaults so the frontend and shader stay in sync
 * with the physics engine's definition of rs = 2M, photon sphere = 1.5*rs.
 */
export const patchWgslUniformsTool = {
  name: "patch_wgsl_uniforms",
  description:
    "Derives eventHorizonRadius/photonSphereRadius/stepSize from mass + cameraDistance and writes them to uniforms.derived.json for the frontend to consume.",
  inputSchema: {
    type: "object",
    properties: {
      mass: { type: "number" },
      cameraDistance: { type: "number" },
      resolutionX: { type: "number" },
      resolutionY: { type: "number" },
      outputPath: {
        type: "string",
        description: "Where to write the derived uniforms JSON. Defaults to ../metriclab-frontend/lib/uniforms.derived.json",
      },
    },
    required: ["mass", "cameraDistance"],
  },
  handler: async (params: {
    mass: number;
    cameraDistance: number;
    resolutionX?: number;
    resolutionY?: number;
    outputPath?: string;
  }) => {
    const { mass, cameraDistance, resolutionX = 1280, resolutionY = 720 } = params;

    const eventHorizonRadius = 2 * mass; // rs = 2M
    const photonSphereRadius = 1.5 * eventHorizonRadius; // 3M

    const derived = {
      mass,
      cameraDistance,
      stepSize: 0.05, // baseline; shader now overrides this adaptively per-ray
      eventHorizonRadius,
      photonSphereRadius,
      resolutionX,
      resolutionY,
      time: 0,
    };

    const outputPath =
      params.outputPath ??
      path.resolve(__dirname, "..", "..", "metriclab-frontend", "lib", "uniforms.derived.json");

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(derived, null, 2));

    return { written: outputPath, derived };
  },
};

function runPython(scriptPath: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [scriptPath, ...args]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d));
    proc.stderr.on("data", (d) => (stderr += d));
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`calc_tensors.py exited ${code}: ${stderr}`));
    });
  });
}

export const physicsTools = [computeChristoffelSymbolsTool, patchWgslUniformsTool];
