export interface SubGoal {
  id: string;
  description: string;
  requiredAgent: string;
  priority: number;
}

export interface Proposal {
  source: string;
  action: string;
  reason: string;
  confidence: number;
}

export interface Veto {
  source: string;
  vetoed_action: string;
  reason: string;
  sop_reference?: string;
  round?: number;
}

export interface Challenge {
  source: string;
  challenged_proposal: string;
  challenge: string;
  requested_evidence: string;
  severity: string;
  round?: number;
}

export interface WorkOrder {
  type: string;
  machine_id: string;
  action: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  assigned_to: string;
  notes: string;
}

export interface SupervisorNotification {
  type: string;
  machine_id: string;
  summary: string;
  requires_approval: boolean;
}

export interface FieldConflict {
  field: string;
  user_value: any;
  live_sensor_value: any;
  selected_source: 'user_input' | 'live_sensor' | 'merge';
  selected_value: any;
  reason: string;
}

export interface DataSourceDetail {
  field: string;
  value: any;
  source: 'user_input' | 'live_sensor' | 'merge';
  has_conflict: boolean;
  conflict_detail?: string;
}

export interface FinalDecision {
  chosen_action: string;
  confidence: number;
  reason: string;
  supporting_evidence: Record<string, string>;
  data_sources_summary?: Record<string, DataSourceDetail>;
  conflicts_resolved?: FieldConflict[];
  data_source_policy_applied?: string;
  vetoes: Veto[];
  challenges_addressed: Challenge[];
  agents_consulted: string[];
  machine_id: string;
  negotiation_rounds: number;
}

export interface DecisionTwinState {
  event: Record<string, any>;
  event_type: 'sensor_anomaly' | 'maintenance_alert' | 'quality_deviation' | string;
  data_source_priority?: 'user_input' | 'live_sensor' | 'merge';

  sub_goals: SubGoal[];

  phase: 'planning' | 'evidence' | 'reflection' | 'simulation' | 'convergence' | string;
  active_agents: string[];
  agents_completed: string[];
  current_agent: string;

  // Tracks how many Devil's Advocate / Safety negotiation rounds have run (reflection pillar).
  negotiation_round: number;

  blackboard: Record<string, any>;

  proposals: Proposal[];
  vetoes: Veto[];
  challenges: Challenge[];
  final_decision?: FinalDecision;
  conflicts?: FieldConflict[];
  data_sources?: Record<string, DataSourceDetail>;

  work_orders: WorkOrder[];
  notifications: SupervisorNotification[];

  trace: string[];
}
