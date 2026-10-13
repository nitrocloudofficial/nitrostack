import type { ExecutionContext } from '@nitrostack/core';
import {
  SURGEGUARD_CONTRACT,
  type JsonSchemaNode,
} from '../../contracts/surgeguard-contract.js';
import { surgeSimulation } from './surgeguard.simulation.js';

type JsonRecord = Record<string, unknown>;

const IDS = {
  correlation: '6c2a3f4a-8ce0-4eb4-b6fa-7d647e9b3f11',
  incident: 'd4b68216-20ec-459a-99aa-cf3d65b99d25',
  operationalPeriod: 'd704cb95-8797-4b0e-95bc-0c2e9d3f6245',
  facility: 'c0f87541-b270-43ee-8d24-c4a4eaf1c9c5',
  planA: '98c9b7f2-a9ce-49a9-97d2-b39e181c51d3',
  planB: '549f6a4a-d7b7-4ea6-9af7-7f0c046b5dc7',
  planC: '1ec26f84-6642-4bb2-aa45-afc05bf2decb',
  execution: '1a04431a-e9d8-4961-b5fa-e370ab5de74c',
  evaluation: 'b086fcd7-ab6d-4b58-8e6e-3b24064cc7ef',
  task: 'f42ac69a-9bcd-42c4-a5e0-f9ee587e886a',
  generic: '04fa26c8-a107-4f52-ab77-b628accd4d2d',
};

const APPROVED_PLAN_HASH = 'sha256:82f7d97091d42b9386fb8a4406ef10fe';

function timestamp(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
}

function valueForSchema(schema: JsonSchemaNode, key = ''): unknown {
  if (schema.enum?.length) return schema.enum[0];

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const type = types.find((candidate) => candidate !== 'null') ?? 'null';

  switch (type) {
    case 'object': {
      const result: JsonRecord = {};
      const required = new Set(schema.required ?? []);
      for (const [property, childSchema] of Object.entries(schema.properties ?? {})) {
        if (required.has(property)) result[property] = valueForSchema(childSchema, property);
      }
      return result;
    }
    case 'array':
      return [];
    case 'boolean':
      return false;
    case 'integer':
    case 'number':
      return schema.minimum ?? 0;
    case 'string':
      if (schema.format === 'uuid') return IDS.generic;
      if (schema.format === 'date-time') return timestamp();
      if (key.includes('hash')) return APPROVED_PLAN_HASH;
      return 'demo';
    default:
      return null;
  }
}

function capacityData(): JsonRecord {
  return {
    view_type: 'capacity',
    summary: {
      occupied: 287,
      staffed_capacity: 316,
      licensed_capacity: 342,
      available: 18,
      held: 6,
      cleaning: 5,
      blocked: 4,
      occupancy_percent: 90.8,
      surge_spaces_ready: 12,
      surge_spaces_blocked: 4,
    },
    locations: [
      {
        name: 'Emergency Department',
        code: 'ED',
        occupied: 54,
        capacity: 58,
        occupancy_percent: 93,
        available: 2,
        cleaning: 2,
        status: 'critical',
      },
      {
        name: 'Intensive Care Unit',
        code: 'ICU',
        occupied: 30,
        capacity: 32,
        occupancy_percent: 94,
        available: 1,
        cleaning: 1,
        status: 'critical',
      },
      {
        name: 'Step-down Unit',
        code: 'SDU',
        occupied: 38,
        capacity: 44,
        occupancy_percent: 86,
        available: 4,
        cleaning: 2,
        status: 'strained',
      },
      {
        name: 'Medical / Surgical',
        code: 'MS',
        occupied: 165,
        capacity: 182,
        occupancy_percent: 91,
        available: 11,
        cleaning: 0,
        status: 'strained',
      },
    ],
    freshness: {
      as_of: timestamp(-2),
      age_seconds: 118,
      status: 'current',
      source_systems: ['ADT', 'Bed Management', 'Environmental Services'],
    },
  };
}

