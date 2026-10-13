import {
  ExecutionContext,
  PromptDecorator as Prompt,
} from '@nitrostack/core';
import { SURGEGUARD_CONTRACT } from '../../contracts/surgeguard-contract.js';
import { surgeSimulation } from './surgeguard.simulation.js';

type PromptArgs = Record<string, string | number | boolean | null>;
type JsonRecord = Record<string, unknown>;
type PromptName =
  | 'incident_brief'
  | 'compare_safe_options'
  | 'shift_handoff'
  | 'after_action_review';

interface PromptArgumentDefinition {
  name: string;
  description: string;
  required: boolean;
}

const PROMPT_NAMES: PromptName[] = [
  'incident_brief',
  'compare_safe_options',
  'shift_handoff',
  'after_action_review',
];

const PROMPT_TITLES: Record<PromptName, string> = {
  incident_brief: 'Command Brief',
  compare_safe_options: 'Compare Safe Options',
  shift_handoff: 'Shift Handoff',
  after_action_review: 'After-Action Review',
};

const PROMPT_ARGUMENTS: Record<PromptName, PromptArgumentDefinition[]> = {
  incident_brief: [
    {
      name: 'audience',
      description: 'Who will receive the brief, such as incident command, nursing operations or hospital leadership',
      required: false,
    },
    {
      name: 'horizon_minutes',
      description: 'Forward-looking action horizon in minutes; defaults to 60',
      required: false,
    },
  ],
  compare_safe_options: [
    {
      name: 'decision_priority',
      description: 'Decision emphasis: balanced, fastest safe relief or maximum safety',
      required: false,
    },
    {
      name: 'risk_tolerance',
      description: 'How conditional plans should be treated; defaults to conservative',
      required: false,
    },
  ],
  shift_handoff: [
    {
      name: 'receiving_role',
      description: 'Role receiving the handoff, such as night incident commander or nursing supervisor',
      required: false,
    },
    {
      name: 'handoff_focus',
      description: 'Optional focus such as staffing, capacity, patient flow or execution',
      required: false,
    },
  ],
  after_action_review: [
    {
      name: 'review_focus',
      description: 'Optional review focus such as outcomes, policy performance, deviations or data quality',
      required: false,
    },
    {
      name: 'corrective_action_depth',
      description: 'Corrective-action detail: concise or detailed',
      required: false,
    },
  ],
};

const TASKS: Record<PromptName, {
  purpose: string;
  workflow: string[];
  output: string[];
}> = {
  incident_brief: {
    purpose: 'Create a concise, evidence-linked incident-command brief from the current operational state.',
    workflow: [
      'Use the embedded live snapshot as the primary evidence.',
      'If a refresh is necessary, call surge_command_center with action=view only.',
      'Do not approve or execute a plan from this briefing prompt.',
    ],
    output: [
      'Situation and severity',
      'Four headline indicators: occupancy, patient-flow pressure, qualified staffing gap and usable beds',
      'Top operational bottlenecks and current policy posture',
      'Human decisions required',
      'Named actions for the requested time horizon',
    ],
  },
  compare_safe_options: {
    purpose: 'Compare candidate surge plans while preventing a blocked option from being presented as selectable.',
    workflow: [
      'Use the embedded candidate-plan and gate evidence first.',
      'If recalculation is requested, call surge_command_center with action=generate_plans and the requested priority.',
      'Use action=check_plan only for a finalist that needs expanded safety evidence.',
      'Never call approve_plan or execute_plan from this comparison prompt.',
    ],
    output: [
      'A compact comparison of gate status, safety, wait relief, beds opened, time to effect and dependencies',
      'A clear separation between eligible, conditional and blocked plans',
      'Required remediation for every conditional plan',
      'One preferred safe option with rationale, or an explicit statement that no plan is currently eligible',
    ],
  },
  shift_handoff: {
    purpose: 'Prepare a structured operational-period handoff that preserves ownership, safety conditions and unfinished work.',
    workflow: [
      'Use the embedded live snapshot and recent audit events.',
      'If a refresh is necessary, call surge_command_center with action=view only.',
      'Do not infer completed work or approval that is absent from the audit trail.',
    ],
    output: [
      'Current operating state and what changed',
      'Completed actions, work in progress and execution status',
      'Unresolved hazards, policy conditions and staffing/capacity constraints',
      'Recorded approvals and decisions still required',
      'Named owners, next actions and deadlines for the receiving role',
    ],
  },
  after_action_review: {
    purpose: 'Draft an evidence-linked review of outcomes, deviations, policy performance and corrective actions.',
    workflow: [
      'Use the embedded execution metrics and audit events as evidence.',
      'If execution is incomplete, label the review interim and do not fabricate final outcomes.',
      'If no plan was executed, state that the after-action review is not yet ready.',
      'Do not change the operational state from this review prompt.',
    ],
    output: [
      'Intended outcomes versus observed results',
      'Execution deviations and their operational impact',
      'Policy controls that worked, failed or required remediation',
      'Data-quality and decision-process limitations',
      'Prioritized corrective actions with owner, urgency and verification measure',
    ],
  },
};

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function liveEvidence() {
  const snapshot = surgeSimulation.commandCenterData();
  const incidentView = asRecord(snapshot.incident);
  const capacityView = asRecord(snapshot.capacity);
  const queueView = asRecord(snapshot.queue);
  const staffingView = asRecord(snapshot.staffing);
  const planningView = asRecord(snapshot.planning);
  const executionView = asRecord(snapshot.execution);

  return {
    evidence_generated_at: new Date().toISOString(),
    simulation_tick: snapshot.simulation_tick,
    last_event: snapshot.last_event,
    incident: asRecord(incidentView.incident),
    capacity_summary: asRecord(capacityView.summary),
    patient_flow: asRecord(queueView.system_pressure),
    staffing_gaps: asArray(staffingView.gaps),
    selected_plan: snapshot.selected_plan,
    execution: asRecord(executionView.execution),
    execution_metrics: asRecord(executionView.metrics),
    candidate_plans: asArray(planningView.comparison),
    recent_audit_events: asArray(snapshot.timeline).slice(0, 6),
  };
}

