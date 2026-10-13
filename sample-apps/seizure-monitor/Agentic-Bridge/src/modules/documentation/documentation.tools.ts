import { Injectable, ToolDecorator as Tool, ExecutionContext } from '@nitrostack/core';
import { DocumentationService } from './documentation.service.js';
import {
  WorkspaceService,
  describeSource,
  type TargetHandle,
} from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { TargetSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact } from '../../shared/schemas/index.js';

@Injectable({ deps: [DocumentationService, WorkspaceService, StoreService] })
export class DocumentationTools {
  constructor(
    private docs: DocumentationService,
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'parse_package_specs',
    title: 'Parse dependency manifests',
    description:
      'Documentation Synthesizer. Reads package.json, pom.xml, requirements.txt and go.mod ' +
      'across the repository, producing one deduplicated dependency inventory with upstream ' +
      'documentation URLs, plus flags for packages pinned well behind current practice so an ' +
      'agent does not generate code against APIs this project cannot run.',
    inputSchema: TargetSchema,
    examples: {
      request: {},
      response: {
        manifests: ['package.json', 'pom.xml', 'requirements.txt'],
        byEcosystem: { npm: 12, maven: 4, pypi: 5 },
        agingSignals: [{ name: 'react', version: '16.14.0', note: 'React 16/17 — no concurrent features' }],
      },
    },
  })
  async parsePackageSpecs(input: { target?: string }, ctx: ExecutionContext) {
    // A GitHub URL is cloned by acquireTarget and released in the finally; the
    // analysis body below is unaware of the difference.
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      return this.synthesize(handle, ctx);
    } finally {
      await handle.cleanup();
    }
  }

  private synthesize(handle: TargetHandle, ctx: ExecutionContext) {
    const target = handle.root;
    const report = this.docs.analyse(target);
    ctx.logger.info('Documentation Synthesizer complete', {
      manifests: report.manifests.length,
      dependencies: report.dependencies.length,
    });

    const facts: KnowledgeFact[] = [
      {
        id: 'dep:inventory',
        agent: 'documentation-synthesizer',
        category: 'dependency',
        title: 'Dependency inventory',
        detail: Object.entries(report.byEcosystem)
          .map(([eco, n]) => `${eco}: ${n} package(s)`)
          .join(', '),
        evidence: report.manifests,
        weight: 3,
      },
      ...report.agingSignals.map<KnowledgeFact>((s) => ({
        id: `dep:aging:${s.name}`,
        agent: 'documentation-synthesizer',
        category: 'dependency',
        title: `Pinned old: ${s.name}@${s.version}`,
        detail: s.note,
        evidence: report.manifests,
        weight: 4,
      })),
      ...report.internalDocs.slice(0, 8).map<KnowledgeFact>((d) => ({
        id: `dep:doc:${d.path}`,
        agent: 'documentation-synthesizer',
        category: 'dependency',
        title: `Internal doc: ${d.title}`,
        detail: d.excerpt,
        evidence: [d.path],
        weight: 2,
      })),
    ];

    this.store.clearAgentFacts('documentation-synthesizer');
    this.store.addFacts(facts);

    // Runtime deps are the load-bearing ones; trim dev noise from the payload.
    return {
      ...report,
      source: describeSource(handle),
      dependencies: report.dependencies.filter((d) => d.scope !== 'dev').slice(0, 80),
      devDependencyCount: report.dependencies.filter((d) => d.scope === 'dev').length,
    };
  }
}
