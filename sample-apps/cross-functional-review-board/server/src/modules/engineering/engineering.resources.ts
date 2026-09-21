import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../../../../knowledge/engineering_baseline.md');

export class EngineeringResources {
  @Resource({
    uri: 'engineering://baseline',
    name: 'Engineering Baseline',
    description: 'Engineering standards, effort sizing scale, architectural risks, and rollback readiness',
    mimeType: 'text/markdown'
  })
  async getBaseline(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching engineering baseline');
    const baseline = fs.existsSync(BASELINE_PATH)
      ? fs.readFileSync(BASELINE_PATH, 'utf-8')
      : '# Engineering Baseline\nTechnical review standards.';

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: baseline
      }]
    };
  }
}
