import { Injectable, ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { DevOpsService } from './devops.service.js';
import {
  WorkspaceService,
  describeSource,
  type TargetHandle,
} from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { TargetSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact } from '../../shared/schemas/index.js';

@Injectable({ deps: [DevOpsService, WorkspaceService, StoreService] })
export class DevOpsTools {
  constructor(
    private devops: DevOpsService,
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'parse_ci_cd_pipelines',
    title: 'Parse CI/CD pipelines',
    description:
      'DevOps Navigator. Extracts the real delivery pipeline from Jenkinsfiles, GitHub ' +
      'Actions workflows and GitLab CI configs: stages, shell commands, branch conditions, ' +
      'manual approval gates and referenced secrets. Also recovers the commit-message ' +
      'convention enforced by commitlint or CONTRIBUTING — the single most common reason ' +
      "generated commits get rejected by a legacy team's CI.",
    inputSchema: TargetSchema,
    examples: {
      request: {},
      response: {
        pipelines: [{ file: 'Jenkinsfile', system: 'jenkins', stages: [{ name: 'Lint', commands: ['npm run lint'] }] }],
        commitConvention: { pattern: '<type>(<scope>): <subject>   [TICKET-KEY]', requiresTicketRef: true },
        manualApprovalGates: [{ pipeline: 'Jenkinsfile', stage: 'Deploy to PROD', who: 'release-managers' }],
      },
    },
  })
  async parseCiCdPipelines(input: { target?: string }, ctx: ExecutionContext) {
    // Remote targets are cloned by acquireTarget and deleted in the finally.
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      return this.pipelines(handle, ctx);
    } finally {
      await handle.cleanup();
    }
  }

  private pipelines(handle: TargetHandle, ctx: ExecutionContext) {
    const target = handle.root;
    const report = this.devops.analyse(target);
    ctx.logger.info('DevOps Navigator complete', { pipelines: report.pipelines.length });

    const facts: KnowledgeFact[] = [];

    for (const p of report.pipelines) {
      facts.push({
        id: `cicd:pipeline:${p.file}`,
        agent: 'devops-navigator',
        category: 'cicd',
        title: `${p.system} pipeline (${p.file})`,
        detail:
          `Stages in order: ${p.stages.map((s) => s.name).join(' → ')}.` +
          (p.agents.length ? ` Runs on: ${p.agents.join(', ')}.` : '') +
          (p.secrets.length ? ` Uses secrets: ${p.secrets.join(', ')}.` : ''),
        evidence: [p.file],
        weight: 5,
      });
    }

    if (report.commitConvention) {
      const c = report.commitConvention;
      facts.push({
        id: 'cicd:commit-convention',
        agent: 'devops-navigator',
        category: 'cicd',
        title: 'Commit message convention (CI-enforced)',
        detail:
          `Format: \`${c.pattern}\`. ` +
          (c.types.length ? `Types: ${c.types.join(', ')}. ` : '') +
          (c.scopes.length ? `Scopes: ${c.scopes.join(', ')}. ` : '') +
          (c.requiresTicketRef ? 'A ticket key is MANDATORY — CI rejects commits without one. ' : '') +
          (c.maxHeaderLength ? `Header max ${c.maxHeaderLength} chars. ` : '') +
          (c.example ? `Example: \`${c.example}\`` : ''),
        evidence: [c.source],
        weight: 5,
      });
    }

    if (report.manualApprovalGates.length) {
      facts.push({
        id: 'cicd:approval-gates',
        agent: 'devops-navigator',
        category: 'cicd',
        title: 'Manual approval gates',
        detail: report.manualApprovalGates
          .map((g) => `"${g.stage}" in ${g.pipeline} requires approval from ${g.who}`)
          .join('; '),
        evidence: report.manualApprovalGates.map((g) => g.pipeline),
        weight: 4,
      });
    }

    if (report.branchModel.length) {
      facts.push({
        id: 'cicd:branch-model',
        agent: 'devops-navigator',
        category: 'cicd',
        title: 'Branch model',
        detail: report.branchModel
          .map((b) => `${b.branch}: ${b.role}${b.deploysTo ? ` (${b.deploysTo})` : ''}`)
          .join('; '),
        evidence: report.pipelines.map((p) => p.file),
        weight: 4,
      });
    }

    this.store.clearAgentFacts('devops-navigator');
    this.store.addFacts(facts);

    return { ...report, source: describeSource(handle) };
  }
}
