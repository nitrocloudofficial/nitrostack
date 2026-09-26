import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { canonicalJsonSha256 } from '../../lib/algorithms/index.js';

import { describeAgenticWorkflow } from './agent-manifest.js';
import { generateGroundedLlmText } from './llm-provider.js';

const REACT_LOOP = ['PLAN', 'ACT', 'OBSERVE', 'VERIFY', 'DECIDE'] as const;

export type AgentMode = 'LLM' | 'DETERMINISTIC';
export type AgentWorkflowStatus = 'COMPLETED' | 'AWAITING_APPROVAL' | 'ABSTAINED';

export interface AgentWorkflowStep {
  agentId: string;
  iteration: number;
  loop: typeof REACT_LOOP;
  selectedAction: string;
  toolNames: string[];
  observation: string;
  verification: 'PASSED' | 'REQUIRES_APPROVAL' | 'ABSTAINED';
  decision: 'CONTINUE' | 'REQUEST_APPROVAL' | 'ABSTAIN' | 'COMPLETE';
  inputHash: string;
  outputHash: string;
}

export interface RunAgenticWorkflowInput {
  runId: string;
  objective: string;
  agentMode: AgentMode;
  approvedToolNames: string[];
  requireHumanApproval: boolean;
}

export interface RunAgenticWorkflowResult {
  runtime: 'LANGGRAPH';
  agentMode: AgentMode;
  llmUsed: boolean;
  status: AgentWorkflowStatus;
  nextApprovalGate: string | null;
  steps: AgentWorkflowStep[];
  warnings: string[];
}

type AgentState = RunAgenticWorkflowInput & {
  steps: AgentWorkflowStep[];
  warnings: string[];
  status: AgentWorkflowStatus;
  nextApprovalGate: string | null;
};

interface GraphBuilderAdapter {
  addNode(name: string, action: (state: AgentState) => AgentStateUpdate): GraphBuilderAdapter;
  addEdge(from: string, to: string): GraphBuilderAdapter;
  compile(): { invoke(input: AgentState): Promise<AgentState> };
}

type AgentStateUpdate = Partial<Omit<AgentState, 'steps' | 'warnings'>> & {
  steps?: AgentWorkflowStep | AgentWorkflowStep[];
  warnings?: string | string[];
};

