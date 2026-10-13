import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { Shape } from './shapes.js';
import { getPythonCommand } from './python-runtime.js';
import { isRemoteCadApiConfigured, callCadApi } from './cad-api-client.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const run = promisify(execFile);

export const FillGeometry = z.object({
  topShape: Shape,
  bottomShape: Shape.optional().describe('omit if the hole is uniform (not tapered)'),
  holeDepth: z.number().positive().describe('mm'),
  fitType: z.enum(['press_fit', 'loose']).default('press_fit'),
  toleranceMargin: z
    .number()
    .default(-0.15)
    .describe('mm, negative = undersized for friction fit (recommended default given measurement error)'),
  capStyle: z.enum(['flush', 'recessed', 'none']).default('flush'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .default('medium')
    .describe('caller-supplied confidence in the extracted geometry, from client-side vision analysis'),
});

export type FillGeometryInput = z.infer<typeof FillGeometry>;

@Injectable()
export class FillTools {
  @Tool({
    name: 'fill',
    description:
      'Generate a solid plug that fills a measured hole/cavity — circular, ' +
      'rectangular, stadium (slot), arbitrary straight-edged polygon, or ' +
      'freeform organic/curved (amoeba-like) boundary, uniform or tapered. ' +
      'Takes structured JSON only (no image); deterministic CadQuery, no network call.',
    inputSchema: FillGeometry,
  })
  async fill(rawInput: unknown, _ctx: ExecutionContext) {
    // NitroStack validates rawInput against FillGeometry before this runs,
    // but validation alone doesn't materialize zod's .default() values
    // onto the object — only .parse()/.safeParse().data does. Without
    // this, an omitted optional field (toleranceMargin, capStyle, etc.)
    // stays genuinely absent from `input`, not filled with its default,
    // which is what crashed fill.py with a bare KeyError.
    const input = FillGeometry.parse(rawInput);

    if (input.topShape.type === 'polygon' && input.capStyle === 'flush') {
      // Flush-cap generation for polygon shapes is a known gap noted in the
      // design discussion (only circle/rectangle/stadium/freeform are
      // implemented). Fall back to 'none' rather than silently producing an
      // ill-fitting cap.
      const fallback: FillGeometryInput = { ...input, capStyle: 'none' };
      return this.withWarning(
        await this.build(fallback),
        "capStyle 'flush' isn't implemented for polygon top shapes yet — " +
          "falling back to 'none' for this plug.",
      );
    }
    if (input.confidence === 'low') {
      return this.withWarning(
        await this.build(input),
        'Geometry was flagged low-confidence. Generating anyway with the ' +
          'configured tolerance margin — recommend confirming dimensions before printing.',
      );
    }
    return this.build(input);
  }

  // build() may itself surface a warning (e.g. from the freeform path
  // clamping a too-aggressive margin against tight curvature, or retrying
  // an offset). A plain object spread — {warning: X, ...buildResult} — would
  // let buildResult.warning silently overwrite X whenever both are present,
  // dropping one warning without any indication anything was lost. This
  // combines both instead.
  private withWarning<T extends { warning?: string }>(result: T, warning: string): T {
    return {
      ...result,
      warning: result.warning ? `${warning} ${result.warning}` : warning,
    };
  }

  private async build(input: FillGeometryInput) {
    // Ensure topShape and bottomShape are objects, not strings
    const payload = {
      ...input,
      topShape: typeof input.topShape === 'string' ? JSON.parse(input.topShape) : input.topShape,
      bottomShape: input.bottomShape
        ? typeof input.bottomShape === 'string'
          ? JSON.parse(input.bottomShape)
          : input.bottomShape
        : undefined,
    };

    let filePath: string;
    let fileBuffer: Buffer;
    let warnings: string[] | undefined;

    if (isRemoteCadApiConfigured()) {
      // NitroCloud path: no local Python, so call out to api/server.py instead
      // of spawning a subprocess. Same payload shape either way.
      const data = await callCadApi<{ fileBase64: string; warnings?: string[] }>('/fill', payload);
      fileBuffer = Buffer.from(data.fileBase64, 'base64');
      filePath = join(tmpdir(), `fill_${randomBytes(8).toString('hex')}.stl`);
      await writeFile(filePath, fileBuffer);
      warnings = data.warnings;
    } else {
      const pythonCmd = await getPythonCommand();
      const { stdout } = await run(pythonCmd, ['cad/fill.py', JSON.stringify(payload)]);

      // cad/fill.py prints a JSON object ({file, warnings}) rather than a bare
      // path, so any non-fatal issue it handles internally (e.g. the freeform
      // path clamping an over-aggressive margin, or retrying a failed offset)
      // reaches the caller instead of being silently swallowed.
      let parsed: { file: string; warnings?: string[] };
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        // Safety net in case fill.py is ever invoked in a form that prints a
        // bare path instead of JSON — treat stdout as the file path directly
        // rather than crashing.
        parsed = { file: stdout.trim() };
      }
      filePath = parsed.file;
      fileBuffer = await readFile(filePath);
      warnings = parsed.warnings;
    }

    const result: {
      file: string;
      fileBase64: string;
      format: 'stl';
      sizeBytes: number;
      warning?: string;
    } = {
      file: filePath,
      // The actual downloadable bytes — mirrors generate_visual_mesh /
      // repair_mesh. `file` alone is a path on this server's own disk
      // (ephemeral /tmp, possibly on a NitroCloud container), which the
      // MCP client has no access to and can't turn into a download.
      fileBase64: fileBuffer.toString('base64'),
      format: 'stl',
      sizeBytes: fileBuffer.byteLength,
    };
    if (warnings && warnings.length > 0) {
      result.warning = warnings.join(' ');
    }
    return result;
  }
}