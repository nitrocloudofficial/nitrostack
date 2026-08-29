/**
 * Health checks.
 *
 * ---------------------------------------------------------------------------
 * THESE ARE DEPLOYMENT INSTRUMENTS, NOT DECORATION
 * ---------------------------------------------------------------------------
 * PassportIQ has three failure modes that a plain "is the process up?" probe
 * cannot see, and all three are silent:
 *
 *   1. THE SEED DATA DID NOT LOAD. The process starts fine, tools/list looks
 *      correct, and every call returns "application not found". A container that
 *      shipped without src/data/seed-applications.json presents exactly this way.
 *
 *   2. THE FRAUD RING VANISHED. The graph is computed from the seed, so a
 *      truncated or edited fixture yields clusters of [1,1,1,...]. Nothing errors
 *      — the product simply stops finding fraud, which is the entire pitch. This
 *      check asserts a multi-application cluster still exists.
 *
 *   3. THE LLM KEY IS ABSENT OR WRONG. Every stage degrades gracefully to its
 *      deterministic path by design, so nothing breaks. But the operator who set
 *      GEMINI_API_KEY and expected LLM narration deserves to be told it is not
 *      being used. Reported as 'degraded', never 'down' — deterministic operation
 *      is a supported mode, not an outage.
 *
 * A @HealthCheck class must be listed in a module's `providers` for core to
 * resolve and register it (app-decorator.js:89-97). Results surface through the
 * health-checks MCP resource and getOverallHealth().
 */
import { HealthCheck, Injectable } from '@nitrostack/core';
import type { HealthCheckInterface, HealthCheckResult } from '@nitrostack/core';
import { ApplicationService } from '../../pipeline/services/application.service.js';
import { GraphService } from '../../pipeline/services/graph.service.js';
import { PipelineStateService } from '../../pipeline/services/pipeline-state.service.js';
import { AgentMemoryService } from '../../agent/services/agent-memory.service.js';
import { LlmService } from '../../verification/services/llm.service.js';
import { RuleService } from '../../verification/services/rule.service.js';

/** Minimum applications for the demo to be meaningful. */
const MIN_APPLICATIONS = 2;

/**
 * The seeded pool loaded, and the fraud ring survived.
 *
 * Two assertions in one check because they fail together and are diagnosed
 * together: both point at src/data/seed-applications.json.
 */
@HealthCheck({
  name: 'seed-data',
  description: 'Applicant pool loaded and the multi-application fraud cluster is intact',
})
@Injectable({ deps: [ApplicationService, GraphService] })
export class SeedDataHealthCheck implements HealthCheckInterface {
  constructor(
    private readonly applications: ApplicationService,
    private readonly graph: GraphService
  ) {}

  check(): HealthCheckResult {
    const ids = this.applications.getIds();

    if (ids.length < MIN_APPLICATIONS) {
      return {
        status: 'down',
        message:
          `Only ${ids.length} application(s) loaded (need at least ${MIN_APPLICATIONS}). ` +
          `src/data/seed-applications.json is missing or truncated — every tool call will ` +
          `report "application not found".`,
        details: { applicationCount: ids.length, applicationIds: ids },
      };
    }

    const clusters = this.graph.getAllClusters();
    const sizes = clusters.map((c) => c.length).sort((a, b) => b - a);
    const largest = sizes[0] ?? 0;

    if (largest < 2) {
      return {
        status: 'down',
        message:
          `${ids.length} applications loaded but NO multi-application cluster exists (all ` +
          `clusters are size 1). The cross-application fraud detection — the core capability — ` +
          `has nothing to find. The seed fixture's shared identifiers have been lost.`,
        details: { applicationCount: ids.length, clusterSizes: sizes },
      };
    }

    return {
      status: 'up',
      message:
        `${ids.length} applications loaded; largest connected cluster is ${largest} ` +
        `application(s). Fraud graph intelligence is operational.`,
      details: { applicationCount: ids.length, clusterSizes: sizes, largestCluster: largest },
    };
  }
}

/**
 * The rulebook is loaded and the load-bearing rules are present.
 *
 * DUP-010 and GRF-020 are named explicitly because they are the two rules that
 * turn cross-application evidence into an officer-visible finding. If they were
 * ever dropped in a refactor the system would keep scoring, keep explaining, and
 * silently stop reporting fraud rings — so their presence is asserted rather than
 * assumed.
 */
@HealthCheck({
  name: 'rulebook',
  description: 'Verification rulebook loaded with its cross-application rules present',
})
@Injectable({ deps: [RuleService] })
export class RulebookHealthCheck implements HealthCheckInterface {
  private static readonly LOAD_BEARING = ['DUP-010', 'GRF-020'] as const;

  constructor(private readonly rules: RuleService) {}

