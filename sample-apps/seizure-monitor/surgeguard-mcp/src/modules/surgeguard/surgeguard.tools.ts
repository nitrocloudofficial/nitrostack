import {
  ExecutionContext,
  ToolDecorator as Tool,
  Widget,
  z,
} from '@nitrostack/core';
import { jsonSchemaToZod } from '../../contracts/json-schema-to-zod.js';
import { SURGEGUARD_CONTRACT } from '../../contracts/surgeguard-contract.js';
import { runSurgeGuardTool } from './surgeguard.runtime.js';
import {
  surgeSimulation,
  type CustomSurgeScenario,
  type SurgeEvent,
} from './surgeguard.simulation.js';
import { surgeRepository } from './surgeguard.repository.js';

type JsonRecord = Record<string, unknown>;
type PlanChoice = 'balanced_decompression' | 'fast_capacity_release' | 'transfer_first';

const DEMO_IDS = {
  tenant_id: '11111111-1111-4111-8111-111111111111',
  facility_id: 'c0f87541-b270-43ee-8d24-c4a4eaf1c9c5',
  incident_id: 'd4b68216-20ec-459a-99aa-cf3d65b99d25',
  balanced_plan_id: '98c9b7f2-a9ce-49a9-97d2-b39e181c51d3',
  fast_plan_id: '549f6a4a-d7b7-4ea6-9af7-7f0c046b5dc7',
  transfer_plan_id: '1ec26f84-6642-4bb2-aa45-afc05bf2decb',
  execution_id: '1a04431a-e9d8-4961-b5fa-e370ab5de74c',
  correlation_id: '6c2a3f4a-8ce0-4eb4-b6fa-7d647e9b3f11',
  purpose_of_use: 'emergency surge planning demonstration',
};

const planChoiceSchema = z
  .enum(['balanced_decompression', 'fast_capacity_release', 'transfer_first'])
  .default('balanced_decompression')
  .describe('Choose the operational plan to review');

const commandCenterOutputSchema = z.object({
  view_type: z.literal('command_center'),
  simulation_tick: z.number(),
  last_event: z.string(),
  database: z.object({
    engine: z.string(),
    persistent: z.boolean(),
    operational_records: z.number(),
    audit_events: z.number(),
  }).passthrough(),
  incident: z.record(z.unknown()),
  capacity: z.record(z.unknown()),
  queue: z.record(z.unknown()),
  staffing: z.record(z.unknown()),
  planning: z.record(z.unknown()),
  policy_gates: z.record(z.unknown()),
  selected_plan: z.string().nullable(),
  execution: z.record(z.unknown()),
  timeline: z.array(z.record(z.unknown())),
  available_actions: z.record(z.array(z.string())),
}).passthrough();

function canonicalTool(name: string) {
  const contract = SURGEGUARD_CONTRACT.tools.find((tool) => tool.name === name);
  if (!contract) throw new Error(`Missing canonical SurgeGuard contract: ${name}`);
  return contract;
}

function canonicalOutput(name: string) {
  return jsonSchemaToZod(canonicalTool(name).outputSchema);
}

function planId(choice: PlanChoice = 'balanced_decompression') {
  if (choice === 'transfer_first') return DEMO_IDS.transfer_plan_id;
  if (choice === 'fast_capacity_release') return DEMO_IDS.fast_plan_id;
  return DEMO_IDS.balanced_plan_id;
}

function hiddenContext(extra: JsonRecord = {}): JsonRecord {
  return {
    ...DEMO_IDS,
    ...extra,
  };
}

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const liveRefreshAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const actionAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/**
 * Hackathon-friendly facade. Production identifiers remain part of the
 * canonical contract, but are resolved from the active demo session.
 */
