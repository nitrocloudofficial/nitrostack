/**
 * DevOps Navigator — reconstructs the delivery pipeline and the commit contract.
 *
 * The commit-message convention matters more than it looks: it is the single
 * most common way generated code gets rejected by a legacy team's CI, and it is
 * almost never written down anywhere an LLM would look.
 */
import { Injectable } from '@nitrostack/core';
import * as path from 'path';
import { WorkspaceService } from '../../shared/services/workspace.service.js';

export interface PipelineDefinition {
  file: string;
  system: 'jenkins' | 'github-actions' | 'gitlab-ci' | 'circleci' | 'unknown';
  stages: { name: string; commands: string[]; condition?: string; gated?: string }[];
  triggers: string[];
  agents: string[];
  secrets: string[];
}

export interface CommitConvention {
  source: string;
  pattern: string;
  types: string[];
  scopes: string[];
  requiresTicketRef: boolean;
  maxHeaderLength?: number;
  example: string;
}

export interface DevOpsReport {
  target: string;
  pipelines: PipelineDefinition[];
  branchModel: { branch: string; role: string; deploysTo?: string }[];
  commitConvention: CommitConvention | null;
  deploymentTargets: string[];
  manualApprovalGates: { pipeline: string; stage: string; who: string }[];
}

@Injectable({ deps: [WorkspaceService] })
export class DevOpsService {
  constructor(private workspace: WorkspaceService) {}

  analyse(target: string): DevOpsReport {
    const walk = this.workspace.walk(target);
    const pipelines: PipelineDefinition[] = [];
    let commitConvention: CommitConvention | null = null;
    let contributing: { file: string; content: string } | null = null;
    let commitlint: { file: string; content: string } | null = null;

    for (const abs of walk.files) {
      const rel = this.workspace.rel(target, abs);
      const base = path.basename(abs);
      const content = this.workspace.read(abs);
      if (content === null) continue;

      if (base === 'Jenkinsfile') pipelines.push(this.parseJenkinsfile(rel, content));
      else if (/^\.github\/workflows\/.+\.ya?ml$/.test(rel)) pipelines.push(this.parseGithubActions(rel, content));
      else if (base === '.gitlab-ci.yml') pipelines.push(this.parseGitlab(rel, content));
      else if (base === 'commitlint.config.js' || base === '.commitlintrc.json') commitlint = { file: rel, content };
      else if (base === 'CONTRIBUTING.md') contributing = { file: rel, content };
    }

    if (commitlint) commitConvention = this.parseCommitlint(commitlint.file, commitlint.content, contributing?.content);
    else if (contributing) commitConvention = this.parseCommitConventionFromProse(contributing.file, contributing.content);

    return {
      target,
      pipelines,
      branchModel: this.inferBranchModel(pipelines, contributing?.content),
      commitConvention,
      deploymentTargets: [
        ...new Set(
          pipelines.flatMap((p) =>
            p.stages.filter((s) => /deploy|release|publish|promote/i.test(s.name)).map((s) => s.name)
          )
        ),
      ],
      manualApprovalGates: pipelines.flatMap((p) =>
        p.stages.filter((s) => s.gated).map((s) => ({ pipeline: p.file, stage: s.name, who: s.gated! }))
      ),
    };
  }

  /* ------------------------------- Jenkins ------------------------------- */

