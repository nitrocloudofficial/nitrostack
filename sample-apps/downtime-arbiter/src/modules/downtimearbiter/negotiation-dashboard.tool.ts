import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';
import { MACHINES, NEGOTIATION_LOGS } from './fixtures.js';
import { getRiskAtHorizon, riskToUrgencyTier } from './pf-curves.js';
import { RiskTrajectory, NegotiationLogEntry, ArbiterResolution } from './types.js';

/**
 * Dashboard DTO: aggregates all data needed for the negotiation console widget.
 * Reads from existing fixtures/resources; no transformation logic.
 */
export interface NegotiationDashboardDTO {
  machine_id: string;
  failure_mode: string;
  current_risk_pct: number;
  urgency_tier: string;
  sensor_detail: {
    bearing_temp_c: number;
    vibration_hz: number;
    oil_pressure_bar: number;
    last_reading_timestamp: string;
  };
  risk_trajectory: {
    now_risk_pct: number;
    risk_at_24h_pct: number;
    risk_at_72h_pct: number;
    risk_at_96h_pct: number;
  };
  negotiation_rounds: Array<{
    round: number;
    role: string;
    window_start: string;
    window_end: string;
    duration_hours: number;
    rationale: string;
    estimated_cost: number;
    timestamp: string;
  }>;
  final_resolution?: {
    decision: string;
    winning_proposal_role: string;
    winning_proposal_cost: number;
    cost_gap_pct: number;
    override_applied: boolean;
    escalation_reason?: string;
    negotiation_rounds_completed: number;
  };
}

@Injectable()
export class NegotiationDashboardTool {
  /**
   * Tool: get_negotiation_dashboard
   * Aggregates machine state, risk trajectory, negotiation history, and final resolution.
   * Reads from existing fixtures; no duplication of negotiation logic.
   */
  @Tool({
    name: 'get_negotiation_dashboard',
    description:
      'Retrieve complete negotiation dashboard for a machine: current state, risk trajectory, all proposals, and final arbiter decision.',
    inputSchema: z.object({
      machine_id: z.string().describe('Machine identifier (e.g., MACH_001)'),
    }),
  })
  @Widget('negotiation-console')
  async getNegotiationDashboard(
    input: { machine_id: string },
    context: ExecutionContext,
  ): Promise<NegotiationDashboardDTO | { error: string }> {
    const machine = MACHINES[input.machine_id];
    if (!machine) {
      return { error: `Machine not found: ${input.machine_id}` };
    }

    const log = NEGOTIATION_LOGS[input.machine_id];
    if (!log) {
      return { error: `No negotiation log for machine: ${input.machine_id}` };
    }

    // Compute risk trajectory
    const now = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 0);
    const at24h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 24);
    const at72h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 72);
    const at96h = getRiskAtHorizon(machine.failure_mode, machine.current_risk_pct, 96);

    // Derive urgency tier
    const urgencyTier = riskToUrgencyTier(machine.current_risk_pct);

    // Format negotiation rounds
    const negotiationRounds = log.entries.map((entry: NegotiationLogEntry) => ({
      round: entry.round,
      role: entry.proposal.role,
      window_start: entry.proposal.window_start,
      window_end: entry.proposal.window_end,
      duration_hours: entry.proposal.duration_hours,
      rationale: entry.proposal.rationale,
      estimated_cost: entry.proposal.estimated_cost,
      timestamp: entry.timestamp,
    }));

    // Format final resolution if present
    let finalResolution: NegotiationDashboardDTO['final_resolution'] | undefined;
    if (log.final_resolution) {
      const res = log.final_resolution as ArbiterResolution;
      finalResolution = {
        decision: res.decision,
        winning_proposal_role: res.winning_proposal.role,
        winning_proposal_cost: res.winning_proposal.estimated_cost,
        cost_gap_pct: res.cost_gap_pct,
        override_applied: res.override_applied,
        escalation_reason: res.escalation_reason,
        negotiation_rounds_completed: res.negotiation_rounds_completed,
      };
    }

    return {
      machine_id: input.machine_id,
      failure_mode: machine.failure_mode,
      current_risk_pct: machine.current_risk_pct,
      urgency_tier: urgencyTier,
      sensor_detail: machine.sensor_detail,
      risk_trajectory: {
        now_risk_pct: Math.round(now * 10) / 10,
        risk_at_24h_pct: Math.round(at24h * 10) / 10,
        risk_at_72h_pct: Math.round(at72h * 10) / 10,
        risk_at_96h_pct: Math.round(at96h * 10) / 10,
      },
      negotiation_rounds: negotiationRounds,
      final_resolution: finalResolution,
    };
  }
}