export class SurgeGuardTools {
  @Tool({
    name: 'surge_command_center',
    title: 'Open Surge Command Center',
    description: 'Run the complete persistent surge demo: change hospital conditions, compare plans, check policy, approve, execute and inspect the audit trail.',
    inputSchema: z.object({
      action: z
        .enum(['view', 'apply_event', 'apply_scenario', 'generate_plans', 'check_plan', 'approve_plan', 'execute_plan'])
        .default('view')
        .describe('Choose the command-center action'),
      event: z
        .enum(['arrival_spike', 'staff_callout', 'beds_cleaned', 'discharge_wave'])
        .optional()
        .describe('Scenario event used by apply_event'),
      arrivals: z
        .number()
        .int()
        .min(0)
        .max(60)
        .optional()
        .describe('New active arrivals for apply_scenario'),
      queue_completions: z
        .number()
        .int()
        .min(0)
        .max(420)
        .optional()
        .describe('Patients whose active queue steps were completed for apply_scenario'),
      rn_change: z
        .number()
        .int()
        .min(-12)
        .max(12)
        .optional()
        .describe('Emergency RN shift delta; negative calls staff out, positive recalls staff'),
      beds_cleaned: z
        .number()
        .int()
        .min(0)
        .max(30)
        .optional()
        .describe('Cleaning beds returned to service for apply_scenario'),
      discharges: z
        .number()
        .int()
        .min(0)
        .max(40)
        .optional()
        .describe('Active patients discharged for apply_scenario'),
      priority: z
        .enum(['balanced', 'fastest_relief', 'maximum_safety'])
        .default('balanced')
        .describe('Planning priority'),
      plan: z
        .enum(['balanced_decompression', 'fast_capacity_release', 'transfer_first'])
        .default('balanced_decompression')
        .describe('Plan used by policy, approval and execution actions'),
      pace: z
        .enum(['cautious', 'standard', 'rapid'])
        .default('standard')
        .describe('Execution pace'),
      approval_note: z
        .string()
        .max(240)
        .optional()
        .describe('Optional command approval note'),
    }).strict(),
    outputSchema: commandCenterOutputSchema,
    annotations: actionAnnotations,
    invocation: {
      invoking: 'Updating the persistent surge command center...',
      invoked: 'Surge command center ready',
    },
  })
  @Widget({ route: 'command-center-v2', prefersBorder: false })
  async surgeCommandCenter(
    input: {
      action?: 'view' | 'apply_event' | 'apply_scenario' | 'generate_plans' | 'check_plan' | 'approve_plan' | 'execute_plan';
      event?: SurgeEvent;
      arrivals?: number;
      queue_completions?: number;
      rn_change?: number;
      beds_cleaned?: number;
      discharges?: number;
      priority?: 'balanced' | 'fastest_relief' | 'maximum_safety';
      plan?: PlanChoice;
      pace?: 'cautious' | 'standard' | 'rapid';
      approval_note?: string;
    },
    context: ExecutionContext,
  ) {
    const action = input.action ?? 'view';
    const plan = input.plan ?? 'balanced_decompression';
    const priority = input.priority ?? 'balanced';

    if (action === 'view') {
      surgeSimulation.advanceLiveClock();
    } else if (action === 'apply_event') {
      surgeSimulation.applyEvent(input.event ?? 'arrival_spike');
    } else if (action === 'apply_scenario') {
      const scenario: CustomSurgeScenario = {
        arrivals: input.arrivals ?? 0,
        queueCompletions: input.queue_completions ?? 0,
        rnChange: input.rn_change ?? 0,
        bedsCleaned: input.beds_cleaned ?? 0,
        discharges: input.discharges ?? 0,
      };
      surgeSimulation.applyScenario(scenario);
    } else if (action === 'generate_plans') {
      surgeSimulation.regenerateComparison(priority);
      surgeRepository.recordAudit(
        'plans_generated',
        'SurgeGuard Optimizer',
        `Candidate plans recalculated with ${priority.replaceAll('_', ' ')} priority.`,
        { priority },
      );
    } else if (action === 'check_plan') {
      const gate = surgeSimulation.policyData(planId(plan));
      surgeRepository.recordAudit(
        'policy_gate_checked',
        'Safety Officer',
        `${plan.replaceAll('_', ' ')} policy gate returned ${String(gate.status)}.`,
        { plan, status: gate.status },
      );
    } else if (action === 'approve_plan') {
      surgeSimulation.approve(plan);
      if (input.approval_note) {
        surgeRepository.recordAudit(
          'approval_note_added',
          'Incident Commander',
          input.approval_note,
          { plan },
        );
      }
    } else if (action === 'execute_plan') {
      surgeSimulation.execute(plan, input.pace ?? 'standard');
    }

    context.logger.info('Surge command center action', {
      action,
      event: input.event,
      arrivals: input.arrivals,
      queueCompletions: input.queue_completions,
      rnChange: input.rn_change,
      bedsCleaned: input.beds_cleaned,
      discharges: input.discharges,
      priority,
      plan,
      pace: input.pace,
      persistentDatabase: true,
    });
    return surgeSimulation.commandCenterData(priority);
  }

