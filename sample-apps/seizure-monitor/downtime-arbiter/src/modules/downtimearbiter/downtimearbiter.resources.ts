import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { ROLLING_PLAN, NEGOTIATION_LOGS } from './fixtures.js';

/**
 * DowntimeArbiter resources:
 * 1. rolling_plan - Full 2-week schedule, technician assignments, job deadlines.
 * 2. negotiation_log - Structured transcript of proposals and outcomes per machine.
 * 3. demo_runbook - Judge-facing NitroStudio demo script.
 * 4. evaluation_rubric - Deterministic metrics covered by npm run eval.
 */
export class DowntimeArbiterResources {
  @Resource({
    uri: 'downtimearbiter://rolling_plan',
    name: 'Rolling 2-Week Plan',
    description:
      'Full 2-week maintenance schedule for 4 machines, technician assignments, and job deadlines.',
    mimeType: 'application/json',
  })
  async rollingPlan(context: ExecutionContext) {
    return {
      type: 'text' as const,
      text: JSON.stringify(ROLLING_PLAN, null, 2),
    };
  }

  @Resource({
    uri: 'downtimearbiter://negotiation_log',
    name: 'Negotiation Log',
    description:
      'Structured transcript of all maintenance window proposals, counter-proposals, rationales, and arbiter resolutions per machine.',
    mimeType: 'application/json',
  })
  async negotiationLog(context: ExecutionContext) {
    const allLogs = Object.values(NEGOTIATION_LOGS).map((log) => ({
      machine_id: log.machine_id,
      entries: log.entries,
      final_resolution: log.final_resolution || null,
    }));

    return {
      type: 'text' as const,
      text: JSON.stringify(allLogs, null, 2),
    };
  }

  @Resource({
    uri: 'downtimearbiter://demo_runbook',
    name: 'Hackathon Demo Runbook',
    description:
      'Step-by-step NitroStudio demo flow showing context isolation, P-F risk trajectories, negotiation, and deterministic arbitration.',
    mimeType: 'text/markdown',
  })
  async demoRunbook(context: ExecutionContext) {
    return {
      type: 'text' as const,
      text: `# Downtime Arbiter Demo Runbook

## 90-second judge story
Downtime Arbiter is a NitroStack MCP server where Maintenance and Production agents negotiate machine downtime without leaking each other's private context. Maintenance sees sensor detail and raw risk, Production sees only a coarse urgency tier, and the Arbiter makes deterministic cost/safety decisions.

## NitroStudio flow
1. Call get_machine_signal with MACH_003 as Maintenance. Show full sensor detail and raw current_risk_pct.
2. Call get_machine_signal with MACH_003 as Production. Show the server-side access denial.
3. Call get_urgency_tier with MACH_003 as Production. Show only urgency_tier, with no raw risk percent.
4. Call explain_risk_trajectory with MACH_002 as Maintenance. Show now, +24h, +72h, and +96h P-F curve risk.
5. Call check_plan_constraints for MACH_001 from 2025-01-16T09:00:00Z to 2025-01-16T10:00:00Z. Show the technician conflict.
6. Call propose_window as Maintenance for MACH_002, then as Production for MACH_002.
7. Call resolve_negotiation as Arbiter for MACH_002. Show deterministic lower-cost selection and override flag when the gap is >= 10%.
8. Try propose_window again for MACH_002. Show that closed negotiations reject new proposals.

## CLI proof
Run npm run eval to produce a JSON report covering context isolation, P-F curve shape, deterministic arbitration, negotiation closure, round caps, and plan constraints.
`,
    };
  }

  @Resource({
    uri: 'downtimearbiter://evaluation_rubric',
    name: 'Evaluation Rubric',
    description:
      'Machine-checkable evaluation criteria and expected metrics for the Downtime Arbiter hackathon demo.',
    mimeType: 'application/json',
  })
  async evaluationRubric(context: ExecutionContext) {
    return {
      type: 'text' as const,
      text: JSON.stringify(
        {
          command: 'npm run eval',
          pass_condition: 'summary.failed_checks must equal 0 and summary.pass_rate_pct must equal 100',
          metric_groups: [
            {
              name: 'context_isolation',
              proves: 'Maintenance-only and Production-only data boundaries are enforced in tool code.',
            },
            {
              name: 'pf_curve_model',
              proves: 'Risk changes across horizons and differs by failure mode.',
            },
            {
              name: 'deterministic_arbiter',
              proves: 'No LLM call is needed for final negotiation decisions.',
            },
            {
              name: 'negotiation_protocol',
              proves: 'Exactly two rounds are allowed and closed negotiations stay closed.',
            },
            {
              name: 'schedule_constraints',
              proves: 'Technician conflicts are detected against the rolling two-week plan.',
            },
          ],
        },
        null,
        2,
      ),
    };
  }
}
