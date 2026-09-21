import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { RiskTrajectory, RollingPlan, MachineNegotiationLog } from './types.js';

/**
 * DowntimeArbiter Prompts
 *
 * 1. causal_rationale_prompt — Converts risk trajectory into natural-language safety argument.
 * 2. plan_briefing_prompt — Merges rolling plan + negotiation log into plant-manager summary.
 */
export class DowntimeArbiterPrompts {
  /**
   * Prompt 1: causal_rationale_prompt
   * Turns explain_risk_trajectory output into a natural-language argument about why a delay is or isn't safe.
   */
  @Prompt({
    name: 'causal_rationale_prompt',
    description:
      'Convert a risk trajectory into a natural-language safety argument for maintenance scheduling.',
  })
  async causalRationalePrompt(
    args: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
    const trajectory = args.trajectory as RiskTrajectory | undefined;
    const proposedDelayHours = (args.proposed_delay_hours as number) || 24;

    if (!trajectory) {
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: 'Error: No risk trajectory provided.',
          },
        },
      ];
    }

    const failureModeName =
      trajectory.failure_mode === 'bearing_spall'
        ? 'bearing spall (slow, gradual degradation)'
        : 'thermal degradation (fast, front-loaded)';

    const riskAtDelay =
      trajectory.failure_mode === 'bearing_spall'
        ? trajectory.risk_at_24h_pct // Use 24h for bearing_spall
        : trajectory.risk_at_24h_pct; // Use 24h for thermal_degradation

    const isSafe = riskAtDelay < 85;
    const safetyAssessment = isSafe
      ? `SAFE: Risk remains below critical threshold (${riskAtDelay.toFixed(1)}% < 85%)`
      : `UNSAFE: Risk exceeds critical threshold (${riskAtDelay.toFixed(1)}% >= 85%)`;

    const rationale = `
Machine: ${trajectory.machine_id}
Failure Mode: ${failureModeName}

Current Risk: ${trajectory.now_risk_pct.toFixed(1)}%
Risk at +24h: ${trajectory.risk_at_24h_pct.toFixed(1)}%
Risk at +72h: ${trajectory.risk_at_72h_pct.toFixed(1)}%
Risk at +96h: ${trajectory.risk_at_96h_pct.toFixed(1)}%

Proposed Delay: ${proposedDelayHours} hours

Assessment: ${safetyAssessment}

Rationale:
${
  trajectory.failure_mode === 'bearing_spall'
    ? `Bearing spall follows a slow sigmoid trajectory. The machine has time for a ${proposedDelayHours}-hour delay without crossing the 85% safety threshold. Maintenance can be scheduled flexibly within the next 48-72 hours.`
    : `Thermal degradation escalates rapidly in the first 24 hours. A ${proposedDelayHours}-hour delay is ${isSafe ? 'acceptable' : 'NOT acceptable'} given the current risk profile. Immediate action recommended if risk exceeds 85%.`
}
`;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Generate a maintenance scheduling recommendation based on this risk trajectory:\n\n${rationale}`,
        },
      },
    ];
  }

  /**
   * Prompt 2: plan_briefing_prompt
   * Turns rolling plan + negotiation log into a plant-manager-readable weekly briefing.
   */
  @Prompt({
    name: 'plan_briefing_prompt',
    description:
      'Generate a plant-manager-readable weekly briefing from the rolling plan and negotiation outcomes.',
  })
  async planBriefingPrompt(
    args: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
    const plan = args.rolling_plan as RollingPlan | undefined;
    const negotiationLogs = args.negotiation_logs as Record<string, MachineNegotiationLog> | undefined;

    if (!plan || !negotiationLogs) {
      return [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: 'Error: Missing rolling_plan or negotiation_logs.',
          },
        },
      ];
    }

    // Summarize scheduled jobs
    const jobSummary = plan.jobs
      .map(
        (job) =>
          `  - ${job.job_id}: ${job.machine_id} (${job.technician_id}) | ${job.scheduled_start} to ${job.scheduled_end} | Deadline: ${job.deadline}`,
      )
      .join('\n');

    // Summarize technician load
    const techSummary = plan.technicians
      .map((tech) => {
        const assignedJobs = plan.jobs.filter((j) => j.technician_id === tech.technician_id);
        return `  - ${tech.name} (${tech.technician_id}): ${assignedJobs.length} jobs assigned, machines ${tech.machines_assigned.join(', ')}`;
      })
      .join('\n');

    // Summarize negotiation outcomes
    const negotiationSummary = Object.entries(negotiationLogs)
      .map(([machineId, log]) => {
        if (!log.final_resolution) {
          return `  - ${machineId}: No resolution yet (${log.entries.length} proposals)`;
        }
        const res = log.final_resolution;
        const overrideNote = res.override_applied ? ' [OVERRIDE APPLIED]' : '';
        const escalationNote = res.escalation_reason ? ` [ESCALATED: ${res.escalation_reason}]` : '';
        return `  - ${machineId}: ${res.decision} (cost gap: ${res.cost_gap_pct.toFixed(1)}%)${overrideNote}${escalationNote}`;
      })
      .join('\n');

    const briefing = `
DOWNTIME ARBITER — WEEKLY BRIEFING
Week: ${plan.plan_week_start} to ${plan.plan_week_end}

SCHEDULED MAINTENANCE JOBS:
${jobSummary}

TECHNICIAN ASSIGNMENTS:
${techSummary}

NEGOTIATION OUTCOMES:
${negotiationSummary}

SUMMARY:
- Total jobs: ${plan.jobs.length}
- Total technicians: ${plan.technicians.length}
- Machines under negotiation: ${Object.keys(negotiationLogs).length}
- Resolutions finalized: ${Object.values(negotiationLogs).filter((l) => l.final_resolution).length}
- Escalations: ${Object.values(negotiationLogs).filter((l) => l.final_resolution?.decision === 'escalate_human').length}
`;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Generate a plant-manager briefing from this maintenance plan and negotiation data:\n\n${briefing}`,
        },
      },
    ];
  }

  /**
   * Prompt 3: judge_demo_prompt
   * Produces a concise script for presenting the project in a hackathon judging slot.
   */
  @Prompt({
    name: 'judge_demo_prompt',
    description:
      'Generate a crisp hackathon judge demo script for Downtime Arbiter using its NitroStack tools, resources, and eval metrics.',
  })
  async judgeDemoPrompt(
    args: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: { type: 'text'; text: string } }>> {
    const minutes = (args.minutes as number) || 3;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Create a ${minutes}-minute hackathon demo script for Downtime Arbiter.

The script must emphasize:
- It is implemented as a NitroStack MCP server, not a slide-only concept.
- Maintenance and Production agents have server-enforced context isolation.
- Risk is modeled as P-F curve trajectories at now, +24h, +72h, and +96h.
- The Arbiter is deterministic rule-based code: no LLM decides the final outcome.
- Negotiation is capped at exactly two rounds and closes after resolution.
- npm run eval produces objective metrics for context isolation, risk trajectory shape, arbiter rules, negotiation protocol, and technician schedule constraints.

Include the exact NitroStudio calls a judge should watch: get_machine_signal, get_urgency_tier, explain_risk_trajectory, check_plan_constraints, propose_window, resolve_negotiation, and then a blocked post-resolution propose_window call.`,
        },
      },
    ];
  }
}
