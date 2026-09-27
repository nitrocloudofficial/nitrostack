import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';

export class RecruiterResources {
  @Resource({
    name: 'candidate_report',
    description: 'A detailed JSON report of a merged candidate profile.',
    uri: 'candidate://{candidate_id}/report.json',
    mimeType: 'application/json'
  })
  async getCandidateReport(uri: string, ctx: ExecutionContext) {
    const match = uri.match(/candidate:\/\/([^/]+)\/report\.json/);
    const candidate_id = match ? match[1] : 'unknown';

    const outputsDir = path.join(process.cwd(), 'outputs');
    const reportPath = path.join(outputsDir, `${candidate_id}.json`);

    if (!fs.existsSync(reportPath)) {
      throw new Error(`Candidate report for ${candidate_id} not found.`);
    }

    const content = fs.readFileSync(reportPath, 'utf8');
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: content
      }]
    };
  }
}
