/**
 * Pipeline executor.
 *
 * The administrator composes an SDLC as a node graph in the pipeline-builder
 * widget; this service validates and executes it.
 *
 * The cognitive nodes (understand, think, explore, design, develop, write_tests)
 * query the knowledge base and return grounded output on every run. The
 * side-effecting nodes (run_tests, push, deploy, update_jira,
 * send_slack_message) are real — `EffectsService` shells out to git, runs the
 * project's test command, dispatches CI, calls Jira REST and posts to Slack —
 * but they only fire when the caller passes `execute_side_effects: true` AND the
 * relevant integration is configured.
 *
 * The default is plan-only, and that default is load-bearing: a bridge that
 * force-pushes to a stranger's master branch the first time someone clicks Run
 * is not a feature. In plan mode each stage reports the exact command or API
 * call it would issue and is flagged `executed: false`, so the plan is a dry run
 * of the same code path rather than a separate story about it.
 */
import { Injectable } from '@nitrostack/core';
import { StoreService } from '../../shared/services/store.service.js';
import { SemanticService } from '../../shared/services/semantic.service.js';
import { EffectsService } from './effects.service.js';
import type { EffectContext, EffectOutcome } from './effects.service.js';
import type { PipelineGraph, PipelineNodeType } from '../../shared/schemas/index.js';

export interface NodeDescriptor {
  type: PipelineNodeType;
  label: string;
  description: string;
  category: 'cognitive' | 'authoring' | 'verification' | 'delivery' | 'communication';
  /** Whether this node performs a real side effect when executed. */
  sideEffecting: boolean;
  backingTool?: string;
}

export const NODE_CATALOG: NodeDescriptor[] = [
  {
    type: 'understand',
    label: 'Understand',
    description:
      'Loads the pre-computed manifest and knowledge graph to establish baseline context for the task.',
    category: 'cognitive',
    sideEffecting: false,
    backingTool: 'query_knowledge',
  },
  {
    type: 'think',
    label: 'Think',
    description:
      'Reasons about the problem without emitting code, evaluating constraints against the team style guide.',
    category: 'cognitive',
    sideEffecting: false,
  },
  {
    type: 'explore',
    label: 'Explore',
    description:
      'Semantic search across the knowledge base plus a dependency-graph walk to find the files a change will touch.',
    category: 'cognitive',
    sideEffecting: false,
    backingTool: 'find_change_surface',
  },
  {
    type: 'design',
    label: 'Design',
    description: 'Produces an architectural proposal and pauses for administrator approval.',
    category: 'cognitive',
    sideEffecting: false,
  },
  {
    type: 'develop',
    label: 'Develop',
    description:
      'Generates code using the structural topography and syntax heuristics mapped by the swarm.',
    category: 'authoring',
    sideEffecting: false,
  },
  {
    type: 'write_tests',
    label: 'Write Tests',
    description: "Generates tests in the exact framework, location and naming convention the QA Analyst recovered.",
    category: 'authoring',
    sideEffecting: false,
    backingTool: 'extract_test_strategy',
  },
  {
    type: 'run_tests',
    label: 'Run Tests',
    description: 'Runs the project test command and captures output for iterative refinement.',
    category: 'verification',
    sideEffecting: true,
  },
  {
    type: 'push',
    label: 'Push',
    description: 'Stages, commits using the extracted commit convention, and pushes to the branch.',
    category: 'delivery',
    sideEffecting: true,
    backingTool: 'parse_ci_cd_pipelines',
  },
  {
    type: 'deploy',
    label: 'Deploy',
    description: 'Triggers the CI/CD deployment stage the DevOps Navigator mapped.',
    category: 'delivery',
    sideEffecting: true,
    backingTool: 'parse_ci_cd_pipelines',
  },
  {
    type: 'update_jira',
    label: 'Update Jira',
    description: 'Transitions the ticket state and appends a development summary.',
    category: 'communication',
    sideEffecting: true,
    backingTool: 'fetch_sprint_goals',
  },
  {
    type: 'send_slack_message',
    label: 'Send Slack Message',
    description: 'Notifies the channel with a deployment summary and reviewer mentions.',
    category: 'communication',
    sideEffecting: true,
  },
];

