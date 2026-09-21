import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../../../../knowledge/product_baseline.md');

export class ProductResources {
  @Resource({
    uri: 'product://baseline',
    name: 'Product Baseline',
    description: 'Product evaluation criteria, RICE framework, success metrics, and hard rejection rules',
    mimeType: 'text/markdown'
  })
  async getBaseline(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching product baseline');
    const baseline = fs.existsSync(BASELINE_PATH)
      ? fs.readFileSync(BASELINE_PATH, 'utf-8')
      : '# Product Baseline\nProduct evaluation standards.';

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: baseline
      }]
    };
  }
}