  private parseJenkinsfile(file: string, content: string): PipelineDefinition {
    const stages: PipelineDefinition['stages'] = [];

    // Match each `stage('Name') { ... }` and take its brace-balanced body.
    const stageRe = /stage\s*\(\s*['"]([^'"]+)['"]\s*\)\s*\{/g;
    let m: RegExpExecArray | null;
    while ((m = stageRe.exec(content)) !== null) {
      const body = this.balancedBlock(content, m.index + m[0].length - 1);
      stages.push({
        name: m[1],
        commands: [...body.matchAll(/\bsh\s+(?:'''|"""|'|")([\s\S]*?)(?:'''|"""|'|")/g)].map((c) =>
          c[1].trim().replace(/\s+/g, ' ')
        ),
        condition: body.match(/when\s*\{\s*branch\s+['"]([^'"]+)['"]/)?.[1],
        gated: body.match(/input\s*\{[\s\S]*?submitter\s+['"]([^'"]+)['"]/)?.[1]
          ?? (/input\s*\{/.test(body) ? 'manual approval' : undefined),
      });
    }

    return {
      file,
      system: 'jenkins',
      stages,
      triggers: [...content.matchAll(/triggers\s*\{([\s\S]*?)\}/g)].map((t) => t[1].trim()),
      agents: [...content.matchAll(/agent\s*\{\s*label\s+['"]([^'"]+)['"]/g)].map((a) => a[1]),
      secrets: [...content.matchAll(/credentials\(\s*['"]([^'"]+)['"]\s*\)/g)].map((s) => s[1]),
    };
  }

  /** Return the substring of a brace-balanced block starting at `openIdx` (the `{`). */
  private balancedBlock(text: string, openIdx: number): string {
    let depth = 0;
    for (let i = openIdx; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) return text.slice(openIdx + 1, i);
      }
    }
    return text.slice(openIdx + 1);
  }

  /* --------------------------- GitHub Actions --------------------------- */

  private parseGithubActions(file: string, content: string): PipelineDefinition {
    const stages: PipelineDefinition['stages'] = [];
    const lines = content.split('\n');

    // Indentation-aware scan: collect `- run:` / `- name:` pairs per job.
    let currentJob = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const jobMatch = line.match(/^ {2}([\w-]+):\s*$/);
      if (jobMatch && !['on', 'jobs', 'env', 'permissions'].includes(jobMatch[1])) currentJob = jobMatch[1];

      const nameMatch = line.match(/^\s*-\s*name:\s*(.+)$/);
      const runMatch = line.match(/^\s*(?:-\s*)?run:\s*(.+)$/);
      if (runMatch) {
        const label = nameMatch?.[1]?.trim() ?? `${currentJob}: ${runMatch[1].trim().slice(0, 40)}`;
        stages.push({ name: label.replace(/['"]/g, ''), commands: [runMatch[1].trim()] });
      } else if (nameMatch && lines[i + 1]?.includes('run:')) {
        const cmd = lines[i + 1].split('run:')[1]?.trim() ?? '';
        stages.push({ name: nameMatch[1].trim().replace(/['"]/g, ''), commands: [cmd] });
        i++;
      }
    }

    const onBlock = content.match(/^on:\s*\n([\s\S]*?)(?=\n\w|$)/m)?.[1] ?? '';
    return {
      file,
      system: 'github-actions',
      stages,
      triggers: [...onBlock.matchAll(/^\s{2}([\w_]+):/gm)].map((t) => t[1]),
      agents: [...content.matchAll(/runs-on:\s*(.+)/g)].map((a) => a[1].trim()),
      secrets: [...content.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((s) => s[1]),
    };
  }

  private parseGitlab(file: string, content: string): PipelineDefinition {
    return {
      file,
      system: 'gitlab-ci',
      stages: [...content.matchAll(/^([\w-]+):\s*\n(?:\s+.*\n)*?\s+script:/gm)].map((m) => ({
        name: m[1],
        commands: [],
      })),
      triggers: [],
      agents: [...content.matchAll(/image:\s*(.+)/g)].map((a) => a[1].trim()),
      secrets: [],
    };
  }

  /* --------------------------- commit contract --------------------------- */

  private parseCommitlint(file: string, content: string, contributing?: string): CommitConvention {
    const scopeBlock = content.match(/'scope-enum'\s*:\s*\[[^[]*\[([^\]]*)\]/);
    const scopes = scopeBlock ? [...scopeBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
    const maxHeader = Number(content.match(/'header-max-length'\s*:\s*\[\s*\d+\s*,\s*'[^']*'\s*,\s*(\d+)/)?.[1]);
    const requiresTicketRef =
      /'references-empty'\s*:\s*\[\s*2/.test(content) ||
      !!contributing?.match(/mandatory|CI rejects commits without/i);

    return {
      source: file,
      pattern: '<type>(<scope>): <subject>' + (requiresTicketRef ? '   [TICKET-KEY]' : ''),
      types: this.extractTypes(contributing) ?? ['feat', 'fix', 'perf', 'refactor', 'test', 'chore', 'docs'],
      scopes,
      requiresTicketRef,
      maxHeaderLength: Number.isFinite(maxHeader) ? maxHeader : undefined,
      example: this.extractExample(contributing) ?? 'fix(scope): concise subject   [TICKET-123]',
    };
  }

  private parseCommitConventionFromProse(file: string, content: string): CommitConvention | null {
    const fenced = content.match(/```\s*\n(<type>[\s\S]*?)\n```/)?.[1]?.trim();
    if (!fenced) return null;
    return {
      source: file,
      pattern: fenced,
      types: this.extractTypes(content) ?? [],
      scopes: this.extractScopes(content) ?? [],
      requiresTicketRef: /mandatory|rejects commits without/i.test(content),
      example: this.extractExample(content) ?? '',
    };
  }

  private extractTypes(content?: string): string[] | null {
    const m = content?.match(/\*\*type\*\*:\s*(.+)/);
    return m ? m[1].split('|').map((t) => t.trim()).filter(Boolean) : null;
  }

  private extractScopes(content?: string): string[] | null {
    const m = content?.match(/\*\*scope\*\*:\s*(.+)/);
    return m ? m[1].split('|').map((t) => t.trim()).filter(Boolean) : null;
  }

  private extractExample(content?: string): string | null {
    return content?.match(/Example:\s*`([^`]+)`/)?.[1] ?? null;
  }

  private inferBranchModel(pipelines: PipelineDefinition[], contributing?: string): DevOpsReport['branchModel'] {
    const model = new Map<string, { branch: string; role: string; deploysTo?: string }>();

    for (const p of pipelines) {
      for (const stage of p.stages) {
        if (!stage.condition) continue;
        const deploysTo = /deploy|promote/i.test(stage.name) ? stage.name : undefined;
        const existing = model.get(stage.condition);
        model.set(stage.condition, {
          branch: stage.condition,
          role: existing?.role ?? 'pipeline-triggering branch',
          deploysTo: deploysTo ?? existing?.deploysTo,
        });
      }
    }

    if (contributing) {
      for (const m of contributing.matchAll(/`([\w/*-]+)`\s*=\s*([^.\n]+)/g)) {
        model.set(m[1], { branch: m[1], role: m[2].trim(), deploysTo: model.get(m[1])?.deploysTo });
      }
      for (const m of contributing.matchAll(/(Feature|Hotfix)(?:es)?\s+branch(?:es)?[^`]*`([^`]+)`/gi)) {
        model.set(m[2], { branch: m[2], role: `${m[1].toLowerCase()} branch naming pattern` });
      }
    }

    return [...model.values()];
  }
}
