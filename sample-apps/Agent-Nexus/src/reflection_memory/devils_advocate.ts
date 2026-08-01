import { Proposal, CounterArgument, IncidentReport } from "./models.js";

export class DevilsAdvocateAgent {
  public agentId: string;
  public minEvidenceConfidence: number;
  public riskToleranceThreshold: number;

  constructor(
    agentId: string = "DevilsAdvocate_01",
    minEvidenceConfidence: number = 0.75,
    riskToleranceThreshold: number = 0.6
  ) {
    this.agentId = agentId;
    this.minEvidenceConfidence = minEvidenceConfidence;
    this.riskToleranceThreshold = riskToleranceThreshold;
  }

  public evaluateProposal(
    proposal: Proposal,
    contextIncidents: IncidentReport[] = []
  ): CounterArgument {
    const missingEvidences: string[] = [];
    const counterClaims: string[] = [];
    let calculatedRisk = 0.0;

    const evidences = proposal.evidences || [];

    // 1. Evaluate Evidence Quality & Confidence
    if (evidences.length === 0) {
      missingEvidences.push("No empirical evidence provided to support proposal parameters.");
      calculatedRisk += 0.4;
    } else {
      const lowConfEvidences = evidences.filter(
        (e) => e.confidence_score < this.minEvidenceConfidence
      );
      if (lowConfEvidences.length > 0) {
        for (const e of lowConfEvidences) {
          missingEvidences.push(
            `Evidence '${e.id}' (${e.description}) has low confidence score (${e.confidence_score.toFixed(2)} < ${this.minEvidenceConfidence}). Rigorous benchmark evidence required.`
          );
        }
        calculatedRisk += 0.25 * lowConfEvidences.length;
      }
    }

    // 2. Check for Specific Risk Factors in Parameters
    const params = proposal.parameters || {};

    const trafficMultiplier = Number(params["traffic_spike_multiplier"] ?? 1.0);
    const hasLoadTest = evidences.some(
      (e) =>
        e.id.toLowerCase().includes("load_test") ||
        e.id.toLowerCase().includes("load") ||
        e.description.toLowerCase().includes("load")
    );

    if (trafficMultiplier > 3.0 && !hasLoadTest) {
      missingEvidences.push("Machine stress/load testing results under 3x+ throughput multiplier missing.");
      counterClaims.push("High production speed scaling without verified load tests risks cascading machine and conveyor line failure.");
      calculatedRisk += 0.35;
    }

    if (params["auto_failover"] === false && (proposal.risk_level === "HIGH" || proposal.risk_level === "CRITICAL")) {
      counterClaims.push("Manual safety interlock override for high-risk Machine #4 operation introduces unacceptably high downtime (MTTR).");
      calculatedRisk += 0.3;
    }

    const budget = Number(params["budget_allocation"] ?? 0);
    const roi = params["roi_estimate"] !== undefined ? Number(params["roi_estimate"]) : undefined;
    if (budget > 50000 && roi !== undefined && roi < 1.2) {
      counterClaims.push(`Budget allocation ($${budget}) has low estimated ROI (${roi}).`);
      calculatedRisk += 0.2;
    }

    // 3. Incorporate Historical Context if present
    if (contextIncidents && contextIncidents.length > 0) {
      for (const inc of contextIncidents) {
        if (inc.risk_score > 0.7) {
          counterClaims.push(
            `Past incident '${inc.title || "Incident"}' (${inc.id}) indicates potential recurrence of: ${inc.outcome}`
          );
          calculatedRisk += 0.2;
        }
      }
    }

    // Normalize risk score between 0.0 and 1.0
    const riskScore = Math.min(1.0, calculatedRisk);
    const renegotiationRequired = riskScore >= this.riskToleranceThreshold || missingEvidences.length > 0;

    let summary: string;
    if (renegotiationRequired) {
      summary = `CHALLENGE ISSUED: Proposal '${proposal.title}' exhibits risk score ${riskScore.toFixed(2)} with ${missingEvidences.length} missing evidence requirement(s) and ${counterClaims.length} counter-claims.`;
    } else {
      summary = `PASSED DEVIL'S ADVOCATE: Proposal '${proposal.title}' meets initial risk and evidence standards.`;
    }

    return {
      agent_id: this.agentId,
      challenge_summary: summary,
      missing_evidences: missingEvidences,
      counter_claims: counterClaims,
      renegotiation_required: renegotiationRequired,
      risk_score: riskScore
    };
  }
}