  @Tool({
    name: 'refresh_surgeguard_view',
    title: 'Refresh SurgeGuard View',
    description: 'Advance the shared live hospital clock and return the latest persistent SurgeGuard state for an open widget.',
    inputSchema: z.object({
      view: z.enum([
        'incident',
        'capacity',
        'queue',
        'staffing',
        'plan_comparison',
        'policy_gate',
        'plan_review',
        'execution',
      ]),
      priority: z
        .enum(['balanced', 'fastest_relief', 'maximum_safety'])
        .default('balanced')
        .optional(),
      plan: z
        .enum(['balanced_decompression', 'fast_capacity_release', 'transfer_first'])
        .optional(),
    }).strict(),
    outputSchema: z.record(z.unknown()),
    annotations: liveRefreshAnnotations,
    invocation: {
      invoking: 'Refreshing live SurgeGuard data...',
      invoked: 'Live SurgeGuard data refreshed',
    },
  })
  async refreshSurgeGuardView(
    input: {
      view: 'incident' | 'capacity' | 'queue' | 'staffing' | 'plan_comparison' | 'policy_gate' | 'plan_review' | 'execution';
      priority?: 'balanced' | 'fastest_relief' | 'maximum_safety';
      plan?: PlanChoice;
    },
    context: ExecutionContext,
  ) {
    surgeSimulation.advanceLiveClock();
    const currentPlanId = input.plan
      ? planId(input.plan)
      : surgeSimulation.currentPlanId();
    const toolByView = {
      incident: ['get_incident', hiddenContext()],
      capacity: ['get_current_capacity', hiddenContext()],
      queue: ['get_queue_pressure', hiddenContext()],
      staffing: ['get_staffing_readiness', hiddenContext()],
      plan_comparison: [
        'compare_plans',
        hiddenContext({ priority: input.priority ?? 'balanced' }),
      ],
      policy_gate: [
        'get_policy_gate',
        hiddenContext({ subject_type: 'candidate_plan', subject_id: currentPlanId }),
      ],
      plan_review: [
        'get_plan',
        hiddenContext({ candidate_plan_id: currentPlanId }),
      ],
      execution: [
        'get_execution_status',
        hiddenContext({ plan_execution_id: DEMO_IDS.execution_id }),
      ],
    } as const;
    const [toolName, toolInput] = toolByView[input.view];
    return runSurgeGuardTool(toolName, toolInput, context);
  }

