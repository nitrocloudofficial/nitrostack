import { Injectable, ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { QaService } from './qa.service.js';
import {
  WorkspaceService,
  describeSource,
  type TargetHandle,
} from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { TargetSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact } from '../../shared/schemas/index.js';

@Injectable({ deps: [QaService, WorkspaceService, StoreService] })
export class QaTools {
  constructor(
    private qa: QaService,
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'extract_test_strategy',
    title: 'Extract testing strategy',
    description:
      'Quality Assurance Analyst. Recovers the testing contract an AI must satisfy: which ' +
      'runners are configured, where specs actually live on disk, the naming convention in ' +
      'force, the coverage gate that fails the build, the lint rules that bounce a PR, and ' +
      'the written policies in CONTRIBUTING that no config file encodes.',
    inputSchema: TargetSchema,
    examples: {
      request: {},
      response: {
        frameworks: [{ name: 'Jest', ecosystem: 'node', configFile: 'jest.config.js' }],
        coverageThresholds: { lines: 78, statements: 78, functions: 75, branches: 70 },
        namingConvention: '<name>.spec.js — the dominant convention here',
      },
    },
  })
  async extractTestStrategy(input: { target?: string }, ctx: ExecutionContext) {
    // Remote targets are cloned by acquireTarget and deleted in the finally.
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      return this.strategy(handle, ctx);
    } finally {
      await handle.cleanup();
    }
  }

  private strategy(handle: TargetHandle, ctx: ExecutionContext) {
    const target = handle.root;
    const report = this.qa.analyse(target);
    ctx.logger.info('QA Analyst complete', { frameworks: report.frameworks.length });

    const facts: KnowledgeFact[] = [];

    if (report.frameworks.length) {
      facts.push({
        id: 'qa:frameworks',
        agent: 'qa-analyst',
        category: 'testing',
        title: 'Test frameworks in force',
        detail: report.frameworks.map((f) => `${f.name} (${f.ecosystem}) — ${f.detail}`).join('\n'),
        evidence: report.frameworks.map((f) => f.configFile),
        weight: 5,
      });
    }

    if (Object.keys(report.coverageThresholds).length) {
      facts.push({
        id: 'qa:coverage-gate',
        agent: 'qa-analyst',
        category: 'testing',
        title: 'Coverage gate',
        detail:
          'The build FAILS below these thresholds: ' +
          Object.entries(report.coverageThresholds).map(([k, v]) => `${k} ${v}%`).join(', '),
        evidence: report.frameworks.map((f) => f.configFile),
        weight: 5,
      });
    }

    facts.push({
      id: 'qa:naming',
      agent: 'qa-analyst',
      category: 'testing',
      title: 'Spec naming and location',
      detail:
        `Convention: ${report.namingConvention}. ` +
        (report.specLocations.length
          ? `Specs live in: ${report.specLocations.map((s) => `${s.directory} (${s.count})`).join(', ')}.`
          : 'No spec files found on disk.'),
      evidence: report.specLocations.map((s) => s.examplePath),
      weight: 4,
    });

    for (const lint of report.lintRules) {
      facts.push({
        id: `qa:lint:${lint.file}`,
        agent: 'qa-analyst',
        category: 'testing',
        title: `Lint rules (${lint.file})`,
        detail:
          (lint.extends.length ? `extends ${lint.extends.join(', ')}. ` : '') +
          lint.rules.map((r) => `${r.rule}=${r.setting}`).join(', '),
        evidence: [lint.file],
        weight: 4,
      });
    }

    if (report.formatter) {
      facts.push({
        id: 'qa:formatter',
        agent: 'qa-analyst',
        category: 'testing',
        title: 'Formatter settings',
        detail: Object.entries(report.formatter.settings).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', '),
        evidence: [report.formatter.file],
        weight: 3,
      });
    }

    for (const [i, policy] of report.writtenPolicies.entries()) {
      facts.push({
        id: `qa:policy:${i}`,
        agent: 'qa-analyst',
        category: 'testing',
        title: 'Written engineering policy',
        detail: policy,
        evidence: [],
        weight: 4,
      });
    }

    this.store.clearAgentFacts('qa-analyst');
    this.store.addFacts(facts);

    return { ...report, source: describeSource(handle) };
  }
}
