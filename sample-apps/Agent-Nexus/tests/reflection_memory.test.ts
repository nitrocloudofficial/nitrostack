import { describe, it, expect } from "vitest";
import {
  Proposal,
  Evidence,
  DevilsAdvocateAgent,
  HistoricalMemoryAgent,
  SafetyAgent,
  NegotiationSimulator,
  VerdictType
} from "../src/reflection_memory";

describe("Reflection & Memory Module Tests", () => {
  it("should trigger renegotiation in DevilsAdvocateAgent when proposal has low confidence evidence or high risk", () => {
    const agent = new DevilsAdvocateAgent("DevilsAdvocate_01", 0.8, 0.5);

    const proposal: Proposal = {
      id: "PROP-001",
      title: "Machine #4 Aggressive Throughput Proposal",
      description: "Scale Machine #4 production throughput by 5x without load testing",
      proposed_by: "PlantOps_Lead",
      parameters: { traffic_spike_multiplier: 5.0, auto_failover: false },
      evidences: []
    };

    const counterArg = agent.evaluateProposal(proposal);

    expect(counterArg.renegotiation_required).toBe(true);
    expect(counterArg.risk_score).toBeGreaterThanOrEqual(0.5);
    expect(counterArg.missing_evidences.length).toBeGreaterThan(0);
    expect(counterArg.counter_claims.length).toBeGreaterThan(0);
  });

  it("should perform mid-reasoning vector search query in HistoricalMemoryAgent", () => {
    const memoryAgent = new HistoricalMemoryAgent();

    const results = memoryAgent.queryMidReasoning("machine 4 bearing failure shutdown", 2);

    expect(results.length).toBeGreaterThan(0);
    const [topIncident, score] = results[0];
    expect(topIncident.id).toBe("INC-2024-089");
    expect(score).toBeGreaterThan(0);
  });

  it("should issue HARD_VETO in SafetyAgent for budget cap violation", () => {
    const safetyAgent = new SafetyAgent();

    const proposal: Proposal = {
      id: "PROP-002",
      title: "Over-budget CNC Machine Overhaul",
      description: "Massive tooling buy",
      proposed_by: "PlantOps_Lead",
      parameters: { budget_allocation: 100000.0, auto_failover: true },
      evidences: [
        {
          id: "EV-01",
          description: "Preliminary vendor quote",
          source: "ToolingCorp",
          confidence_score: 0.9
        }
      ]
    };

    const verdict = safetyAgent.validateProposal(proposal);

    expect(verdict.verdict).toBe(VerdictType.HARD_VETO);
    expect(verdict.violated_rules.length).toBeGreaterThan(0);
    expect(verdict.violated_rules.some((r) => r.includes("SOP-BUDGET-01"))).toBe(true);
  });

  it("should complete multi-round negotiation flow until resolution in NegotiationSimulator", () => {
    const simulator = new NegotiationSimulator();

    const strongEvidence: Evidence = {
      id: "EV-LOAD-01",
      description: "Passed 5x machine load stress test",
      source: "AutomatedTestRig",
      confidence_score: 0.95
    };

    const proposal: Proposal = {
      id: "PROP-003",
      title: "Balanced Machine #4 Upgrade",
      description: "Controlled rollout with safety interlocks and load testing",
      proposed_by: "ReliabilityTeam",
      parameters: {
        budget_allocation: 35000.0,
        auto_failover: true,
        traffic_spike_multiplier: 2.0
      },
      evidences: [strongEvidence]
    };

    const roundRes = simulator.evaluateProposalRound(1, proposal);

    expect(roundRes.safety_verdict!.verdict).toBe(VerdictType.APPROVED);
    expect(roundRes.counter_argument!.renegotiation_required).toBe(false);
    expect(roundRes.status).toBe("RESOLVED");
  });
});
