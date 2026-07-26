#!/usr/bin/env node
import { Module, ToolDecorator as Tool, ResourceDecorator as Resource, Injectable, McpApp, McpApplicationFactory, z } from '@nitrostack/core';
import { Sanitizer } from '@omnitrace/sanitizer';
import { Octokit } from '@octokit/rest';

@Injectable()
export class CIService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  }

  public async fetchFailedJobLogs(owner: string, repo: string, jobId: string, tailLines: number, filter?: string): Promise<string> {
    try {
      const response = await this.octokit.actions.downloadJobLogsForWorkflowRun({
        owner,
        repo,
        job_id: parseInt(jobId, 10),
      });
      let rawLogs = response.data as string;
      if (filter) {
        rawLogs = rawLogs.split('\n').filter(l => l.includes(filter)).join('\n');
      }
      const lines = rawLogs.split('\n');
      const logs = lines.slice(Math.max(lines.length - tailLines, 0)).join('\n');
      return Sanitizer.scrub(logs);
    } catch (error: any) {
      return `[ERROR] Failed to fetch logs for job ${jobId}: ${error.message}`;
    }
  }

  public async fetchPipelineContext(owner: string, repo: string, runId: string): Promise<string> {
    try {
      const response = await this.octokit.actions.getWorkflowRun({
        owner,
        repo,
        run_id: parseInt(runId, 10),
      });
      return Sanitizer.scrub(JSON.stringify({
        run_id: response.data.id,
        commit_sha: response.data.head_sha,
        author: response.data.head_commit?.author?.email || 'unknown',
        status: response.data.status,
        conclusion: response.data.conclusion,
      }));
    } catch (error: any) {
      return `[ERROR] Failed to fetch pipeline context for run ${runId}: ${error.message}`;
    }
  }

  public async fetchRawLogs(owner: string, repo: string, runId: string): Promise<string> {
    try {
      const response = await this.octokit.actions.downloadWorkflowRunLogs({
        owner,
        repo,
        run_id: parseInt(runId, 10),
      });
      // The endpoint returns a zip file of all logs, we might just return a summary or link for resources
      return Sanitizer.scrub(`[NOTE] Raw logs downloaded for pipeline ${runId}. (Zip archive returned by GitHub API)`);
    } catch (error: any) {
      return `[ERROR] Failed to fetch raw logs for run ${runId}: ${error.message}`;
    }
  }
}

@McpApp({ 
  module: CIServer, 
  server: { name: 'ci-mcp', version: '1.0.0' },
  logging: { level: 'error' }
})
@Module({
  name: 'ci',
  imports: [],
  providers: [CIService]
})
export class CIServer {
  constructor(private readonly ciService: CIService) {}

  @Tool({
    name: 'get_failed_job_logs',
    description: 'Fetch log output for a failed CI job run',
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
      job_id: z.string(),
      tail_lines: z.number().default(200),
      step_filter: z.string().optional()
    })
  })
  async getFailedJobLogs(args: { owner: string, repo: string, job_id: string, tail_lines: number, step_filter?: string }) {
    const logs = await this.ciService.fetchFailedJobLogs(args.owner, args.repo, args.job_id, args.tail_lines, args.step_filter);
    return logs.length > 4000 ? logs.substring(0, 4000) : logs;
  }

  @Tool({
    name: 'get_pipeline_context',
    description: 'Returns metadata associated with the build failure',
    inputSchema: z.object({ owner: z.string(), repo: z.string(), run_id: z.string() })
  })
  async getPipelineContext(args: { owner: string, repo: string, run_id: string }) {
    return await this.ciService.fetchPipelineContext(args.owner, args.repo, args.run_id);
  }

  @Resource({
    name: 'raw_logs',
    uri: 'ci://{owner}/{repo}/pipeline/{run_id}/raw-logs',
    description: 'Read-only stream containing unredacted raw build logs'
  })
  async getRawLogs(uri: string, params: { owner: string, repo: string, run_id: string }) {
    return {
      contents: [{ uri, text: await this.ciService.fetchRawLogs(params.owner, params.repo, params.run_id) }]
    };
  }
}

async function bootstrap() {
  const server = await McpApplicationFactory.create(CIServer);
  await server.start();
}
bootstrap().catch(console.error);
