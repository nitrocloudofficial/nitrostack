import {
  Proposal,
  Evidence,
  NegotiationSimulator
} from "./src/reflection_memory";

export function runTranscript(): void {
  console.log("=" .repeat(80));
  console.log("  DECISION TWIN SYSTEM: REFLECTION & MEMORY NEGOTIATION TRANSCRIPT");
  console.log("  SCENARIO: Industry 4.0 Manufacturing & Machine #4 Optimization");
  console.log("=" .repeat(80));
  console.log("Target Branch: feat/reflection-memory");
  console.log("Agents Involved: Proposer, SafetyAgent, HistoricalMemoryAgent (RAG), DevilsAdvocateAgent");
  console.log("=" .repeat(80) + "\n");

  const simulator = new NegotiationSimulator();

  // ---------------------------------------------------------
  // ROUND 1: INITIAL PROPOSAL (Will trigger Safety Hard Veto & DA Challenge)
  // ---------------------------------------------------------
  console.log("┌" + "─".repeat(78) + "┐");
  console.log("│ ROUND 1: INITIAL PROPOSAL (Machine #4 High-Speed Overhaul & Throughput Boost)│");
  console.log("└" + "─".repeat(78) + "┘");

  const propR1: Proposal = {
    id: "PROP-001",
    title: "Machine #4 High-Speed Overhaul & Throughput Boost",
    description: "Upgrade Machine #4 CNC spindle drive and conveyor feed directly to 4.5x overdrive capacity to meet aggressive production targets.",
    proposed_by: "PlantOps_Lead",
    parameters: {
      budget_allocation: 120000.0,
      traffic_spike_multiplier: 4.5,
      auto_failover: false,
      prohibited_flags: []
    },
    evidences: [
      {
        id: "EV-PRELIM-01",
        description: "Supplier marketing spec flyer",
        source: "ToolingVendorCorp",
        confidence_score: 0.45
      }
    ],
    risk_level: "HIGH"
  };

  console.log(`[PROPOSAL SUBMITTED]: '${propR1.title}'`);
  console.log(`  Proposed By: ${propR1.proposed_by}`);
  console.log(`  Budget Requested: $${(propR1.parameters["budget_allocation"] as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  Production Speed Multiplier: ${propR1.parameters["traffic_spike_multiplier"]}x`);
  console.log(`  Auto-Interlock / Safety Failover: ${propR1.parameters["auto_failover"]}`);
  console.log(`  Evidence Count: ${propR1.evidences!.length} (Confidence: ${propR1.evidences![0].confidence_score})`);

  const resR1 = simulator.evaluateProposalRound(1, propR1);

  console.log("\n[SAFETY AGENT EVALUATION]:");
  console.log(`  Verdict: ${resR1.safety_verdict!.verdict}`);
  console.log(`  Details: ${resR1.safety_verdict!.details}`);
  for (const rule of resR1.safety_verdict!.violated_rules) {
    console.log(`    ❌ Violated Rule: ${rule}`);
  }

  console.log("\n[MID-REASONING HISTORICAL MEMORY LOOKUP]:");
  for (const inc of resR1.retrieved_incidents!) {
    console.log(`  🔍 Past Incident Match: [${inc.id}] ${inc.title} (Domain: ${inc.domain})`);
    console.log(`     Outcome: ${inc.outcome}`);
  }

  console.log("\n[DEVIL'S ADVOCATE EVALUATION]:");
  console.log(`  Challenge Summary: ${resR1.counter_argument!.challenge_summary}`);
  console.log(`  Calculated Risk Score: ${resR1.counter_argument!.risk_score.toFixed(2)}`);
  console.log("  Missing Evidence Demanded:");
  for (const me of resR1.counter_argument!.missing_evidences) {
    console.log(`    ⚠️ ${me}`);
  }
  console.log("  Counter-Claims Raised:");
  for (const cc of resR1.counter_argument!.counter_claims) {
    console.log(`    ⚡ ${cc}`);
  }

  console.log(`\n>>> ROUND 1 STATUS: ${resR1.status} <<<\n`);

  // ---------------------------------------------------------
  // ROUND 2: REVISED PROPOSAL 1 (Fixes Budget, but triggers DA & RAG Memory Challenge)
  // ---------------------------------------------------------
  console.log("┌" + "─".repeat(78) + "┐");
  console.log("│ ROUND 2: REVISED PROPOSAL (Scaled-Down Budget, Unverified Scaling)       │");
  console.log("└" + "─".repeat(78) + "┘");

  const propR2: Proposal = {
    id: "PROP-001-REV1",
    title: "Machine #4 Static Overhaul with Disabled Sensor Replicas",
    description: "Reduced tooling budget to $45,000 to meet SOP limit, keeping redundant PLC sensor feeds disabled to save setup cost.",
    proposed_by: "PlantOps_Lead",
    parameters: {
      budget_allocation: 45000.0,
      traffic_spike_multiplier: 3.5,
      auto_failover: true,
      prohibited_flags: ["disable_replicas"]
    },
    evidences: [
      {
        id: "EV-STAGING-01",
        description: "Internal shop floor test log",
        source: "PlantMetrics",
        confidence_score: 0.68
      }
    ],
    risk_level: "MEDIUM"
  };

  console.log(`[REVISED PROPOSAL SUBMITTED]: '${propR2.title}'`);
  console.log(`  Budget Requested: $${(propR2.parameters["budget_allocation"] as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Complies with $50k SOP limit)`);
  console.log(`  Production Speed Multiplier: ${propR2.parameters["traffic_spike_multiplier"]}x`);

  const resR2 = simulator.evaluateProposalRound(2, propR2);

  console.log("\n[SAFETY AGENT EVALUATION]:");
  console.log(`  Verdict: ${resR2.safety_verdict!.verdict}`);
  console.log(`  Details: ${resR2.safety_verdict!.details}`);
  for (const rule of resR2.safety_verdict!.violated_rules) {
    console.log(`    ❌ Violated Rule: ${rule}`);
  }

  console.log("\n[MID-REASONING HISTORICAL MEMORY LOOKUP]:");
  for (const inc of resR2.retrieved_incidents!) {
    console.log(`  🔍 Past Incident Match: [${inc.id}] ${inc.title}`);
    console.log(`     Lessons Learned: ${inc.lessons_learned[0] || "N/A"}`);
  }

  console.log("\n[DEVIL'S ADVOCATE EVALUATION]:");
  console.log(`  Challenge Summary: ${resR2.counter_argument!.challenge_summary}`);
  console.log(`  Calculated Risk Score: ${resR2.counter_argument!.risk_score.toFixed(2)}`);
  for (const me of resR2.counter_argument!.missing_evidences) {
    console.log(`    ⚠️ ${me}`);
  }
  for (const cc of resR2.counter_argument!.counter_claims) {
    console.log(`    ⚡ ${cc}`);
  }

  console.log(`\n>>> ROUND 2 STATUS: ${resR2.status} <<<\n`);

  // ---------------------------------------------------------
  // ROUND 3: FINAL REVISED PROPOSAL (Fully Compliant & Validated -> RESOLVED)
  // ---------------------------------------------------------
  console.log("┌" + "─".repeat(78) + "┐");
  console.log("│ ROUND 3: FINAL REVISED PROPOSAL (Predictive Maintenance & Staged Rollout)│");
  console.log("└" + "─".repeat(78) + "┘");

  const propR3: Proposal = {
    id: "PROP-001-REV2",
    title: "Machine #4 Predictive Maintenance & Staged Conveyor Rollout",
    description: "Deploy Machine #4 with 20% staged conveyor load, active redundant PLC sensors, dynamic speed scaling up to 2.5x, and automated thermal safety interlocks.",
    proposed_by: "PlantOps_Lead",
    parameters: {
      budget_allocation: 38000.0,
      traffic_spike_multiplier: 2.5,
      auto_failover: true,
      prohibited_flags: []
    },
    evidences: [
      {
        id: "EV-LOAD-99",
        description: "Machine #4 3x Peak Load Stress Benchmark",
        source: "AutomatedTestRig",
        confidence_score: 0.96
      }
    ],
    risk_level: "LOW"
  };

  console.log(`[FINAL PROPOSAL SUBMITTED]: '${propR3.title}'`);
  console.log(`  Budget Requested: $${(propR3.parameters["budget_allocation"] as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  Production Speed Multiplier: ${propR3.parameters["traffic_spike_multiplier"]}x`);
  console.log(`  Evidence: ${propR3.evidences![0].id} - ${propR3.evidences![0].description} (Confidence: ${propR3.evidences![0].confidence_score})`);

  const resR3 = simulator.evaluateProposalRound(3, propR3);

  console.log("\n[SAFETY AGENT EVALUATION]:");
  console.log(`  Verdict: ${resR3.safety_verdict!.verdict}`);
  console.log(`  Details: ${resR3.safety_verdict!.details}`);

  console.log("\n[MID-REASONING HISTORICAL MEMORY LOOKUP]:");
  for (const inc of resR3.retrieved_incidents!) {
    console.log(`  🔍 Past Precedent Found: [${inc.id}] ${inc.title}`);
    console.log(`     Outcome: ${inc.outcome}`);
  }

  console.log("\n[DEVIL'S ADVOCATE EVALUATION]:");
  console.log(`  Challenge Summary: ${resR3.counter_argument!.challenge_summary}`);
  console.log(`  Calculated Risk Score: ${resR3.counter_argument!.risk_score.toFixed(2)}`);

  console.log(`\n>>> ROUND 3 STATUS: ${resR3.status} <<<`);
  console.log("=" .repeat(80));
  console.log("       NEGOTIATION CONVERGED & RESOLVED SUCCESSFULLY!");
  console.log("=" .repeat(80) + "\n");
}

if (require.main === module) {
  runTranscript();
}
