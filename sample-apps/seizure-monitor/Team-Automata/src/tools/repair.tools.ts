import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getPythonCommand } from './python-runtime.js';
import { isRemoteCadApiConfigured, callCadApi } from './cad-api-client.js';

const run = promisify(execFile);

export const RepairMeshInput = z.object({
  /**
   * Source mesh. Exactly one of `url` or `stlBase64` must be provided.
   *
   * `url`        — a publicly-accessible URL (e.g. the one returned by
   *                generate_visual_mesh). The repair script fetches it.
   * `stlBase64`  — a raw STL/OBJ/PLY file encoded as base64, for cases
   *                where the mesh was produced locally (e.g. generate_precise_cap
   *                or fill) and you have the bytes in hand rather than a URL.
   */
  url: z
    .string()
    .url()
    .optional()
    .describe('publicly accessible URL of the mesh to repair (e.g. from generate_visual_mesh)'),
  stlBase64: z
    .string()
    .optional()
    .describe('raw mesh file (STL/OBJ/PLY) encoded as base64, for locally-generated meshes'),

  /**
   * Input format hint. Only needed when passing stlBase64 and the format
   * is not STL (PyMeshLab infers from the extension written to disk).
   */
  inputFormat: z
    .enum(['stl', 'obj', 'ply', 'glb', 'off'])
    .default('stl')
    .describe('file format of the incoming mesh; used when writing the temp input file'),

  /**
   * Output format. STL is the natural handoff to the slicer; GLB is
   * useful if you need to pass a repaired visual mesh back to the LLM.
   */
  outputFormat: z
    .enum(['stl', 'obj', 'ply'])
    .default('stl')
    .describe('format for the repaired output mesh'),

  /**
   * Repair aggressiveness. Controls which PyMeshLab filters run:
   *   conservative — non-manifold edge/vertex removal + normal unification only.
   *                  Safe default; rarely changes geometry visibly.
   *   standard     — adds hole filling (up to holeSizeThreshold faces) and
   *                  degenerate-face removal. Good for most Meshy outputs.
   *   aggressive   — additionally runs Laplacian smoothing and remeshing to
   *                  produce a clean, uniform-triangle mesh. Use when the
   *                  downstream slicer struggles with dense/uneven topology.
   */
  repairLevel: z
    .enum(['conservative', 'standard', 'aggressive'])
    .default('standard')
    .describe('how extensively to repair the mesh; see field description for details'),

  /**
   * Maximum hole perimeter (in faces) that the hole-filler will close.
   * Ignored when repairLevel is 'conservative'. Larger values close bigger
   * holes but risk filling intentional openings (e.g. a bottle neck).
   */
  holeSizeThreshold: z
    .number()
    .int()
    .positive()
    .default(500)
    .describe('max hole perimeter in faces to auto-fill; ignored for repairLevel conservative'),

  /**
   * Target face count after remeshing. Only used when repairLevel is
   * 'aggressive'. Set to 0 to skip remeshing and only do the cleanup passes.
   */
  targetFaceCount: z
    .number()
    .int()
    .min(0)
    .default(50000)
    .describe('target face count for remeshing pass (aggressive only); 0 = skip remesh'),
});

export type RepairMeshInputType = z.infer<typeof RepairMeshInput>;