  @Tool({
    name: 'show_incident_brief',
    title: 'Show Incident Brief',
    description: 'Show the active surge incident, command objectives and next actions. No IDs required.',
    inputSchema: z.object({
      focus: z
        .enum(['overview', 'patient_flow', 'capacity', 'staffing'])
        .default('overview')
        .describe('Choose which command concern to emphasize'),
    }).strict(),
    outputSchema: canonicalOutput('get_incident'),
    annotations: readAnnotations,
    invocation: {
      invoking: 'Loading the active incident...',
      invoked: 'Incident brief ready',
    },
  })
  @Widget({ route: 'incident-brief', prefersBorder: false })
  async showIncidentBrief(
    input: { focus?: 'overview' | 'patient_flow' | 'capacity' | 'staffing' },
    context: ExecutionContext,
  ) {
    const result = await runSurgeGuardTool('get_incident', hiddenContext(), context);
    if (input.focus && input.focus !== 'overview') {
      const data = result.data as JsonRecord;
      const objectives = data.objectives as JsonRecord[];
      const tasks = data.tasks as JsonRecord[];
      const keywordByFocus = {
        patient_flow: ['ED', 'Patient Flow'],
        capacity: ['surge beds', 'capacity'],
        staffing: ['staffing', 'Nursing Ops'],
      };
      const keywords = keywordByFocus[input.focus];
      data.objectives = objectives.filter((item) =>
        keywords.some((keyword) => String(item.label).includes(keyword)));
      data.tasks = tasks.filter((item) =>
        keywords.some((keyword) =>
          String(item.label).includes(keyword) || String(item.owner).includes(keyword)));
    }
    return result;
  }

  @Tool({
    name: 'show_capacity',
    title: 'Show Capacity',
    description: 'Show current staffed bed capacity and surge-space readiness. No IDs required.',
    inputSchema: z.object({
      care_area: z
        .enum(['all', 'ED', 'ICU', 'SDU', 'MS'])
        .default('all')
        .describe('Optionally focus on one care area'),
    }).strict(),
    outputSchema: canonicalOutput('get_current_capacity'),
    annotations: readAnnotations,
    invocation: {
      invoking: 'Checking operational capacity...',
      invoked: 'Capacity board ready',
    },
  })
  @Widget({ route: 'capacity-board', prefersBorder: false })
  async showCapacity(
    input: { care_area?: 'all' | 'ED' | 'ICU' | 'SDU' | 'MS' },
    context: ExecutionContext,
  ) {
    const result = await runSurgeGuardTool('get_current_capacity', hiddenContext(), context);
    if (input.care_area && input.care_area !== 'all') {
      const data = result.data as JsonRecord;
      data.locations = (data.locations as JsonRecord[])
        .filter((location) => location.code === input.care_area);
    }
    return result;
  }

  @Tool({
    name: 'show_queue_pressure',
    title: 'Show Queue Pressure',
    description: 'Show emergency queues, wait times and service-level breaches. No IDs required.',
    inputSchema: z.object({
      queue: z
        .enum(['all', 'provider_wait', 'admission_hold', 'imaging', 'discharge_transport'])
        .default('all')
        .describe('Optionally focus on one operational queue'),
    }).strict(),
    outputSchema: canonicalOutput('get_queue_pressure'),
    annotations: readAnnotations,
    invocation: {
      invoking: 'Checking patient-flow pressure...',
      invoked: 'Queue pressure ready',
    },
  })
  @Widget({ route: 'queue-pressure', prefersBorder: false })
  async showQueuePressure(
    input: {
      queue?: 'all' | 'provider_wait' | 'admission_hold' | 'imaging' | 'discharge_transport';
    },
    context: ExecutionContext,
  ) {
    const result = await runSurgeGuardTool('get_queue_pressure', hiddenContext(), context);
    if (input.queue && input.queue !== 'all') {
      const selectedQueue = input.queue;
      const queueName: Record<typeof selectedQueue, string> = {
        provider_wait: 'ED - Waiting for provider',
        admission_hold: 'ED - Admission hold',
        imaging: 'Imaging',
        discharge_transport: 'Discharge transport',
      };
      const data = result.data as JsonRecord;
      data.queues = (data.queues as JsonRecord[])
        .filter((queue) => queue.name === queueName[selectedQueue]);
    }
    return result;
  }

