import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext } from '@nitrostack/core';
import { UiUxService } from './uiux.service.js';
import {
  WorkspaceService,
  describeSource,
  type TargetHandle,
} from '../../shared/services/workspace.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import { TargetSchema } from '../../shared/schemas/index.js';
import type { KnowledgeFact } from '../../shared/schemas/index.js';

@Injectable({ deps: [UiUxService, WorkspaceService, StoreService] })
export class UiUxTools {
  constructor(
    private uiux: UiUxService,
    private workspace: WorkspaceService,
    private store: StoreService
  ) {}

  @Tool({
    name: 'parse_design_system',
    title: 'Parse design system',
    description:
      'UI/UX Integrator. Extracts the corporate design language: CSS custom properties, ' +
      'Tailwind theme tokens, the approved colour palette and type stack, and the reusable ' +
      'component inventory ranked by real usage. Also flags ad-hoc hex colours that violate ' +
      'the token set, so generated UI matches the house style instead of inventing one.',
    inputSchema: TargetSchema,
    // Studio renders this in the widget preview before the tool is ever run, so
    // it has to be a faithful sample of the real shape. A component without
    // `props` previously crashed the preview on `component.props.length`.
    examples: {
      request: {},
      response: {
        framework: ['Tailwind CSS', 'CSS custom properties', 'React'],
        tokens: [
          { name: '--aur-space-gutter', value: '18px', category: 'spacing' },
          { name: '--aur-radius-card', value: '2px', category: 'radius' },
        ],
        palette: [
          { name: 'aurora-navy', value: '#0B2545' },
          { name: 'aurora-signal', value: '#C1440E' },
        ],
        typography: [{ name: 'sans', value: "'Inter Tight', 'Helvetica Neue', sans-serif" }],
        components: [
          {
            name: 'DataTable',
            path: 'web/src/components/DataTable.jsx',
            usageCount: 1,
            props: ['columns={…}', 'rows={…}', 'onRowClick={…}'],
            note: 'Canonical table. Every list view in Aurora MUST use this, not a raw <table>.',
          },
        ],
        adHocColors: [],
        note: 'Aurora Design Language v3 — approved by Brand Council 2019-04. Do not add ad-hoc colours.',
      },
    },
  })
  @Widget('design-system')
  async parseDesignSystem(input: { target?: string }, ctx: ExecutionContext) {
    // Remote targets are cloned by acquireTarget and deleted in the finally.
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      return this.designSystem(handle, ctx);
    } finally {
      await handle.cleanup();
    }
  }

  private designSystem(handle: TargetHandle, ctx: ExecutionContext) {
    const target = handle.root;
    const report = this.uiux.analyse(target);
    ctx.logger.info('UI/UX Integrator complete', {
      tokens: report.tokens.length,
      components: report.components.length,
    });

    const facts: KnowledgeFact[] = [];

    if (report.palette.length) {
      facts.push({
        id: 'ui:palette',
        agent: 'uiux-integrator',
        category: 'design-system',
        title: 'Approved colour palette',
        detail:
          'Use ONLY these colour tokens. Never introduce a raw hex value:\n' +
          report.palette.map((p) => `  ${p.name} = ${p.value}`).join('\n'),
        evidence: [...new Set(report.tokens.filter((t) => t.category === 'color').map((t) => t.source))],
        weight: 5,
      });
    }

    if (report.typography.length) {
      facts.push({
        id: 'ui:typography',
        agent: 'uiux-integrator',
        category: 'design-system',
        title: 'Typography',
        detail: report.typography.map((t) => `${t.name}: ${t.value}`).join('\n'),
        evidence: [...new Set(report.tokens.filter((t) => t.category === 'font').map((t) => t.source))],
        weight: 4,
      });
    }

    if (report.components.length) {
      facts.push({
        id: 'ui:components',
        agent: 'uiux-integrator',
        category: 'design-system',
        title: 'Reusable component inventory',
        detail:
          'Compose from these before writing new markup:\n' +
          report.components
            .map((c) => `  <${c.name} ${c.props.map((p) => `${p}={…}`).join(' ')} />  — ${c.path}${c.doc ? ` — ${c.doc}` : ''}`)
            .join('\n'),
        evidence: report.components.map((c) => c.path),
        weight: 5,
      });
    }

    const spacing = report.tokens.filter((t) => ['spacing', 'radius', 'elevation', 'duration'].includes(t.category));
    if (spacing.length) {
      facts.push({
        id: 'ui:scale',
        agent: 'uiux-integrator',
        category: 'design-system',
        title: 'Spacing, radius and motion scale',
        detail: spacing.map((t) => `${t.name} = ${t.value}`).join('\n'),
        evidence: [...new Set(spacing.map((t) => t.source))],
        weight: 3,
      });
    }

    for (const [i, convention] of report.conventions.entries()) {
      facts.push({
        id: `ui:convention:${i}`,
        agent: 'uiux-integrator',
        category: 'design-system',
        title: 'Design system rule',
        detail: convention,
        evidence: [],
        weight: 4,
      });
    }

    this.store.clearAgentFacts('uiux-integrator');
    this.store.addFacts(facts);

    return { ...report, source: describeSource(handle) };
  }
}