  check(): HealthCheckResult {
    const rules = this.rules.listRules();
    const ids = rules.map((r) => r.ruleId);
    const missing = RulebookHealthCheck.LOAD_BEARING.filter((id) => !ids.includes(id));

    if (rules.length === 0) {
      return {
        status: 'down',
        message: 'The rulebook is empty. No application can be evaluated against any rule.',
      };
    }

    if (missing.length > 0) {
      return {
        status: 'down',
        message:
          `The rulebook is missing its cross-application rule(s): ${missing.join(', ')}. ` +
          `Scoring and explanation would still run, but fraud rings would stop being reported ` +
          `as findings — a silent loss of the product's core capability.`,
        details: { ruleCount: rules.length, missing },
      };
    }

    const uncited = rules.filter((r) => !r.citation || r.citation.trim().length === 0);
    if (uncited.length > 0) {
      return {
        status: 'degraded',
        message:
          `${uncited.length} rule(s) have no statutory citation. Findings from them cannot be ` +
          `justified to an applicant or on appeal.`,
        details: { uncited: uncited.map((r) => r.ruleId) },
      };
    }

    return {
      status: 'up',
      message: `${rules.length} rules loaded, all cited, cross-application rules present.`,
      details: { ruleCount: rules.length, ruleIds: ids },
    };
  }
}

/**
 * LLM reachability.
 *
 * Reports configuration, never 'down'. Deterministic operation is a first-class
 * supported mode — the whole point of LlmService returning null rather than
 * throwing — so an absent key is information for the operator, not an outage.
 * A non-zero failure count IS worth flagging: it means a key is configured but
 * calls are not landing, which the operator would otherwise never learn.
 */
@HealthCheck({
  name: 'llm-provider',
  description: 'Optional LLM provider configuration and call success rate',
})
@Injectable({ deps: [LlmService] })
export class LlmHealthCheck implements HealthCheckInterface {
  constructor(private readonly llm: LlmService) {}

  check(): HealthCheckResult {
    const stats = this.llm.getStats();

    if (!this.llm.isEnabled()) {
      return {
        status: 'degraded',
        message:
          'No LLM provider configured — every stage is running on its deterministic path. This ' +
          'is fully supported: all 9 stages, the rulebook, the score and the agent loop work ' +
          'without a model. Set GEMINI_API_KEY or OPENAI_API_KEY to enable LLM narration and ' +
          'LLM-planned agent turns.',
        details: stats,
      };
    }

    if (stats.failures > 0 && stats.failures === stats.calls) {
      return {
        status: 'degraded',
        message:
          `${stats.provider} (${stats.model}) is configured but ALL ${stats.calls} call(s) ` +
          `failed. Check the key, network egress and model name. The system is still fully ` +
          `functional on its deterministic paths.`,
        details: stats,
      };
    }

    if (stats.failures > 0) {
      return {
        status: 'degraded',
        message:
          `${stats.provider} (${stats.model}) reachable but ${stats.failures} of ${stats.calls} ` +
          `call(s) failed. Affected stages fell back to deterministic output.`,
        details: stats,
      };
    }

    return {
      status: 'up',
      message:
        stats.calls === 0
          ? `${stats.provider} (${stats.model}) configured. No calls made yet.`
          : `${stats.provider} (${stats.model}): ${stats.calls} call(s), no failures.`,
      details: stats,
    };
  }
}

/**
 * Agent and pipeline activity.
 *
 * Always 'up' — no activity is the correct state for a freshly started server, not
 * a fault. Its value is operational visibility: after a demo you can confirm the
 * agent actually planned with the LLM rather than silently falling back, and that
 * escalations happened.
 */
@HealthCheck({
  name: 'agent-activity',
  description: 'Autonomous agent run statistics and pipeline coverage',
})
@Injectable({ deps: [AgentMemoryService, PipelineStateService, ApplicationService] })
export class AgentActivityHealthCheck implements HealthCheckInterface {
  constructor(
    private readonly memory: AgentMemoryService,
    private readonly state: PipelineStateService,
    private readonly applications: ApplicationService
  ) {}

  check(): HealthCheckResult {
    const stats = this.memory.getStats();
    const tracked = this.state.getTrackedApplicationIds();
    const complete = tracked.filter((id) => this.state.isPipelineComplete(id));

    return {
      status: 'up',
      message:
        stats.totalRuns === 0
          ? 'No agent runs yet. Call agent_investigate or agent_triage_queue to exercise the ' +
            'autonomous loop.'
          : `${stats.totalRuns} agent run(s), ${stats.totalSteps} reasoning step(s), ` +
            `${stats.escalated} escalated to senior review, ${stats.llmPlanned} LLM-planned. ` +
            `${complete.length}/${this.applications.getIds().length} applications have a ` +
            `complete pipeline.`,
      details: {
        ...stats,
        applicationsTracked: tracked.length,
        applicationsComplete: complete.length,
        applicationsTotal: this.applications.getIds().length,
      },
    };
  }
}