function queueData(): JsonRecord {
  return {
    view_type: 'queue',
    system_pressure: {
      status: 'critical',
      score: 87,
      active_patients: 73,
      service_level_breaches: 18,
      longest_wait_minutes: 244,
    },
    queues: [
      {
        name: 'ED - Waiting for provider',
        active: 31,
        breach_count: 11,
        average_wait_minutes: 82,
        p90_wait_minutes: 148,
        longest_wait_minutes: 192,
        trend_percent: 18,
        status: 'critical',
      },
      {
        name: 'ED - Admission hold',
        active: 17,
        breach_count: 5,
        average_wait_minutes: 136,
        p90_wait_minutes: 221,
        longest_wait_minutes: 244,
        trend_percent: 12,
        status: 'critical',
      },
      {
        name: 'Imaging',
        active: 14,
        breach_count: 2,
        average_wait_minutes: 47,
        p90_wait_minutes: 73,
        longest_wait_minutes: 96,
        trend_percent: -6,
        status: 'strained',
      },
      {
        name: 'Discharge transport',
        active: 11,
        breach_count: 0,
        average_wait_minutes: 29,
        p90_wait_minutes: 41,
        longest_wait_minutes: 55,
        trend_percent: -9,
        status: 'watch',
      },
    ],
    freshness: {
      as_of: timestamp(-1),
      age_seconds: 74,
      status: 'current',
    },
  };
}

function staffingData(): JsonRecord {
  return {
    view_type: 'staffing',
    coverage: [
      {
        role: 'Emergency RN',
        required: 26,
        assigned: 23,
        eligible: 21,
        gap: 5,
        coverage_percent: 81,
        status: 'blocked',
      },
      {
        role: 'Critical Care RN',
        required: 14,
        assigned: 13,
        eligible: 12,
        gap: 2,
        coverage_percent: 86,
        status: 'strained',
      },
      {
        role: 'Respiratory Therapist',
        required: 7,
        assigned: 7,
        eligible: 7,
        gap: 0,
        coverage_percent: 100,
        status: 'ready',
      },
      {
        role: 'Hospitalist',
        required: 9,
        assigned: 9,
        eligible: 8,
        gap: 1,
        coverage_percent: 89,
        status: 'watch',
      },
    ],
    eligible_practitioners: {
      total: 74,
      on_shift: 62,
      available_on_call: 12,
      restricted: 4,
      fatigue_risk: 3,
    },
    gaps: [
      {
        role: 'Emergency RN',
        count: 5,
        starts_at: timestamp(30),
        hard_constraint: true,
        reason: 'Two assignments lack current trauma competency; three positions unfilled.',
      },
      {
        role: 'Critical Care RN',
        count: 2,
        starts_at: timestamp(60),
        hard_constraint: true,
        reason: 'ICU privilege and fatigue checks leave twelve eligible staff.',
      },
    ],
    freshness: {
      as_of: timestamp(-4),
      age_seconds: 241,
      status: 'current',
    },
  };
}

function incidentData(input: JsonRecord): JsonRecord {
  return {
    view_type: 'incident',
    incident: {
      incident_id: input.incident_id ?? IDS.incident,
      incident_number: 'SG-2026-0725',
      name: 'Metro respiratory surge',
      severity: 'level_3',
      status: 'activated',
      command_lead: 'Dr. Maya Iyer',
      primary_facility: 'Care360 Central',
      started_at: timestamp(-215),
      situation_summary: 'Respiratory arrivals are 34% above forecast with ICU and ED boarding constraints.',
    },
    operational_period: {
      operational_period_id: IDS.operationalPeriod,
      period_number: 3,
      starts_at: timestamp(-95),
      ends_at: timestamp(265),
      next_briefing_at: timestamp(55),
    },
    objectives: [
      { label: 'Reduce ED admission holds below 12', progress: 42, status: 'at_risk' },
      { label: 'Open 8 policy-cleared surge beds', progress: 75, status: 'on_track' },
      { label: 'Close critical RN coverage gap', progress: 38, status: 'blocked' },
    ],
    tasks: [
      { label: 'Validate negative-pressure rooms', owner: 'Facilities', due_at: timestamp(20), status: 'in_progress' },
      { label: 'Confirm ICU float pool credentials', owner: 'Nursing Ops', due_at: timestamp(35), status: 'blocked' },
      { label: 'Activate discharge lounge transport', owner: 'Patient Flow', due_at: timestamp(15), status: 'completed' },
    ],
  };
}

