import { ToolDecorator as Tool, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';

export const VisualMeshInput = z.object({
  imageBase64: z.string().describe('raw source image, base64-encoded'),
});

export type VisualMeshInputType = z.infer<typeof VisualMeshInput>;

const MESHY_API_BASE = 'https://api.meshy.ai/v1';

@Injectable()
export class MeshTools {
  /**
   * The one tool that still needs the raw image — Meshy infers geometry
   * directly from pixels rather than from Claude's derived measurements.
   * No CadQuery/Python involved; this is a plain HTTP call.
   *
   * Uses Meshy's free tier (100 credits/month, no card required as of
   * writing — verify current terms at https://www.meshy.ai/pricing before
   * relying on it for a live demo). Free-tier outputs are CC BY 4.0
   * licensed, which is fine for a hackathon demo but worth knowing if this
   * ever goes further than that.
   *
   * Unlike a URL-only response, this tool downloads the generated STL and
   * returns its actual bytes (base64) — the caller gets a file, not a
   * link to fetch later. Feed the returned `stlBase64` straight into
   * repair_mesh's `stlBase64` input.
   */
  @Tool({
    name: 'generate_visual_mesh',
    description:
      'Generate a 3D mesh from a raw image via the Meshy image-to-3D API and return the ' +
      'resulting STL file directly. Use for visualization only — not dimensionally precise, ' +
      'so not suited to a cap/plug that needs to physically fit. Feed the output into ' +
      'repair_mesh before slicing.',
    inputSchema: VisualMeshInput,
  })
  async generateVisualMesh(rawInput: unknown, _ctx: ExecutionContext) {
    const input = VisualMeshInput.parse(rawInput);

    const apiKey = process.env.MESHY_API_KEY;
    if (!apiKey) {
      throw new Error('MESHY_API_KEY is not set in the server environment.');
    }

    const createRes = await fetch(`${MESHY_API_BASE}/image-to-3d`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:image/png;base64,${input.imageBase64}`,
        ai_model: 'meshy-4',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Meshy task creation failed: ${createRes.status} ${await createRes.text()}`);
    }

    const { result: taskId } = (await createRes.json()) as { result: string };

    // Poll until the task finishes. In production this should be replaced
    // with Meshy's webhook callback rather than polling.
    const pollIntervalMs = 3000;
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const statusRes = await fetch(`${MESHY_API_BASE}/image-to-3d/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!statusRes.ok) {
        throw new Error(`Meshy status check failed: ${statusRes.status}`);
      }

      const task = (await statusRes.json()) as {
        status: 'PENDING' | 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';
        model_urls?: Record<string, string>;
      };

      if (task.status === 'SUCCEEDED') {
        const url = task.model_urls?.stl;
        if (!url) {
          throw new Error('Meshy task succeeded but no stl output was returned.');
        }

        // Download the actual bytes rather than handing back a link —
        // the caller gets a file, ready to pass into repair_mesh.
        const fileRes = await fetch(url);
        if (!fileRes.ok) {
          throw new Error(`Failed to download generated STL from Meshy: ${fileRes.status}`);
        }
        const stlBytes = Buffer.from(await fileRes.arrayBuffer());

        return {
          stlBase64: stlBytes.toString('base64'),
          format: 'stl' as const,
          sizeBytes: stlBytes.byteLength,
          taskId,
        };
      }
      if (task.status === 'FAILED') {
        throw new Error(`Meshy task ${taskId} failed.`);
      }
      // else PENDING / IN_PROGRESS -> keep polling
    }

    throw new Error(`Meshy task ${taskId} did not complete within the polling window.`);
  }
}
