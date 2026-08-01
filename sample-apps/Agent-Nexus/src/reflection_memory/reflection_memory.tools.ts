import { DevilsAdvocateAgent } from "./devils_advocate.js";
import { HistoricalMemoryAgent } from "./historical_memory.js";
import { SafetyAgent } from "./safety_agent.js";
import { NegotiationSimulator } from "./negotiation_simulator.js";
import { Proposal } from "./models.js";

const devilsAdvocate = new DevilsAdvocateAgent();
const historicalMemory = new HistoricalMemoryAgent();
const safetyAgent = new SafetyAgent();
const simulator = new NegotiationSimulator(devilsAdvocate, historicalMemory, safetyAgent);

/**
 * NitroStack MCP Tool: Evaluate proposal using Devil's Advocate Agent.
 */
export async function evaluateProposalTool(proposal: Proposal) {
  return devilsAdvocate.evaluateProposal(proposal);
}

/**
 * NitroStack MCP Tool: Query historical memory RAG store mid-reasoning.
 */
export async function queryHistoricalMemoryTool(query: string, topK: number = 2) {
  return historicalMemory.queryMidReasoning(query, topK);
}

/**
 * NitroStack MCP Tool: Validate proposal against SOP safety rules.
 */
export async function validateSafetyTool(proposal: Proposal) {
  return safetyAgent.validateProposal(proposal);
}

/**
 * NitroStack MCP Tool: Run full decision negotiation simulation.
 */
export async function simulateNegotiationTool(roundNumber: number, proposal: Proposal) {
  return simulator.evaluateProposalRound(roundNumber, proposal);
}

export const reflectionMemoryTools = [
  {
    name: "evaluate_proposal",
    description: "Critically analyzes proposal risk and generates counter-arguments",
    handler: evaluateProposalTool
  },
  {
    name: "query_historical_memory",
    description: "Queries historical incident RAG memory mid-reasoning",
    handler: queryHistoricalMemoryTool
  },
  {
    name: "validate_safety",
    description: "Validates proposal against SOP rules and issues hard vetoes if unsafe",
    handler: validateSafetyTool
  },
  {
    name: "simulate_negotiation",
    description: "Executes a round of negotiation between reflection and memory agents",
    handler: simulateNegotiationTool
  }
];
