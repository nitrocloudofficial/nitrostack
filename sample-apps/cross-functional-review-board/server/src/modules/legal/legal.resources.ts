import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASELINE_PATH = path.resolve(__dirname, '../../../../knowledge/legal_baseline.md');

export class LegalResources {
  @Resource({
    uri: 'legal://baseline',
    name: 'Legal Baseline',
    description: 'Legal compliance standards, regulatory triggers, IP ownership, liability, and data processing laws',
    mimeType: 'text/markdown'
  })
  async getBaseline(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching legal baseline');
    const baseline = fs.existsSync(BASELINE_PATH)
      ? fs.readFileSync(BASELINE_PATH, 'utf-8')
      : '# Legal Baseline\nLegal evaluation standards.';

    return {
      contents: [{
        uri,
        mimeType: 'text/markdown',
        text: baseline
      }]
    };
  }
}