function policyGateData(): JsonRecord {
  return {
    view_type: 'policy_gate',
    status: 'blocked',
    evaluation_session: {
      evaluation_session_id: IDS.evaluation,
      evaluated_at: timestamp(-1),
      plan_hash: APPROVED_PLAN_HASH,
      rules_evaluated: 42,
      rules_passed: 39,
      source_snapshot_age_seconds: 118,
    },
    violations: [
      {
        code: 'STAFF.ED.RN.MIN',
        title: 'Emergency RN minimum coverage',
        severity: 'critical',
        constraint_type: 'hard',
        status: 'open',
        overridable: false,
        evidence: '21 eligible RNs for a required minimum of 26.',
        remediation: 'Add five eligible ED RNs or reduce activated treatment capacity.',
      },
      {
        code: 'ISOLATION.NEG_PRESSURE',
        title: 'Negative-pressure placement',
        severity: 'high',
        constraint_type: 'hard',
        status: 'open',
        overridable: false,
        evidence: 'Two airborne-isolation encounters assigned to rooms without verified capability.',
        remediation: 'Route to cleared rooms NP-04 and NP-06 before execution.',
      },
      {
        code: 'FATIGUE.MAX_HOURS',
        title: 'Maximum continuous duty',
        severity: 'medium',
        constraint_type: 'soft',
        status: 'acknowledged',
        overridable: true,
        evidence: 'One hospitalist assignment reaches 15.5 continuous hours.',
        remediation: 'Replace at 02:00 or submit an authorized, time-bounded exception.',
      },
    ],
    evidence: [
      { source: 'Workforce eligibility projection', as_of: timestamp(-4), status: 'current' },
      { source: 'Bed capability registry', as_of: timestamp(-2), status: 'current' },
      { source: 'Policy release SG-ED-4.2', as_of: '2026-06-30T00:00:00.000Z', status: 'published' },
    ],
  };
}

function planData(input: JsonRecord): JsonRecord {
  return {
    view_type: 'plan',
    plan: {
      candidate_plan_id: input.candidate_plan_id ?? IDS.planA,
      name: 'Balanced decompression',
      rank: 1,
      status: 'pending_approval',
      gate_status: 'conditional',
      plan_hash: APPROVED_PLAN_HASH,
      created_at: timestamp(-18),
      assumptions: ['Arrival rate remains within P90 forecast', 'Discharge lounge available by 23:00'],
    },
    actions: [
      { order: 1, action: 'Open 8 flex beds in 4 North', owner: 'Bed Command', start: timestamp(20), status: 'ready' },
      { order: 2, action: 'Move 6 discharge-ready patients to lounge', owner: 'Patient Flow', start: timestamp(10), status: 'ready' },
      { order: 3, action: 'Call in 5 ED RNs from eligible pool', owner: 'Nursing Ops', start: timestamp(5), status: 'conditional' },
      { order: 4, action: 'Route airborne isolation to NP-04 / NP-06', owner: 'ED Charge', start: timestamp(15), status: 'ready' },
    ],
    allocations: {
      beds: 8,
      staff_assignments: 12,
      transfers: 3,
      devices: 6,
    },
    scores: {
      safety: 96,
      wait_reduction: 23,
      time_to_effect_minutes: 38,
      cost_index: 1.14,
    },
    approvals: [
      { role: 'Incident Commander', status: 'approved', decided_at: timestamp(-6) },
      { role: 'Nursing Supervisor', status: 'pending' },
      { role: 'Safety Officer', status: 'pending' },
    ],
  };
}

function comparisonData(): JsonRecord {
  return {
    view_type: 'plan_comparison',
    comparison: [
      {
        candidate_plan_id: IDS.planA,
        name: 'Balanced decompression',
        rank: 1,
        gate_status: 'conditional',
        wait_reduction_percent: 23,
        safety_score: 96,
        staffing_gap: 0,
        beds_opened: 8,
        time_to_effect_minutes: 38,
        cost_index: 1.14,
        recommendation: 'best_safe_tradeoff',
      },
      {
        candidate_plan_id: IDS.planB,
        name: 'Fast capacity release',
        rank: 2,
        gate_status: 'blocked',
        wait_reduction_percent: 31,
        safety_score: 71,
        staffing_gap: 5,
        beds_opened: 14,
        time_to_effect_minutes: 24,
        cost_index: 1.08,
        recommendation: 'ineligible',
      },
      {
        candidate_plan_id: IDS.planC,
        name: 'Transfer-first',
        rank: 3,
        gate_status: 'clear',
        wait_reduction_percent: 17,
        safety_score: 99,
        staffing_gap: 0,
        beds_opened: 4,
        time_to_effect_minutes: 62,
        cost_index: 1.32,
        recommendation: 'safe_alternative',
      },
    ],
    dominance: {
      preferred_plan_id: IDS.planA,
      rationale: 'Highest wait-time reduction among plans without unresolved hard constraints.',
      blocked_plan_ids: [IDS.planB],
    },
    tradeoffs: [
      'Plan A reaches relief 24 minutes sooner than Plan C, with a conditional soft-rule mitigation.',
      'Plan B reduces wait fastest but is ineligible because five required ED RN positions are uncovered.',
      'Plan C is safest but depends on receiving-facility acceptance and costs 16% more.',
    ],
  };
}