@Injectable()
export class RepairTools {
  /**
   * Repair a raw mesh (from Meshy or local CAD) so it is manifold,
   * watertight, and ready for slicing. Delegates all geometry work to
   * cad/repair_mesh.py via PyMeshLab (same subprocess pattern as the
   * CadQuery tools — no network calls from Python).
   *
   * Pipeline: generate_visual_mesh → repair_mesh. The repaired STL this
   * tool returns is the final deliverable handed back to the user — there
   * is no in-repo slicing step; "ready for slicing" here just means it's
   * clean enough for whatever slicer the user runs on their own end.
   * Can also be applied to generate_precise_cap / fill outputs when those
   * produce meshes with coincident faces after boolean operations.
   */
  @Tool({
    name: 'repair_mesh',
    description:
      'Repair a 3D mesh (from Meshy image-to-3D or local CadQuery CAD) to make it ' +
      'manifold, watertight, and print-ready. Removes non-manifold edges/vertices, ' +
      'fills holes, unifies face normals, and optionally remeshes for clean topology. ' +
      'Accepts a URL (e.g. from generate_visual_mesh) or a raw base64-encoded mesh. ' +
      'Returns the repaired STL (or chosen format) as base64 plus a repair summary.',
    inputSchema: RepairMeshInput,
  })
  async repairMesh(rawInput: unknown, _ctx: ExecutionContext) {
    // Materialise zod defaults — same pattern as fill.tools.ts.
    const input = RepairMeshInput.parse(rawInput);

    if (!input.url && !input.stlBase64) {
      throw new Error('Provide either `url` or `stlBase64` — exactly one is required.');
    }
    if (input.url && input.stlBase64) {
      throw new Error('Provide either `url` or `stlBase64`, not both.');
    }

    if (isRemoteCadApiConfigured()) {
      // NitroCloud path: no local Python, call out to api/server.py instead.
      // No local temp files needed here — url/stlBase64 are forwarded as-is
      // and the API handles fetching/writing/reading on its own end.
      return callCadApi<{
        repairedBase64: string;
        format: 'stl' | 'obj' | 'ply';
        sizeBytes: number;
        summary: Record<string, unknown>;
      }>('/repair', {
        url: input.url ?? null,
        stlBase64: input.stlBase64 ?? null,
        inputFormat: input.inputFormat,
        outputFormat: input.outputFormat,
        repairLevel: input.repairLevel,
        holeSizeThreshold: input.holeSizeThreshold,
        targetFaceCount: input.targetFaceCount,
      });
    }

    // Write the input mesh to a temp file so Python can read it by path.
    // (Passing large meshes via argv would hit OS arg-length limits.)
    const uid = randomBytes(8).toString('hex');
    const inPath = join(tmpdir(), `repair_in_${uid}.${input.inputFormat}`);
    const outPath = join(tmpdir(), `repair_out_${uid}.${input.outputFormat}`);

    try {
      if (input.stlBase64) {
        await writeFile(inPath, Buffer.from(input.stlBase64, 'base64'));
      }
      // If url is provided, Python fetches it directly — avoids buffering a
      // potentially large GLB through Node's memory.

      const pythonCmd = await getPythonCommand();
      const args = [
        'cad/repair_mesh.py',
        JSON.stringify({
          url: input.url ?? null,
          inPath: input.stlBase64 ? inPath : null,
          outPath,
          repairLevel: input.repairLevel,
          holeSizeThreshold: input.holeSizeThreshold,
          targetFaceCount: input.targetFaceCount,
        }),
      ];

      const { stdout, stderr } = await run(pythonCmd, args);

      // Python prints a JSON summary to stdout on success; any unhandled
      // exception goes to stderr and surfaces as a thrown Error here.
      let summary: Record<string, unknown>;
      try {
        summary = JSON.parse(stdout.trim());
      } catch {
        throw new Error(
          `repair_mesh.py produced unexpected output.\nstdout: ${stdout}\nstderr: ${stderr}`,
        );
      }

      const repaired = await readFile(outPath);
      const repairedBase64 = repaired.toString('base64');

      return {
        repairedBase64,
        format: input.outputFormat,
        sizeBytes: repaired.byteLength,
        // Repair statistics from PyMeshLab (face/vertex counts before and
        // after, how many holes were filled, etc.) — useful for the LLM to
        // surface to the user before they commit to slicing.
        summary,
      };
    } finally {
      // Best-effort cleanup of temp files — don't let a cleanup failure
      // mask the actual tool error.
      await unlink(inPath).catch(() => undefined);
      await unlink(outPath).catch(() => undefined);
    }
  }
}
