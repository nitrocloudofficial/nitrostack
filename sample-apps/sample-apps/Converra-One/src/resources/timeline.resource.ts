import { OrchestratorAgent } from '../modules/orchestrator/OrchestratorAgent.js';

export const timelineResource = {
  uri: 'resource://agent/timeline',
  name: 'Agent Execution Timeline',
  description: 'Live step-by-step agent workflow execution traces, tool invocations, order, and latency metrics',
  read: async () => {
    return OrchestratorAgent.getTimeline();
  }
};
