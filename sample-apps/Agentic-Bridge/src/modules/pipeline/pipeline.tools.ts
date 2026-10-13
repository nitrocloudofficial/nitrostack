import { Injectable, ToolDecorator as Tool, Widget, ExecutionContext, z, UseGuards } from '@nitrostack/core';
import { AdminGuard } from '../../shared/security/admin.guard.js';
import { PipelineService, NODE_CATALOG } from './pipeline.service.js';
import { EffectsService } from './effects.service.js';
import { StoreService } from '../../shared/services/store.service.js';
import {
  WorkspaceService,
  describeSource,
  type TargetHandle,
} from '../../shared/services/workspace.service.js';
import { PipelineGraphSchema, PIPELINE_NODE_TYPES } from '../../shared/schemas/index.js';
import type { PipelineGraph } from '../../shared/schemas/index.js';

@Injectable({ deps: [PipelineService, StoreService, EffectsService, WorkspaceService] })
export class PipelineTools {
  constructor(
    private pipeline: PipelineService,
    private store: StoreService,
    private effects: EffectsService,
    private workspace: WorkspaceService
  ) {}

  @Tool({
    name: 'list_pipeline_nodes',
    title: 'List pipeline nodes',
    description:
      'Returns the catalog of stages the administrator can compose into an SDLC pipeline, ' +
      'with each stage\'s category, the backing MCP tool, and whether it performs a real side ' +
      'effect. Feeds the node palette in the pipeline-builder widget.',
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: {
        nodeCount: 11,
        nodes: [{ type: 'understand', label: 'Understand', category: 'cognitive', sideEffecting: false }],
      },
    },
  })
  @Widget('pipeline-builder')
  async listPipelineNodes() {
    return {
      nodeCount: NODE_CATALOG.length,
      nodes: NODE_CATALOG,
      savedPipelines: this.store.all('pipelines').map((p) => ({ name: p.name, stages: p.nodes.length })),
    };
  }

  @Tool({
    name: 'save_pipeline',
    title: 'Save a pipeline',
    description:
      'Persists a pipeline graph composed in the builder. Validates that node ids are unique, ' +
      'every edge points at a real node, and the graph is acyclic (topological sort) before ' +
      'storing it. Called by the pipeline-builder widget\'s Save button.',
    inputSchema: PipelineGraphSchema,
    examples: {
      request: {
        name: 'Aurora feature SDLC',
        description: 'Standard path for a billing feature',
        nodes: [
          { id: 'n1', type: 'understand', requiresApproval: false, config: {} },
          { id: 'n2', type: 'explore', requiresApproval: false, config: {} },
          { id: 'n3', type: 'design', requiresApproval: true, config: {} },
        ],
        edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }],
      },
      response: { saved: true, executionOrder: ['n1', 'n2', 'n3'] },
    },
  })
  @Widget('pipeline-builder')
  @UseGuards(AdminGuard)
  async savePipeline(input: PipelineGraph, ctx: ExecutionContext) {
    const order = this.pipeline.validateAndOrder(input);
    this.store.savePipeline(input);
    ctx.logger.info('Pipeline saved', { name: input.name, stages: input.nodes.length });

    return {
      saved: true,
      name: input.name,
      stageCount: input.nodes.length,
      executionOrder: order,
      approvalGates: input.nodes.filter((n) => n.requiresApproval).map((n) => n.id),
      nodes: NODE_CATALOG,
      savedPipelines: this.store.all('pipelines').map((p) => ({ name: p.name, stages: p.nodes.length })),
      pipeline: input,
    };
  }

  @Tool({
    name: 'get_pipeline',
    title: 'Get a saved pipeline',
    description: 'Returns a saved pipeline graph by name, or the most recently saved one.',
    inputSchema: z.object({
      name: z.string().optional().describe('Pipeline name. Omit for the most recent.'),
    }),
    examples: { request: {}, response: { found: true } },
  })
  @Widget('pipeline-builder')
  async getPipeline(input: { name?: string }) {
    const pipeline = this.store.getPipeline(input.name);
    return {
      found: !!pipeline,
      pipeline,
      nodes: NODE_CATALOG,
      savedPipelines: this.store.all('pipelines').map((p) => ({ name: p.name, stages: p.nodes.length })),
    };
  }

  @Tool({
    name: 'run_pipeline',
    title: 'Run a pipeline',
    description:
      'Executes a saved pipeline against a feature request. Cognitive stages (understand, ' +
      'think, explore, design, develop, write_tests) query the knowledge base and return ' +
      'grounded output on every run. Side-effecting stages (run_tests, push, deploy, ' +
      'update_jira, send_slack_message) are PLANNED by default and report the exact command ' +
      'or API call they would issue. Pass execute_side_effects=true to perform them for real: ' +
      "the test command runs, git commits and pushes, CI is dispatched, the Jira ticket moves " +
      'and Slack is notified — for whichever integrations are configured. Supports MCP task ' +
      'progress.',
    inputSchema: z.object({
      task: z.string().min(3).describe('The feature request to run through the pipeline'),
      pipeline_name: z.string().optional().describe('Which saved pipeline to run. Omit for the most recent.'),
      execute_side_effects: z
        .boolean()
        .default(false)
        .describe(
          'Perform side effects for real instead of planning them. Runs the test command, ' +
            'commits and pushes, dispatches CI, transitions the Jira ticket and posts to Slack. ' +
            'Only the integrations that are actually configured will fire.'
        ),
      target: z
        .string()
        .optional()
        .describe(
          'Repository the side-effecting stages act on. Defaults to the bundled legacy fixture.'
        ),
    }),
    taskSupport: 'optional',
    examples: {
      request: { task: 'Add pagination to the customer tier listing' },
      response: {
        pipeline: 'Aurora feature SDLC',
        executed: 4,
        planned: 3,
        sideEffectsMode: 'planned',
        results: [{ id: 'n1', type: 'understand', status: 'ok', executed: true }],
      },
    },
  })
  @Widget('pipeline-builder')
  @UseGuards(AdminGuard)
  async runPipeline(
    input: { task: string; pipeline_name?: string; execute_side_effects?: boolean; target?: string },
    ctx: ExecutionContext
  ) {
    const pipeline = this.store.getPipeline(input.pipeline_name);
    if (!pipeline) {
      throw new Error(
        input.pipeline_name
          ? `No saved pipeline named "${input.pipeline_name}".`
          : 'No pipeline has been saved yet. Compose one in the pipeline-builder widget or call save_pipeline.'
      );
    }

    const executeSideEffects = input.execute_side_effects === true;
    // Acquired through the workspace allow-list even in plan mode, so a bad
    // target fails immediately rather than at the first stage that touches disk.
    const handle = await this.workspace.acquireTarget(input.target);
    try {
      // A shallow clone in a temp directory is the wrong place to commit, push
      // or deploy from: the working tree disappears the moment this call
      // returns, so a "successful" push would be unreviewable and a failed one
      // would be inexplicable. Analysis stages are fine; mutations are not.
      if (executeSideEffects && handle.remote) {
        throw new Error(
          `Refusing to execute side effects against ${handle.label}: it is a temporary shallow ` +
            `clone that is deleted when this call returns. Run the pipeline in plan mode against ` +
            `the URL, or pass a local checkout as \`target\` to execute for real.`
        );
      }
      return await this.executePipeline(input, ctx, pipeline, handle, executeSideEffects);
    } finally {
      await handle.cleanup();
    }
  }

  private async executePipeline(
    input: { task: string; execute_side_effects?: boolean },
    ctx: ExecutionContext,
    pipeline: PipelineGraph,
    handle: TargetHandle,
    executeSideEffects: boolean
  ) {
    const target = handle.root;
    const order = this.pipeline.validateAndOrder(pipeline);
    const byId = new Map(pipeline.nodes.map((n) => [n.id, n]));
    const results = [];

    for (const [index, id] of order.entries()) {
      const node = byId.get(id)!;
      ctx.task?.throwIfCancelled();
      ctx.task?.updateProgress(`[${index + 1}/${order.length}] ${node.label ?? node.type}`);

      const result = await this.pipeline.executeNode(node, input.task, {
        executeSideEffects,
        target,
      });
      results.push(result);

      if (result.status === 'paused') {
        ctx.task?.requestInput(`Pipeline paused at "${result.label}" — administrator approval required.`);
        ctx.logger.info('Pipeline paused for approval', { node: id });
        break;
      }
      // A real side effect that failed stops the line. Continuing past a red
      // test suite to push and deploy is precisely the behaviour an SDLC exists
      // to prevent.
      if (result.status === 'failed' && executeSideEffects) {
        ctx.logger.warn('Pipeline halted on a failed stage', { node: id, error: result.error });
        break;
      }
    }

    ctx.logger.info('Pipeline run complete', {
      pipeline: pipeline.name,
      stages: results.length,
      sideEffects: executeSideEffects,
    });

    const failed = results.find((r) => r.status === 'failed');

    return {
      pipeline: pipeline.name,
      task: input.task,
      target: handle.label,
      source: describeSource(handle),
      stageCount: order.length,
      completed: results.length,
      executed: results.filter((r) => r.executed).length,
      planned: results.filter((r) => !r.executed).length,
      pausedAt: results.find((r) => r.status === 'paused')?.id,
      failedAt: failed?.id,
      sideEffectsMode: executeSideEffects ? 'executed' : 'planned',
      integrations: this.effects.describeConfiguration(),
      results,
      note: executeSideEffects
        ? 'Side effects were performed for real against the configured integrations. Stages ' +
          'still showing executed:false had no integration configured — the result says which ' +
          'variable enables each one.'
        : 'Stages with executed:false were planned, not performed. Pass execute_side_effects=true ' +
          'to run the test command, commit and push, dispatch CI, move the Jira ticket and post ' +
          'to Slack for real.',
      nodes: NODE_CATALOG,
      savedPipelines: this.store.all('pipelines').map((p) => ({ name: p.name, stages: p.nodes.length })),
    };
  }

  @Tool({
    name: 'query_knowledge',
    title: 'Query the knowledge base',
    description:
      'Semantic search over everything the swarm learned. Ranks facts by cosine similarity ' +
      'against the query, weighted by how load-bearing each fact is. This is what the ' +
      '"Understand" and "Explore" pipeline stages run under the hood, exposed directly so an ' +
      'agent can ask the knowledge base a question mid-task.',
    inputSchema: z.object({
      query: z.string().min(2).describe('What you want to know about the codebase or the team'),
      limit: z.number().min(1).max(30).default(8).describe('How many facts to return'),
      category: z
        .enum(['architecture', 'dependency', 'testing', 'cicd', 'agile', 'consensus', 'design-system', 'skill', 'manual'])
        .optional()
        .describe('Restrict the search to one category'),
    }),
    examples: {
      request: { query: 'how do I write a test here', limit: 5 },
      response: { resultCount: 5, results: [{ title: 'Coverage gate', score: 0.42 }] },
    },
  })
  async queryKnowledge(input: { query: string; limit?: number; category?: string }) {
    let results = this.pipeline.search(input.query, (input.limit ?? 8) * 3);
    if (input.category) {
      const allowed = new Set(
        this.store.factsByCategory(input.category as never).map((f) => f.id)
      );
      results = results.filter((r) => allowed.has(r.id));
    }
    results = results.slice(0, input.limit ?? 8);

    return {
      query: input.query,
      resultCount: results.length,
      totalFacts: this.store.all('knowledge').length,
      results,
    };
  }
}
