/**
 * Core types for Downtime Arbiter system.
 * Enforces context isolation and P-F curve modeling.
 */

export type FailureMode = 'bearing_spall' | 'thermal_degradation';
export type UrgencyTier = 'Low' | 'Medium' | 'High' | 'Critical';
export type AgentRole = 'Maintenance' | 'Production' | 'Arbiter';

/**
 * Machine state visible to Maintenance (full sensor detail).
 */
export interface MachineSignal {
  machine_id: string;
  failure_mode: FailureMode;
  current_risk_pct: number; // 0-100
  sensor_detail: {
    bearing_temp_c: number;
    vibration_hz: number;
    oil_pressure_bar: number;
    last_reading_timestamp: string;
  };
}

/**
 * Machine state visible to Production (coarse tier only, never raw %).
 * This is derived server-side from risk; Production never sees the underlying number.
 */
export interface UrgencyTierResponse {
  machine_id: string;
  urgency_tier: UrgencyTier;
  // NO risk_pct field — context isolation enforced
}

/**
 * Risk trajectory per P-F curve (Maintenance-only).
 * Shows risk at multiple horizons, not a single score.
 */
export interface RiskTrajectory {
  machine_id: string;
  failure_mode: FailureMode;
  now_risk_pct: number;
  risk_at_24h_pct: number;
  risk_at_72h_pct: number;
  risk_at_96h_pct: number;
}

/**
 * Proposal in negotiation (both roles can propose).
 */
export interface ProposalWindow {
  role: AgentRole;
  machine_id: string;
  window_start: string; // ISO 8601
  window_end: string;
  duration_hours: number;
  rationale: string;
  estimated_cost: number; // arbitrary units for comparison
}

/**
 * Negotiation log entry (one per proposal).
 */
export interface NegotiationLogEntry {
  machine_id: string;
  round: number; // 1 or 2
  proposal: ProposalWindow;
  timestamp: string;
}

/**
 * Constraint check result.
 */
export interface ConstraintCheckResult {
  machine_id: string;
  window_start: string;
  window_end: string;
  feasible: boolean;
  conflicts: Array<{
    conflicting_machine_id: string;
    conflicting_window_start: string;
    conflicting_window_end: string;
    shared_technician_id: string;
  }>;
}

/**
 * Arbiter resolution (deterministic, no LLM).
 */
export interface ArbiterResolution {
  machine_id: string;
  decision: 'accept_maintenance' | 'accept_production' | 'escalate_human';
  winning_proposal: ProposalWindow;
  cost_gap_pct: number;
  override_applied: boolean; // true if gap >= threshold and forced lower-cost
  escalation_reason?: string; // if decision === 'escalate_human'
  negotiation_rounds_completed: number;
}

/**
 * Rolling 2-week schedule (mock data).
 */
export interface ScheduledJob {
  job_id: string;
  machine_id: string;
  technician_id: string;
  scheduled_start: string; // ISO 8601
  scheduled_end: string;
  deadline: string;
  description: string;
}

export interface RollingPlan {
  plan_week_start: string;
  plan_week_end: string;
  jobs: ScheduledJob[];
  technicians: Array<{
    technician_id: string;
    name: string;
    machines_assigned: string[]; // 2 machines per technician
  }>;
}

/**
 * Full negotiation log for a machine.
 */
export interface MachineNegotiationLog {
  machine_id: string;
  entries: NegotiationLogEntry[];
  final_resolution?: ArbiterResolution;
}
