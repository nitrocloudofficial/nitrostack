import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';

const SIDECAR = 'http://localhost:8000';

export class TrainTools {
  @Tool({
    name: 'train',
    description: 'Train a classifier head on a labeled image folder and return accuracy metrics.',
    inputSchema: z.object({
      class_list: z.array(z.string()).describe("Class names, e.g. ['scratch','dent','clean']"),
      data_dir: z.string().describe('Path under shared storage, e.g. C:/hack/storage/images')
    })
  })
  async train(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Calling sidecar /train', { classes: input.class_list, data_dir: input.data_dir });

    const res = await fetch(`${SIDECAR}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ class_list: input.class_list, data_dir: input.data_dir })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sidecar /train failed (${res.status}): ${text}`);
    }
    return await res.json();
  }
}