const AgentStateAnnotation = Annotation.Root({
  runId: Annotation<string>(),
  objective: Annotation<string>(),
  agentMode: Annotation<AgentMode>(),
  approvedToolNames: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  requireHumanApproval: Annotation<boolean>(),
  steps: Annotation<AgentWorkflowStep[], AgentWorkflowStep | AgentWorkflowStep[]>({
    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
  warnings: Annotation<string[], string | string[]>({
    reducer: (left, right) => left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
  status: Annotation<AgentWorkflowStatus>(),
  nextApprovalGate: Annotation<string | null>(),
});

const NODE_ORDER = [
  'supervisor-orchestrator',
  'intake-policy',
  'sequence-validation',
  't-cell',
  'b-cell',
  'population',
  'structure',
  'compound-intelligence',
  'docking',
  'ranking',
  'verifier-critic',
  'reporting',
] as const;

const APPROVAL_GATES = new Set(['intake-policy', 'docking', 'verifier-critic', 'reporting']);
const SUPERVISOR_TOOL_NAMES = ['describe_agentic_workflow', 'run_agentic_workflow'] as const;

export async function runLangGraphAgentWorkflow(
  input: RunAgenticWorkflowInput,
): Promise<RunAgenticWorkflowResult> {
  const llmPlan =
    input.agentMode === 'LLM'
      ? await generateGroundedLlmText({
          purpose: 'WORKFLOW_PLANNING',
          prompt: input.objective,
          evidence: {
            deploymentBoundary: 'One NitroStack MCP app',
            allowedRole:
              'Plan and route typed tools only; do not generate scientific prediction values.',
          },
        })
      : { used: false, text: null, warning: null };
  const manifest = describeAgenticWorkflow({
    runId: input.runId,
    runIntent: 'MVP_EPITOPE_PRIORITIZATION',
    includeFutureInterfaces: true,
  });
  let graph = new StateGraph(AgentStateAnnotation) as unknown as GraphBuilderAdapter;
  for (const agentId of NODE_ORDER) {
    const agent = manifest.agents.find((candidate) => candidate.agentId === agentId);
    if (agent === undefined) continue;
    graph = graph.addNode(agentId, (state: AgentState) => {
      const node = manifest.workflowPlan.nodes.find((candidate) => candidate.agentId === agentId);
      const configuredToolNames =
        node?.toolNames ?? (agentId === 'supervisor-orchestrator' ? SUPERVISOR_TOOL_NAMES : []);
      const toolNames = configuredToolNames.filter((toolName) =>
        state.approvedToolNames.includes(toolName),
      );
      const approvalRequired = state.requireHumanApproval && APPROVAL_GATES.has(agentId);
      const verification: AgentWorkflowStep['verification'] =
        toolNames.length === 0 ? 'ABSTAINED' : approvalRequired ? 'REQUIRES_APPROVAL' : 'PASSED';
      const decision: AgentWorkflowStep['decision'] =
        verification === 'ABSTAINED'
          ? 'ABSTAIN'
          : approvalRequired
            ? 'REQUEST_APPROVAL'
            : agentId === 'reporting'
              ? 'COMPLETE'
              : 'CONTINUE';
      const step = buildStep({
        runId: state.runId,
        objective: state.objective,
        agentId,
        iteration: 1,
        selectedAction: node?.label ?? agent.role,
        toolNames,
        verification,
        decision,
      });
      const warnings =
        toolNames.length === 0
          ? [`${agentId}-has-no-approved-tools-and-abstained`]
          : state.agentMode === 'LLM' && llmPlan.used
            ? [`${agentId}-llm-grounded-routing-note-recorded`]
            : [];
      return {
        steps: step,
        warnings,
        status:
          verification === 'ABSTAINED'
            ? 'ABSTAINED'
            : approvalRequired
              ? 'AWAITING_APPROVAL'
              : state.status,
        nextApprovalGate: approvalRequired ? approvalGateFor(agentId) : state.nextApprovalGate,
      };
    });
  }

  const firstNode = NODE_ORDER[0];
  const lastNode = NODE_ORDER[NODE_ORDER.length - 1];
  if (firstNode === undefined || lastNode === undefined) {
    throw new Error('Agent workflow node order is empty.');
  }
  let wired = graph.addEdge(START, firstNode);
  for (let index = 0; index < NODE_ORDER.length - 1; index += 1) {
    const from = NODE_ORDER[index];
    const to = NODE_ORDER[index + 1];
    if (from !== undefined && to !== undefined) {
      wired = wired.addEdge(from, to);
    }
  }
  const compiled = wired.addEdge(lastNode, END).compile();
  const state = await compiled.invoke({
    ...input,
    steps: [],
    warnings: [],
    status: 'COMPLETED',
    nextApprovalGate: null,
  });
  const firstApproval = state.steps.find(
    (step: AgentWorkflowStep) => step.decision === 'REQUEST_APPROVAL',
  );
  return {
    runtime: 'LANGGRAPH',
    agentMode: input.agentMode,
    llmUsed: llmPlan.used,
    status: firstApproval === undefined ? state.status : 'AWAITING_APPROVAL',
    nextApprovalGate:
      firstApproval === undefined ? state.nextApprovalGate : approvalGateFor(firstApproval.agentId),
    steps: state.steps,
    warnings:
      input.agentMode === 'LLM' && !llmPlan.used
        ? [
            llmPlan.warning ?? 'llm-provider-unavailable-deterministic-agent-routing-used',
            ...state.warnings,
          ]
        : state.warnings,
  };
}

function buildStep(input: {
  runId: string;
  objective: string;
  agentId: string;
  iteration: number;
  selectedAction: string;
  toolNames: string[];
  verification: AgentWorkflowStep['verification'];
  decision: AgentWorkflowStep['decision'];
}): AgentWorkflowStep {
  const base = {
    runId: input.runId,
    objective: input.objective,
    agentId: input.agentId,
    selectedAction: input.selectedAction,
    toolNames: input.toolNames,
  };
  return {
    agentId: input.agentId,
    iteration: input.iteration,
    loop: REACT_LOOP,
    selectedAction: input.selectedAction,
    toolNames: input.toolNames,
    observation:
      input.toolNames.length === 0
        ? 'No approved typed tools were available for this agent.'
        : 'Agent selected typed MCP tools and preserved provenance.',
    verification: input.verification,
    decision: input.decision,
    inputHash: canonicalJsonSha256(base),
    outputHash: canonicalJsonSha256({ ...base, decision: input.decision }),
  };
}

function approvalGateFor(agentId: string): string {
  if (agentId === 'intake-policy') return 'configuration_approval';
  if (agentId === 'docking') return 'docking_approval';
  if (agentId === 'verifier-critic') return 'shortlist_approval';
  if (agentId === 'reporting') return 'export_approval';
  return `${agentId}_approval`;
}