  @Tool({
    name: 'show_staffing_readiness',
    title: 'Show Staffing Readiness',
    description: 'Show qualification-checked staffing coverage and blocking gaps. No IDs required.',
    inputSchema: z.object({
      role: z
        .enum(['all', 'emergency_rn', 'critical_care_rn', 'respiratory_therapist', 'hospitalist'])
        .default('all')
        .describe('Optionally focus on one critical role'),
    }).strict(),
    outputSchema: canonicalOutput('get_staffing_readiness'),
    annotations: readAnnotations,
    invocation: {
      invoking: 'Checking workforce eligibility...',
      invoked: 'Staffing readiness ready',
    },
  })
  @Widget({ route: 'staffing-readiness', prefersBorder: false })
  async showStaffingReadiness(
    input: {
      role?: 'all' | 'emergency_rn' | 'critical_care_rn' | 'respiratory_therapist' | 'hospitalist';
    },
    context: ExecutionContext,
  ) {
    const result = await runSurgeGuardTool(
      'get_staffing_readiness',
      hiddenContext({
        starts_at: '2026-07-25T17:00:00.000Z',
        ends_at: '2026-07-26T01:00:00.000Z',
      }),
      context,
    );
    if (input.role && input.role !== 'all') {
      const selectedRole = input.role;
      const roleName: Record<typeof selectedRole, string> = {
        emergency_rn: 'Emergency RN',
        critical_care_rn: 'Critical Care RN',
        respiratory_therapist: 'Respiratory Therapist',
        hospitalist: 'Hospitalist',
      };
      const data = result.data as JsonRecord;
      const widget = data.widget as JsonRecord;
      widget.coverage = (widget.coverage as JsonRecord[])
        .filter((coverage) => coverage.role === roleName[selectedRole]);
      widget.gaps = (widget.gaps as JsonRecord[])
        .filter((gap) => gap.role === roleName[selectedRole]);
    }
    return result;
  }

  @Tool({
    name: 'simulate_surge_change',
    title: 'Simulate Surge Change',
    description: 'Change live hospital conditions, then recalculate every dashboard and plan. No IDs required.',
    inputSchema: z.object({
      event: z
        .enum(['arrival_spike', 'staff_callout', 'beds_cleaned', 'discharge_wave'])
        .default('arrival_spike')
        .describe('Choose an operational event to simulate'),
    }).strict(),
    outputSchema: canonicalOutput('get_incident'),
    annotations: actionAnnotations,
    invocation: {
      invoking: 'Applying the surge event...',
      invoked: 'Hospital conditions updated',
    },
  })
  @Widget({ route: 'incident-brief', prefersBorder: false })
  async simulateSurgeChange(
    input: { event?: SurgeEvent },
    context: ExecutionContext,
  ) {
    surgeSimulation.applyEvent(input.event ?? 'arrival_spike');
    return runSurgeGuardTool('get_incident', hiddenContext(), context);
  }

  @Tool({
    name: 'generate_safe_plans',
    title: 'Generate Safe Plans',
    description: 'Generate and compare three surge options, excluding blocked plans from selection.',
    inputSchema: z.object({
      priority: z
        .enum(['balanced', 'fastest_relief', 'maximum_safety'])
        .default('balanced')
        .describe('What should the planner prioritize?'),
    }).strict(),
    outputSchema: canonicalOutput('compare_plans'),
    annotations: actionAnnotations,
    invocation: {
      invoking: 'Generating and policy-checking options...',
      invoked: 'Safe plan options ready',
    },
  })
  @Widget({ route: 'plan-comparison-v2', prefersBorder: false })
  async generateSafePlans(
    input: { priority?: 'balanced' | 'fastest_relief' | 'maximum_safety' },
    context: ExecutionContext,
  ) {
    surgeSimulation.regenerateComparison(input.priority ?? 'balanced');
    context.logger.info('Demo planning priority selected', {
      priority: input.priority ?? 'balanced',
    });
    return runSurgeGuardTool(
      'compare_plans',
      hiddenContext({
        priority: input.priority ?? 'balanced',
        candidate_plan_ids: [
          DEMO_IDS.balanced_plan_id,
          '549f6a4a-d7b7-4ea6-9af7-7f0c046b5dc7',
          DEMO_IDS.transfer_plan_id,
        ],
      }),
      context,
    );
  }

