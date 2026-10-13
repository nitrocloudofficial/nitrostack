import { OrchestratorAgent } from '../modules/orchestrator/OrchestratorAgent.js';

export async function fetchAgentTimeline() {
  return OrchestratorAgent.getTimeline();
}
