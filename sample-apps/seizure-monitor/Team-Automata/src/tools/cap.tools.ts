import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getPythonCommand } from './python-runtime.js';
import { isRemoteCadApiConfigured, callCadApi } from './cad-api-client.js';

const run = promisify(execFile);

export const CapDimensions = z.object({
  outerDiameter: z.number().positive().describe('mm, cap outer diameter'),
  innerDiameter: z.number().positive().describe('mm, opening the cap must clear'),
  height: z.number().positive().describe('mm, cap height'),
  threadPitch: z
    .number()
    .positive()
    .optional()
    .describe('mm, omit to fall back to a standard single-start pitch (~PCO 1810, 3.18mm)'),
  threadDepth: z
    .number()
    .positive()
    .optional()
    .describe('mm, radial depth the thread ridge protrudes inward from the skirt wall; omit for a 0.6mm default'),
  threadStarts: z
    .number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .describe('number of parallel thread starts (2-3 is typical for quick-on caps); omit for a single-start thread'),
  topThickness: z
    .number()
    .positive()
    .optional()
    .describe('mm, solid top wall thickness; omit to derive one from height (clamped to 1.2-3mm)'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .default('medium')
    .describe('caller-supplied confidence in the extracted dimensions, from client-side vision analysis'),
});

export type CapDimensionsInput = z.infer<typeof CapDimensions>;

@Injectable()
export class CapTools {
  @Tool({
    name: 'generate_precise_cap',
    description:
      'Generate a threaded cap STL/STEP from measured opening dimensions: a ' +
      'solid closed top with a skirt carrying real helical internal threads ' +
      '(swept, not just a bore). Takes structured JSON only (no image) — ' +
      'vision/dimension extraction happens client-side before this is called. ' +
      'Deterministic CadQuery, no network call.',
    inputSchema: CapDimensions,
  })
  async generatePreciseCap(input: CapDimensionsInput, _ctx: ExecutionContext) {
    if (input.confidence === 'low') {
      // Surface the caller's own low-confidence flag rather than silently
      // generating a cap that may not fit — matches the "flag low-confidence
      // dimensions back to the user" recommendation from the design discussion.
      return {
        warning:
          'Dimensions were flagged low-confidence. Generating anyway with a ' +
          'conservative fit — recommend confirming outerDiameter/innerDiameter ' +
          'before printing.',
        ...(await this.build(input)),
      };
    }
    return this.build(input);
  }

  private async build(input: CapDimensionsInput) {
    let filePath: string;
    let fileBuffer: Buffer;

    if (isRemoteCadApiConfigured()) {
      // NitroCloud path: no local Python, call out to api/server.py instead.
      const data = await callCadApi<{ fileBase64: string }>('/cap', input);
      fileBuffer = Buffer.from(data.fileBase64, 'base64');
      filePath = join(tmpdir(), `cap_${randomBytes(8).toString('hex')}.stl`);
      await writeFile(filePath, fileBuffer);
    } else {
      const pythonCmd = await getPythonCommand();
      const { stdout } = await run(pythonCmd, [
        'cad/precise_cap.py',
        JSON.stringify(input),
      ]);
      filePath = stdout.trim();
      fileBuffer = await readFile(filePath);
    }

    return {
      file: filePath,
      // The actual downloadable bytes — mirrors generate_visual_mesh /
      // repair_mesh. `file` alone is a path on this server's own disk,
      // which the MCP client can't reach or turn into a download.
      fileBase64: fileBuffer.toString('base64'),
      format: 'stl' as const,
      sizeBytes: fileBuffer.byteLength,
    };
  }
}