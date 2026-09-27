import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { MACHINES, ROLLING_PLAN, NEGOTIATION_LOGS } from './fixtures.js';
import { getRiskAtHorizon, riskToUrgencyTier } from './pf-curves.js';
import {
  MachineSignal,
  UrgencyTierResponse,
  RiskTrajectory,
  ProposalWindow,
  ConstraintCheckResult,
  ArbiterResolution,
  NegotiationLogEntry,
} from './types.js';

/**
 * DowntimeArbiter Tools — 6 tools with strict context isolation.
 *
 * CONTEXT ISOLATION ENFORCED:
 * - get_machine_signal: Maintenance only (full sensor detail + risk %)
 * - get_urgency_tier: Production only (coarse tier, never raw %)
 * - explain_risk_trajectory: Maintenance only (P-F curve horizons)
 * - propose_window: Both roles (appends to log, rejects round > 2)
 * - check_plan_constraints: Both roles (technician availability)
 * - resolve_negotiation: Arbiter only (deterministic cost comparison)
 */
@Injectable()
export class DowntimeArbiterTools {
  /**
   * Tool 1: get_machine_signal
   * Maintenance-only. Returns full sensor detail + failure_mode + current_risk_pct.
   * Production CANNOT call this.
   */
  @Tool({
    name: 'get_machine_signal',
    description:
      'Maintenance-only. Retrieve full sensor data and current risk percentage for a machine. Production agents cannot access this.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier (e.g., MACH_001)'),
      caller_role: z.enum(['Maintenance', 'Production', 'Arbiter']).describe('Role of the caller'),
    }),
  })
  async getMachineSignal(
    input: { machine_id: string; caller_role: string },
    context: ExecutionContext,
  ): Promise<MachineSignal | { error: string }> {
    // CONTEXT ISOLATION: Reject if not Maintenance
    if (input.caller_role !== 'Maintenance') {
      return {
        error: `Access denied. get_machine_signal is Maintenance-only. Caller role: ${input.caller_role}`,
      };
    }

    const machine = MACHINES[input.machine_id];
    if (!machine) {
      return { error: `Machine not found: ${input.machine_id}` };
    }

    return machine;
  }

  /**
   * Tool 2: get_urgency_tier
   * Production-only. Returns ONLY urgency_tier (Low/Medium/High/Critical).
   * Never exposes raw risk percentage.
   */
  @Tool({
    name: 'get_urgency_tier',
    description:
      'Production-only. Retrieve coarse urgency tier (Low/Medium/High/Critical) for a machine. Raw risk percentages are never exposed.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier (e.g., MACH_001)'),
      caller_role: z.enum(['Maintenance', 'Production', 'Arbiter']).describe('Role of the caller'),
    }),
  })
  async getUrgencyTier(
    input: { machine_id: string; caller_role: string },
    context: ExecutionContext,
  ): Promise<UrgencyTierResponse | { error: string }> {
    // CONTEXT ISOLATION: Reject if not Production
    if (input.caller_role !== 'Production') {
      return {
        error: `Access denied. get_urgency_tier is Production-only. Caller role: ${input.caller_role}`,
      };
    }

    const machine = MACHINES[input.machine_id];
    if (!machine) {
      return { error: `Machine not found: ${input.machine_id}` };
    }

    // Derive tier server-side; never expose raw risk_pct
    const tier = riskToUrgencyTier(machine.current_risk_pct);

    return {
      machine_id: input.machine_id,
      urgency_tier: tier,
    };
  }

  /**
   * Tool 3: explain_risk_trajectory
   * Maintenance-only. Returns risk at multiple horizons per P-F curve.
   */
  @Tool({
    name: 'explain_risk_trajectory',
    description:
      'Maintenance-only. Explain risk trajectory for a machine at multiple horizons (now, +24h, +72h, +96h) based on its P-F curve.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier'),
      caller_role: z.enum(['Maintenance', 'Production', 'Arbiter']).describe('Role of the caller'),
    }),
  })
  async explainRiskTrajectory(
    input: { machine_id: string; caller_role: string },
    context: ExecutionContext,
  ): Promise<RiskTrajectory | { error: string }> {
    // CONTEXT ISOLATION: Reject if not Maintenance
    if (input.caller_role !== 'Maintenance') {
      return {
        error: `Access denied. explain_risk_trajectory is Maintenance-only. Caller role: ${input.caller_role}`,
      };
    }

    const machine = MACHINES[input.machine_id];
    if (!machine) {
      return { error: `Machine not found: ${input.machine_id}` };
    }

    // Apply P-F curve to get risk at each horizon
    const now = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 0);
    const at24h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 24);
    const at72h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 72);
    const at96h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 96);

    return {
      machine_id: input.machine_id,
      failure_mode: machine.failure_mode,
      now_risk_pct: Math.round(now * 10) / 10,
      risk_at_24h_pct: Math.round(at24h * 10) / 10,
      risk_at_72h_pct: Math.round(at72h * 10) / 10,
      risk_at_96h_pct: Math.round(at96h * 10) / 10,
    };
  }

  /**
   * Tool 4: propose_window
   * Both Maintenance and Production can propose. Appends to negotiation log.
   * Rejects calls beyond round 2.
   */
  @Tool({
    name: 'propose_window',
    description:
      'Propose a maintenance window for a machine. Both Maintenance and Production can propose. Capped at 2 rounds.',
    inputSchema: z.object({
      role: z.enum(['Maintenance', 'Production', 'Arbiter']).describe('Role of the proposer'),
      machine_id: z.string().describe('Machine identifier'),
      window_start: z.string().describe('Window start (ISO 8601)'),
      window_end: z.string().describe('Window end (ISO 8601)'),
      duration_hours: z.number().describe('Duration in hours'),
      rationale: z.string().describe('Reason for this proposal'),
      estimated_cost: z.number().describe('Estimated cost (arbitrary units)'),
    }),
  })
  async proposeWindow(
    input: {
      role: string;
      machine_id: string;
      window_start: string;
      window_end: string;
      duration_hours: number;
      rationale: string;
      estimated_cost: number;
    },
    context: ExecutionContext,
  ): Promise<{ round: number; proposal_id: string } | { error: string }> {
    // Reject Arbiter proposals
    if (input.role === 'Arbiter') {
      return { error: 'Arbiter cannot propose windows; only resolve negotiations.' };
    }

    const log = NEGOTIATION_LOGS[input.machine_id];
    if (!log) {
      return { error: `Machine not found: ${input.machine_id}` };
    }

    if (log.final_resolution) {
      return {
        error: `Negotiation for ${input.machine_id} is closed. Final decision: ${log.final_resolution.decision}.`,
      };
    }

    // Count existing proposals to determine round
    const currentRound = Math.floor(log.entries.length / 2) + 1;

    // HARD CAP: Reject if round > 2
    if (currentRound > 2) {
      return {
        error: `Negotiation capped at 2 rounds. Current round would be ${currentRound}. Call resolve_negotiation to finalize.`,
      };
    }

    const proposal: ProposalWindow = {
      role: input.role as 'Maintenance' | 'Production',
      machine_id: input.machine_id,
      window_start: input.window_start,
      window_end: input.window_end,
      duration_hours: input.duration_hours,
      rationale: input.rationale,
      estimated_cost: input.estimated_cost,
    };

    const entry: NegotiationLogEntry = {
      machine_id: input.machine_id,
      round: currentRound,
      proposal,
      timestamp: new Date().toISOString(),
    };

    log.entries.push(entry);

    return {
      round: currentRound,
      proposal_id: `${input.machine_id}_R${currentRound}_${Date.now()}`,
    };
  }

  /**
   * Tool 5: check_plan_constraints
   * Both roles can call. Checks technician availability in rolling plan.
   * Flags conflicts if a shared technician is already booked.
   */
  @Tool({
    name: 'check_plan_constraints',
    description:
      'Check if a proposed maintenance window conflicts with the rolling 2-week plan. Flags technician availability issues.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier'),
      window_start: z.string().describe('Proposed window start (ISO 8601)'),
      window_end: z.string().describe('Proposed window end (ISO 8601)'),
      technician_id: z.string().optional().describe('Technician ID (optional; auto-lookup if omitted)'),
    }),
  })
  async checkPlanConstraints(
    input: {
      machine_id: string;
      window_start: string;
      window_end: string;
      technician_id?: string;
    },
    context: ExecutionContext,
  ): Promise<ConstraintCheckResult | { error: string }> {
    // Find technician assigned to this machine
    let techId = input.technician_id;
    if (!techId) {
      const job = ROLLING_PLAN.jobs.find((j) => j.machine_id === input.machine_id);
      if (!job) {
        return { error: `No technician assigned to machine ${input.machine_id}` };
      }
      techId = job.technician_id;
    }

    // Find all jobs for this technician
    const techJobs = ROLLING_PLAN.jobs.filter((j) => j.technician_id === techId);

    // Check for overlaps
    const proposedStart = new Date(input.window_start);
    const proposedEnd = new Date(input.window_end);

    const conflicts = techJobs
      .filter((job) => {
        const jobStart = new Date(job.scheduled_start);
        const jobEnd = new Date(job.scheduled_end);

        // Overlap if: proposedStart < jobEnd AND proposedEnd > jobStart
        return proposedStart < jobEnd && proposedEnd > jobStart;
      })
      .map((job) => ({
        conflicting_machine_id: job.machine_id,
        conflicting_window_start: job.scheduled_start,
        conflicting_window_end: job.scheduled_end,
        shared_technician_id: techId!,
      }));

    return {
      machine_id: input.machine_id,
      window_start: input.window_start,
      window_end: input.window_end,
      feasible: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Tool 6: resolve_negotiation
   * Arbiter-only. Deterministic cost comparison (no LLM).
   * - If gap < 10%: auto-accept lower-cost.
   * - If gap >= 10%: force lower-cost, log override.
   * - If safety risk (risk > 95% at +24h): escalate to human.
   */
  @Tool({
    name: 'resolve_negotiation',
    description:
      'Arbiter-only. Deterministically resolve a negotiation by comparing costs. No LLM involved. Applies thresholds for auto-accept, override, or escalation.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier'),
      caller_role: z.enum(['Maintenance', 'Production', 'Arbiter']).describe('Role of the caller'),
    }),
  })
  async resolveNegotiation(
    input: { machine_id: string; caller_role: string },
    context: ExecutionContext,
  ): Promise<ArbiterResolution | { error: string }> {
    // CONTEXT ISOLATION: Reject if not Arbiter
    if (input.caller_role !== 'Arbiter') {
      return {
        error: `Access denied. resolve_negotiation is Arbiter-only. Caller role: ${input.caller_role}`,
      };
    }

    const log = NEGOTIATION_LOGS[input.machine_id];
    if (!log || log.entries.length === 0) {
      return { error: `No negotiation entries for machine ${input.machine_id}` };
    }

    // Get the two most recent proposals (one per role, ideally)
    const proposals = log.entries.map((e) => e.proposal);
    if (proposals.length < 2) {
      return {
        error: `Insufficient proposals (${proposals.length}). Need at least 2 to resolve.`,
      };
    }

    // Compare the most recent proposal from each role.
    const maintenanceProposal = [...proposals].reverse().find((p) => p.role === 'Maintenance');
    const productionProposal = [...proposals].reverse().find((p) => p.role === 'Production');

    if (!maintenanceProposal || !productionProposal) {
      return {
        error: 'Both Maintenance and Production must propose before resolution.',
      };
    }

    const maintenanceCost = maintenanceProposal.estimated_cost;
    const productionCost = productionProposal.estimated_cost;

    const costGap = Math.abs(maintenanceCost - productionCost);
    const costGapPct = (costGap / Math.max(maintenanceCost, productionCost)) * 100;

    // Determine winner (lower cost)
    const winningProposal =
      maintenanceCost < productionCost ? maintenanceProposal : productionProposal;

    // Check safety threshold: if risk > 95% at +24h, escalate
    const machine = MACHINES[input.machine_id];
    if (machine) {
      const riskAt24h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 24);
      if (riskAt24h > 95) {
        log.final_resolution = {
          machine_id: input.machine_id,
          decision: 'escalate_human',
          winning_proposal: winningProposal,
          cost_gap_pct: costGapPct,
          override_applied: false,
          escalation_reason: `Safety threshold breached: risk at +24h is ${Math.round(riskAt24h)}% (> 95%)`,
          negotiation_rounds_completed: Math.ceil(proposals.length / 2),
        };
        return log.final_resolution;
      }
    }

    // Apply cost-gap thresholds
    const COST_GAP_THRESHOLD = 10; // %
    let decision: 'accept_maintenance' | 'accept_production' | 'escalate_human';
    let overrideApplied = false;

    if (costGapPct < COST_GAP_THRESHOLD) {
      // Auto-accept lower-cost
      decision = winningProposal.role === 'Maintenance' ? 'accept_maintenance' : 'accept_production';
    } else {
      // Gap >= threshold: force lower-cost, log override
      decision = winningProposal.role === 'Maintenance' ? 'accept_maintenance' : 'accept_production';
      overrideApplied = true;
    }

    const resolution: ArbiterResolution = {
      machine_id: input.machine_id,
      decision,
      winning_proposal: winningProposal,
      cost_gap_pct: Math.round(costGapPct * 10) / 10,
      override_applied: overrideApplied,
      negotiation_rounds_completed: Math.ceil(proposals.length / 2),
    };

    log.final_resolution = resolution;
    return resolution;
  }
}
