import { DecisionTwinState } from './decision-twin.state.js';
import { plannerNode } from './decision-twin.planner.js';
import { dispatchNode, convergeNode } from './decision-twin.plant-manager.js';
import { AGENT_REGISTRY } from './decision-twin.sub-agents.js';

export class DecisionTwinOrchestrator {
  static async run(initialState: Partial<DecisionTwinState>): Promise<DecisionTwinState> {
    let state: DecisionTwinState = {
      event: initialState.event || {},
      event_type: initialState.event_type || 'sensor_anomaly',
      sub_goals: [],
      phase: 'planning',
      active_agents: [],
      agents_completed: [],
      current_agent: '',
      negotiation_round: 1,
      blackboard: {},
      proposals: [],
      vetoes: [],
      challenges: [],
      work_orders: [],
      notifications: [],
      trace: [],
      ...initialState,
    };

    // Step 1: Planner Agent — dynamic goal decomposition for this specific event
    const plannerResult = plannerNode(state);
    state = { ...state, ...plannerResult };

    // Loop: Dispatch -> Sub-agent -> Dispatch -> ... -> Convergence
    let maxSteps = 50;
    while (maxSteps > 0) {
      maxSteps--;

      // Plant Manager Dispatch (meta-reasoning over phase + queue)
      const dispatchResult = dispatchNode(state);
      state = { ...state, ...dispatchResult };

      const currentAgent = state.current_agent;

      if (currentAgent === 'converge') {
        // Plant Manager Convergence
        const convergeResult = convergeNode(state);
        state = { ...state, ...convergeResult };
        break;
      }

      if (AGENT_REGISTRY[currentAgent]) {
        // Execute sub-agent node (all real, async — may call live MCP tools / reflection agents)
        const agentResult = await AGENT_REGISTRY[currentAgent](state);
        state = {
          ...state,
          negotiation_round: agentResult.negotiation_round ?? state.negotiation_round,
          blackboard: agentResult.blackboard || state.blackboard,
          conflicts: agentResult.conflicts || state.conflicts,
          data_sources: agentResult.data_sources || state.data_sources,
          agents_completed: agentResult.agents_completed || state.agents_completed,
          proposals: agentResult.proposals || state.proposals,
          vetoes: agentResult.vetoes || state.vetoes,
          challenges: agentResult.challenges || state.challenges,
          trace: agentResult.trace || state.trace,
        };
      } else {
        // Unknown agent -> break to convergence
        const convergeResult = convergeNode(state);
        state = { ...state, ...convergeResult };
        break;
      }
    }

    return state;
  }
}
