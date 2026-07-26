import { ResourceDecorator as Resource, ControllerDecorator as Controller } from '@nitrostack/core';
import { CIService } from './ci.service.js';

const ciServiceInstance = new CIService();

@Controller()
export class CIResources {
  constructor(private readonly ciService: CIService) {
    this.getRawLogs = this.getRawLogs.bind(this);
    this.getPipelineContext = this.getPipelineContext.bind(this);
  }

  @Resource({
    name: 'raw_logs',
    uri: 'ci://{owner}/{repo}/pipeline/{run_id}/raw-logs',
    description: 'Read-only stream containing unredacted raw build logs'
  })
  async getRawLogs(uri: string, params: { owner: string, repo: string, run_id: string }) {
    return {
      contents: [{ uri, text: await ciServiceInstance.fetchRawLogs(params.owner, params.repo, params.run_id) }]
    };
  }

  @Resource({
    name: 'pipeline_context',
    uri: 'ci://{owner}/{repo}/pipeline/{run_id}/context',
    description:
      'Graph-grounded CI failure context. Returns a structured, LLM-ready text summary of the pipeline ' +
      'failure: failed jobs, steps, classified errors, changed files, and graph-heuristic suggested fix targets. ' +
      'Built server-side by the CI GraphRAG engine — use this as primary context for root-cause analysis.'
  })
  async getPipelineContext(uri: string, params: { owner: string, repo: string, run_id: string }) {
    return {
      contents: [{
        uri,
        text: await ciServiceInstance.buildCiGraphragContext(params.owner, params.repo, params.run_id)
      }]
    };
  }
}