function suppliedArguments(args: PromptArgs) {
  const supplied = Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `- ${key}: ${String(value)}`)
    .join('\n');
  return supplied || '- Use the documented defaults.';
}

function promptMessages(name: PromptName, args: PromptArgs) {
  const task = TASKS[name];
  const evidence = liveEvidence();
  const system = `You are SurgeGuard, a policy-gated hospital surge-planning copilot.

Authority and safety rules:
- Treat the embedded snapshot as current operational evidence, not as a diagnosis or patient-care instruction.
- Never recommend, approve or execute a blocked plan.
- Describe a conditional plan as selectable only after its stated remediation and human approval.
- Treat hard staffing, qualification, isolation and licensed-capacity constraints as non-relaxable without an explicit authorized exception.
- Separate verified facts, assumptions, policy evidence, unresolved risks and human decisions.
- Do not expose patient-level identifiers or fabricate missing facts.
- A prompt may guide tool use, but it never grants approval authority.`;

  const user = `${task.purpose}

Requested options:
${suppliedArguments(args)}

Workflow:
${task.workflow.map((step, index) => `${index + 1}. ${step}`).join('\n')}

Required output:
${task.output.map((item) => `- ${item}`).join('\n')}

Live read-only evidence:
\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\``;

  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ];
}

export class SurgeGuardPrompts {}

for (const promptName of PROMPT_NAMES) {
  const contract = SURGEGUARD_CONTRACT.prompts.find(
    (candidate) => candidate.name === promptName,
  );
  if (!contract) throw new Error(`Missing canonical SurgeGuard prompt: ${promptName}`);

  const methodName = `prompt_${promptName}`;
  const handler = async (args: PromptArgs, context: ExecutionContext) => {
    context.logger.info('Generating live SurgeGuard prompt', {
      prompt: promptName,
      simulationTick: Number(surgeSimulation.commandCenterData().simulation_tick),
    });
    return promptMessages(promptName, args);
  };

  Object.defineProperty(SurgeGuardPrompts.prototype, methodName, {
    value: handler,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  const descriptor = Object.getOwnPropertyDescriptor(
    SurgeGuardPrompts.prototype,
    methodName,
  )!;

  Prompt({
    name: promptName,
    title: PROMPT_TITLES[promptName],
    description: contract.description,
    arguments: PROMPT_ARGUMENTS[promptName],
  })(SurgeGuardPrompts.prototype, methodName, descriptor);
}
