import { Proposal, NegotiationRound, VerdictType, IncidentReport } from "./models.js";
import { DevilsAdvocateAgent } from "./devils_advocate.js";
import { HistoricalMemoryAgent } from "./historical_memory.js";
import { SafetyAgent } from "./safety_agent.js";

export class NegotiationSimulator {
  public devilsAdvocate: DevilsAdvocateAgent;
  public historicalMemory: HistoricalMemoryAgent;
  public safetyAgent: SafetyAgent;
  public history: NegotiationRound[] = [];

  constructor(
    devilsAdvocate?: DevilsAdvocateAgent,
    historicalMemory?: HistoricalMemoryAgent,
    safetyAgent?: SafetyAgent
  ) {
    this.devilsAdvocate = devilsAdvocate || new DevilsAdvocateAgent();
    this.historicalMemory = historicalMemory || new HistoricalMemoryAgent();
    this.safetyAgent = safetyAgent || new SafetyAgent();
  }

  public evaluateProposalRound(roundNumber: number, proposal: Proposal): NegotiationRound {
    // Step 1: Safety Agent Evaluation (SOP Rules & Hard Veto)
    const safetyVerdict = this.safetyAgent.validateProposal(proposal);

    // Step 2: Mid-Reasoning Memory Lookup using Proposal Query
    const memoryQuery = `${proposal.title} ${proposal.description} ${Object.keys(proposal.parameters || {}).join(" ")}`;
    const retrievedResults: [IncidentReport, number][] = this.historicalMemory.queryMidReasoning(
      memoryQuery,
      2
    );
    const retrievedIncidents = retrievedResults.map(([inc]) => inc);

    // Step 3: Devil's Advocate Agent Evaluation with Historical Context
    const counterArg = this.devilsAdvocate.evaluateProposal(proposal, retrievedIncidents);

    // Step 4: Determine Round Status
    let status: "PENDING" | "CHALLENGED" | "VETOED" | "REVISED" | "RESOLVED";
    if (safetyVerdict.verdict === VerdictType.HARD_VETO) {
      status = "VETOED";
    } else if (counterArg.renegotiation_required) {
      status = "CHALLENGED";
    } else {
      status = "RESOLVED";
    }

    const negotiationRound: NegotiationRound = {
      round_number: roundNumber,
      proposal: proposal,
      counter_argument: counterArg,
      retrieved_incidents: retrievedIncidents,
      safety_verdict: safetyVerdict,
      status: status
    };

    this.history.push(negotiationRound);
    return negotiationRound;
  }
}