  @Tool({
    name: 'check_plan_safety',
    title: 'Check Plan Safety',
    description: 'Check whether a selected plan can be approved now and state exactly what must be resolved first.',
    inputSchema: z.object({
      plan: planChoiceSchema,
    }).strict(),
    outputSchema: canonicalOutput('get_policy_gate'),
    annotations: readAnnotations,
    invocation: {
      invoking: 'Checking whether the plan can run safely...',
      invoked: 'Plan safety decision ready',
    },
  })
  @Widget({ route: 'policy-gate-v2', prefersBorder: false })
  async checkPlanSafety(
    input: { plan?: PlanChoice },
    context: ExecutionContext,
  ) {
    return runSurgeGuardTool(
      'get_policy_gate',
      hiddenContext({
        subject_type: 'candidate_plan',
        subject_id: planId(input.plan),
      }),
      context,
    );
  }

  @Tool({
    name: 'review_surge_plan',
    title: 'Review Surge Plan',
    description: 'Inspect a candidate plan’s actions, assumptions, allocations and current live policy status without approving or executing it.',
    inputSchema: z.object({
      plan: planChoiceSchema,
    }).strict(),
    outputSchema: canonicalOutput('get_plan'),
    annotations: readAnnotations,
    invocation: {
      invoking: 'Loading the live plan review...',
      invoked: 'Plan review ready',
    },
  })
  @Widget({ route: 'plan-review-v2', prefersBorder: false })
  async reviewSurgePlan(
    input: { plan?: PlanChoice },
    context: ExecutionContext,
  ) {
    return runSurgeGuardTool(
      'get_plan',
      hiddenContext({ candidate_plan_id: planId(input.plan) }),
      context,
    );
  }

  @Tool({
    name: 'approve_safe_plan',
    title: 'Approve Safe Plan',
    description: 'Record human approval for a policy-eligible plan. Demo mode has no external effects.',
    inputSchema: z.object({
      plan: planChoiceSchema,
      approval_note: z
        .string()
        .max(240)
        .optional()
        .describe('Optional command note'),
    }).strict(),
    outputSchema: canonicalOutput('get_plan'),
    annotations: actionAnnotations,
    invocation: {
      invoking: 'Validating approval authority...',
      invoked: 'Demo approval recorded',
    },
  })
  @Widget({ route: 'plan-review-v2', prefersBorder: false })
  async approveSafePlan(
    input: { plan?: PlanChoice; approval_note?: string },
    context: ExecutionContext,
  ) {
    surgeSimulation.approve(input.plan ?? 'balanced_decompression');
    const result = await runSurgeGuardTool(
      'get_plan',
      hiddenContext({
        candidate_plan_id: planId(input.plan),
        approval_note: input.approval_note,
      }),
      context,
    );

    return result;
  }

  @Tool({
    name: 'execute_approved_plan',
    title: 'Execute Approved Plan',
    description: 'Start the approved plan in safe simulation mode and monitor controlled execution.',
    inputSchema: z.object({
      plan: planChoiceSchema,
      pace: z
        .enum(['cautious', 'standard', 'rapid'])
        .default('standard')
        .describe('Choose how quickly the simulation advances'),
    }).strict(),
    outputSchema: canonicalOutput('get_execution_status'),
    annotations: actionAnnotations,
    invocation: {
      invoking: 'Rechecking approval and policy status...',
      invoked: 'Simulated execution started',
    },
  })
  @Widget({ route: 'execution-monitor', prefersBorder: false })
  async executeApprovedPlan(
    input: { plan?: PlanChoice; pace?: 'cautious' | 'standard' | 'rapid' },
    context: ExecutionContext,
  ) {
    surgeSimulation.execute(
      input.plan ?? 'balanced_decompression',
      input.pace ?? 'standard',
    );
    context.logger.info('Starting no-effect demo execution', {
      candidatePlanId: planId(input.plan),
      executionMode: 'simulation',
      pace: input.pace ?? 'standard',
    });
    return runSurgeGuardTool(
      'get_execution_status',
      hiddenContext({
        candidate_plan_id: planId(input.plan),
        plan_execution_id: DEMO_IDS.execution_id,
        execution_mode: 'simulation',
      }),
      context,
    );
  }
}