function executionData(input: JsonRecord): JsonRecord {
  return {
    view_type: 'execution',
    execution: {
      plan_execution_id: input.plan_execution_id ?? IDS.execution,
      plan_name: 'Balanced decompression',
      status: 'running',
      progress_percent: 58,
      started_at: timestamp(-34),
      expected_complete_at: timestamp(41),
      policy_gate_status: 'clear',
      last_gate_at: timestamp(-2),
    },
    steps: [
      { sequence: 1, name: 'Revalidate source snapshot', owner: 'Automation', status: 'succeeded', completed_at: timestamp(-33) },
      { sequence: 2, name: 'Activate discharge lounge', owner: 'Patient Flow', status: 'succeeded', completed_at: timestamp(-27) },
      { sequence: 3, name: 'Prepare 4 North flex beds', owner: 'Bed Command', status: 'running', progress: 75 },
      { sequence: 4, name: 'Call eligible ED RN pool', owner: 'Nursing Ops', status: 'running', progress: 40 },
      { sequence: 5, name: 'Open diversion routes', owner: 'ED Charge', status: 'queued' },
    ],
    deviations: [
      {
        severity: 'low',
        description: 'Environmental services completion is 8 minutes behind plan.',
        corrective_action: 'Prioritize rooms 4N-12 and 4N-14.',
        gate_impact: 'none',
      },
    ],
    metrics: {
      projected_wait_reduction_percent: 23,
      observed_wait_reduction_percent: 11,
      beds_released: 4,
      staff_confirmed: 3,
      rollback_ready: true,
    },
  };
}

function customData(toolName: string, input: JsonRecord): JsonRecord | undefined {
  switch (toolName) {
    case 'get_system_health':
      return {
        components: [
          { name: 'MCP server', status: 'healthy', latency_ms: 18 },
          { name: 'PostgreSQL projection', status: 'healthy', latency_ms: 24 },
          { name: 'Policy engine', status: 'healthy', latency_ms: 41 },
          { name: 'Optimizer', status: 'healthy', latency_ms: 63 },
          { name: 'FHIR integration', status: 'degraded', latency_ms: 180, note: 'One feed is 4 minutes stale.' },
        ],
        degraded: true,
      };
    case 'get_incident':
      return surgeSimulation.incidentData();
    case 'get_current_capacity':
      return surgeSimulation.capacityData();
    case 'get_queue_pressure':
      return surgeSimulation.queueData();
    case 'get_staffing_readiness':
      return { widget: surgeSimulation.staffingData() };
    case 'get_policy_gate':
      return surgeSimulation.policyData(
        typeof input.subject_id === 'string' ? input.subject_id : IDS.planA,
      );
    case 'get_plan':
      return {
        widget: surgeSimulation.planData(
          typeof input.candidate_plan_id === 'string' ? input.candidate_plan_id : IDS.planA,
        ),
      };
    case 'compare_plans':
      return {
        widget: surgeSimulation.comparisonData(
          typeof input.priority === 'string' ? input.priority : 'balanced',
        ),
      };
    case 'get_execution_status':
      return { widget: surgeSimulation.executionData() };
    case 'generate_surge_plan':
      return {
        optimization_run_id: IDS.generic,
        task_id: IDS.task,
        candidate_plan_ids: [IDS.planA, IDS.planB, IDS.planC],
        demo_mode: true,
      };
    case 'evaluate_plan':
      {
        const policy = surgeSimulation.policyData(
          typeof input.candidate_plan_id === 'string' ? input.candidate_plan_id : IDS.planA,
        );
      return {
        evaluation_session_ids: [IDS.evaluation],
        gate_status: policy.status,
        violations: policy.violations,
        demo_mode: true,
      };
      }
    case 'execute_plan':
      return {
        plan_execution_id: IDS.execution,
        status: 'queued',
        execution_step_ids: [IDS.generic],
        pre_execution_gate: 'clear',
        locked_plan_hash: input.locked_plan_hash ?? APPROVED_PLAN_HASH,
        demo_mode: true,
      };
    default:
      return undefined;
  }
}