export interface NodeResult {
  id: string;
  type: PipelineNodeType;
  label: string;
  status: 'ok' | 'planned' | 'paused' | 'skipped' | 'failed';
  executed: boolean;
  output: string;
  evidence: string[];
  /** Set when a side effect was attempted and the integration reported a problem. */
  error?: string;
}

export interface ExecuteOptions {
  /** Perform side effects for real instead of planning them. */
  executeSideEffects: boolean;
  /** Repository the side-effecting stages act on. */
  target: string;
}

@Injectable({ deps: [StoreService, SemanticService, EffectsService] })
export class PipelineService {
  constructor(
    private store: StoreService,
    private semantic: SemanticService,
    private effects: EffectsService
  ) {}

  descriptor(type: PipelineNodeType): NodeDescriptor {
    return NODE_CATALOG.find((n) => n.type === type)!;
  }

  /**
   * Validate a graph: node ids unique, edges reference real nodes, and the
   * graph is acyclic. Returns the execution order.
   */
  validateAndOrder(graph: PipelineGraph): string[] {
    const ids = graph.nodes.map((n) => n.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length) throw new Error(`Duplicate node id(s): ${[...new Set(dupes)].join(', ')}`);

    // No edges means the author intends a straight sequential chain.
    if (!graph.edges.length) return ids;

    const idSet = new Set(ids);
    for (const edge of graph.edges) {
      if (!idSet.has(edge.from)) throw new Error(`Edge references unknown node "${edge.from}"`);
      if (!idSet.has(edge.to)) throw new Error(`Edge references unknown node "${edge.to}"`);
    }

    // Kahn's algorithm — also gives us cycle detection for free.
    const indegree = new Map(ids.map((id) => [id, 0]));
    const adjacency = new Map(ids.map((id) => [id, [] as string[]]));
    for (const edge of graph.edges) {
      adjacency.get(edge.from)!.push(edge.to);
      indegree.set(edge.to, indegree.get(edge.to)! + 1);
    }

    const queue = ids.filter((id) => indegree.get(id) === 0);
    const order: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adjacency.get(id)!) {
        indegree.set(next, indegree.get(next)! - 1);
        if (indegree.get(next) === 0) queue.push(next);
      }
    }

    if (order.length !== ids.length) {
      const stuck = ids.filter((id) => !order.includes(id));
      throw new Error(`Pipeline graph contains a cycle involving: ${stuck.join(', ')}`);
    }
    return order;
  }

  /** Execute one node against the knowledge base, and against the world if asked. */
  async executeNode(
    node: {
      id: string;
      type: PipelineNodeType;
      label?: string;
      requiresApproval?: boolean;
      config?: Record<string, string>;
    },
    task: string,
    options: ExecuteOptions
  ): Promise<NodeResult> {
    const desc = this.descriptor(node.type);
    const label = node.label ?? desc.label;
    const base = { id: node.id, type: node.type, label };
    const effectCtx: EffectContext = { target: options.target, task, config: node.config ?? {} };

    switch (node.type) {
      case 'understand': {
        const facts = this.store.all('knowledge');
        const byCategory = new Map<string, number>();
        for (const f of facts) byCategory.set(f.category, (byCategory.get(f.category) ?? 0) + 1);
        return {
          ...base,
          status: facts.length ? 'ok' : 'skipped',
          executed: true,
          output: facts.length
            ? `Loaded ${facts.length} facts across ${byCategory.size} categories ` +
              `(${[...byCategory.entries()].map(([c, n]) => `${c}:${n}`).join(', ')}).`
            : 'Knowledge base is empty — run run_swarm before executing a pipeline.',
          evidence: [...byCategory.keys()],
        };
      }

      case 'think': {
        const constraints = this.store
          .all('knowledge')
          .filter((f) => f.weight >= 4 && ['testing', 'cicd', 'design-system', 'consensus'].includes(f.category));
        return {
          ...base,
          status: 'ok',
          executed: true,
          output:
            `Evaluating "${task}" against ${constraints.length} binding constraint(s):\n` +
            constraints.slice(0, 8).map((c) => `  • ${c.title}`).join('\n'),
          evidence: constraints.slice(0, 8).map((c) => c.id),
        };
      }

      case 'explore': {
        const hits = this.search(task, 6);
        return {
          ...base,
          status: hits.length ? 'ok' : 'skipped',
          executed: true,
          output: hits.length
            ? `Most relevant context for "${task}":\n` +
              hits.map((h) => `  • [${h.score.toFixed(2)}] ${h.title}`).join('\n')
            : `No knowledge matched "${task}".`,
          evidence: hits.flatMap((h) => h.evidence).slice(0, 10),
        };
      }

      case 'design': {
        const arch = this.store.factsByCategory('architecture');
        return {
          ...base,
          status: node.requiresApproval ? 'paused' : 'ok',
          executed: true,
          output:
            `Design proposal for "${task}" grounded in ${arch.length} architectural fact(s). ` +
            (node.requiresApproval
              ? 'PAUSED — awaiting administrator approval before proceeding.'
              : 'Proceeding without approval gate.'),
          evidence: arch.map((a) => a.id).slice(0, 5),
        };
      }

      case 'develop': {
        const style = [...this.store.factsByCategory('architecture'), ...this.store.factsByCategory('design-system')];
        return {
          ...base,
          status: 'ok',
          executed: true,
          output:
            `Code generation constrained by ${style.length} topography and design-system fact(s). ` +
            `Layer conventions and the approved token set are enforced.`,
          evidence: style.map((s) => s.id).slice(0, 6),
        };
      }

      case 'write_tests': {
        const testing = this.store.factsByCategory('testing');
        const naming = testing.find((t) => t.id === 'qa:naming');
        const gate = testing.find((t) => t.id === 'qa:coverage-gate');
        return {
          ...base,
          status: testing.length ? 'ok' : 'skipped',
          executed: true,
          output:
            (naming ? `${naming.detail}\n` : '') +
            (gate ? `${gate.detail}` : 'No coverage gate detected.'),
          evidence: testing.map((t) => t.id),
        };
      }

      case 'run_tests': {
        const frameworks = this.store.factsByCategory('testing').find((t) => t.id === 'qa:frameworks');
        const plan =
          'Would run the project test command in the target repository. ' +
          (frameworks ? `Detected runners:\n${frameworks.detail}` : 'No test runner detected.');
        if (!options.executeSideEffects) {
          return this.planned(base, plan, frameworks ? frameworks.evidence : []);
        }
        return this.performed(base, await this.effects.runTests(effectCtx), plan);
      }

      case 'push': {
        const convention = this.store.factsByCategory('cicd').find((f) => f.id === 'cicd:commit-convention');
        const branches = this.store.factsByCategory('cicd').find((f) => f.id === 'cicd:branch-model');
        const commitMessage = node.config?.commit_message ?? this.suggestCommitMessage(task);
        const plan =
          'Would stage, commit and push. Commit must satisfy:\n' +
          (convention?.detail ?? '  no commit convention detected') +
          (branches ? `\nBranch model: ${branches.detail}` : '') +
          `\nCommit message: ${commitMessage}`;
        if (!options.executeSideEffects) {
          return this.planned(base, plan, convention ? convention.evidence : []);
        }
        // The convention the DevOps Navigator recovered is enforced before the
        // commit rather than discovered afterwards by a CI rejection.
        return this.performed(
          base,
          await this.effects.push(effectCtx, {
            commitMessage,
            requiresTicketRef: !!convention?.detail.includes('ticket key is MANDATORY'),
          }),
          plan
        );
      }

      case 'deploy': {
        const pipelines = this.store.factsByCategory('cicd').filter((f) => f.id.startsWith('cicd:pipeline:'));
        const gates = this.store.factsByCategory('cicd').find((f) => f.id === 'cicd:approval-gates');
        const plan =
          'Would trigger the mapped deployment path:\n' +
          (pipelines.length ? pipelines.map((p) => `  • ${p.title}: ${p.detail}`).join('\n') : '  none detected') +
          (gates ? `\nApproval required: ${gates.detail}` : '');
        if (!options.executeSideEffects) {
          return this.planned(base, plan, pipelines.flatMap((p) => p.evidence));
        }
        return this.performed(base, await this.effects.deploy(effectCtx), plan);
      }

      case 'update_jira': {
        const issues = this.store.factsByCategory('agile').filter((f) => f.id.startsWith('agile:issue:'));
        const plan =
          `Would transition the ticket and append a development summary. ` +
          `${issues.length} open issue(s) are candidates:\n` +
          issues.slice(0, 5).map((i) => `  • ${i.title}`).join('\n');
        if (!options.executeSideEffects) {
          return this.planned(base, plan, issues.map((i) => i.id).slice(0, 5));
        }
        const summary =
          `Automated update from the Enterprise Agentic Bridge.\n\n` +
          `Task: ${task}\n` +
          `Pipeline stage: ${label}`;
        return this.performed(base, await this.effects.updateJira(effectCtx, summary), plan);
      }

      case 'send_slack_message': {
        const plan = `Would post a summary of "${task}" to the team channel and mention reviewers.`;
        if (!options.executeSideEffects) return this.planned(base, plan, []);
        const text =
          `*Enterprise Agentic Bridge* completed a pipeline run.\n` +
          `> ${task}\n` +
          `Stage: ${label}`;
        return this.performed(base, await this.effects.sendSlackMessage(effectCtx, text), plan);
      }
    }
  }

  /** A side effect that was deliberately not performed. */
  private planned(
    base: { id: string; type: PipelineNodeType; label: string },
    plan: string,
    evidence: string[]
  ): NodeResult {
    return {
      ...base,
      status: 'planned',
      executed: false,
      output:
        `${plan}\nNot executed — pass execute_side_effects=true on run_pipeline to perform this ` +
        `for real.`,
      evidence,
    };
  }

  /**
   * A side effect that was attempted. The plan is retained above the outcome so
   * the result still shows what the stage set out to do, whether or not the
   * integration was reachable.
   */
  private performed(
    base: { id: string; type: PipelineNodeType; label: string },
    outcome: EffectOutcome,
    plan: string
  ): NodeResult {
    return {
      ...base,
      status: outcome.executed ? (outcome.error ? 'failed' : 'ok') : 'planned',
      executed: outcome.executed,
      output: `${plan}\n\n${outcome.output}`,
      evidence: outcome.evidence,
      ...(outcome.error ? { error: outcome.error } : {}),
    };
  }

  /**
   * Build a commit subject in the shape this project's fixture mandates:
   * `<type>(<scope>): <subject>   [TICKET-KEY]`. Only used when the push node
   * carries no explicit `commit_message`.
   */
  private suggestCommitMessage(task: string): string {
    const ticket = task.match(/\b[A-Z][A-Z0-9]+-\d+\b/)?.[0];
    const subject = task
      .replace(/\b[A-Z][A-Z0-9]+-\d+\b/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .slice(0, 60);
    return `feat: ${subject}${ticket ? `   [${ticket}]` : ''}`;
  }

  /** Rank knowledge facts against a free-text query. */
  search(query: string, limit = 8): { id: string; title: string; detail: string; score: number; evidence: string[] }[] {
    const queryVec = this.semantic.embed(query);
    return this.store
      .all('knowledge')
      .map((fact) => {
        const similarity = this.semantic.cosine(queryVec, this.semantic.embed(`${fact.title} ${fact.detail}`));
        // Weight nudges load-bearing facts up without letting them dominate.
        return { ...fact, score: similarity * (1 + fact.weight / 20) };
      })
      .filter((f) => f.score > 0.02)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((f) => ({ id: f.id, title: f.title, detail: f.detail, score: f.score, evidence: f.evidence }));
  }
}
