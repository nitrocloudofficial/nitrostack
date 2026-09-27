import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../../../../knowledge/security_baseline.md');

export class SecurityResources {
  @Resource({
    uri: 'security://baseline',
    name: 'Security Baseline',
    description: 'Baseline security policies, STRIDE categories, data classification, and vendor risk criteria',
    mimeType: 'text/markdown'
  })
  async getBaseline(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching security baseline');
    const baseline = fs.readFileSync(BASELINE_PATH, 'utf-8');

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: baseline
      }]
    };
  }
}