function policyGateFor(toolName: string, input: JsonRecord): JsonRecord {
  if (toolName === 'get_policy_gate') {
    const policy = surgeSimulation.policyData(
      typeof input.subject_id === 'string' ? input.subject_id : IDS.planA,
    );
    return {
      status: policy.status,
      evaluation_session_id: IDS.evaluation,
      violations: policy.violations,
    };
  }
  if (['get_plan', 'compare_plans'].includes(toolName)) {
    return {
      status: 'conditional',
      evaluation_session_id: IDS.evaluation,
      violations: [],
    };
  }
  if (toolName === 'execute_plan' || toolName === 'get_execution_status') {
    return {
      status: 'clear',
      evaluation_session_id: IDS.evaluation,
      violations: [],
    };
  }
  return { status: 'not_evaluated', violations: [] };
}

export async function runSurgeGuardTool(
  toolName: string,
  input: JsonRecord,
  context: ExecutionContext,
): Promise<JsonRecord> {
  const contract = SURGEGUARD_CONTRACT.tools.find((tool) => tool.name === toolName);
  if (!contract) throw new Error(`Unknown SurgeGuard tool: ${toolName}`);

  context.logger.info('SurgeGuard tool invoked', {
    tool: toolName,
    auditEventCode: contract.runtime.auditEventCode,
    classification: contract.security.classification,
    transactionMode: contract.security.transactionMode,
  });

  if (context.task) {
    context.task.updateProgress('Validating tenant scope and source freshness');
    context.task.throwIfCancelled();
    context.task.updateProgress('Applying SurgeGuard policy controls');
  }

  const generated = valueForSchema(contract.outputSchema) as JsonRecord;
  const generatedData = (generated.data ?? {}) as JsonRecord;
  const data = {
    ...generatedData,
    ...customData(toolName, input),
  };

  if (!contract.annotations.readOnlyHint) {
    data.demo_mode = true;
    data.audit_event_code = contract.runtime.auditEventCode;
    data.policy_requirement = contract.security.policyGate;
    data.human_approval = contract.security.humanApproval;
  }

  return {
    ...generated,
    ok: true,
    correlation_id: typeof input.correlation_id === 'string'
      ? input.correlation_id
      : IDS.correlation,
    data,
    warnings: [
      {
        code: 'SG_DEMO_DATA',
        message: 'A stateful 1,000-record hospital simulation is active. Connect PostgreSQL and hospital source systems before production use.',
        details: {
          source: 'surgeguard-live-simulation',
          record_count: surgeSimulation.recordCount,
          no_external_effects: true,
        },
      },
    ],
    policy_gate: policyGateFor(toolName, input),
  };
}

export function resourceSnapshot(uri: string): JsonRecord {
  if (uri === 'surgeguard://health') {
    return { generated_at: timestamp(), components: customData('get_system_health', {}) };
  }
  if (uri === 'surgeguard://incidents/active') {
    return {
      generated_at: timestamp(),
      simulation_records: surgeSimulation.recordCount,
      incidents: [surgeSimulation.incidentData().incident],
    };
  }
  if (uri.includes('/capacity/current')) return surgeSimulation.capacityData();
  if (uri.includes('/queues/current')) return surgeSimulation.queueData();
  if (uri.includes('/action-plan')) return surgeSimulation.planData();
  if (uri.includes('/policy-gate')) return surgeSimulation.policyData();
  if (uri.includes('/executions/')) return surgeSimulation.executionData();
  if (uri.includes('/plans/')) return surgeSimulation.planData();
  return { generated_at: timestamp(), status: 'not_found' };
}

export { APPROVED_PLAN_HASH, IDS };
