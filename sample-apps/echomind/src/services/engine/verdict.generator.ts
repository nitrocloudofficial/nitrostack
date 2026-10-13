import { Verdict } from "../../models/investigation.js";
import { InvestigationScenario } from "./investigation.types.js";
import { CorrelatedEvidence } from "./evidence.generator.js";

export class VerdictGenerator {
  static generate(
    scenario: InvestigationScenario,
    evidence: CorrelatedEvidence,
    question: string
  ): Verdict {
    const totalEvidenceCount = evidence.commits.length + evidence.meetings.length + evidence.documents.length;
    
    // Dynamic confidence calculation based on evidence volume
    let confidence = scenario.baseConfidence;
    if (totalEvidenceCount >= 5) {
      confidence = Math.min(99, confidence + 2);
    } else if (totalEvidenceCount <= 2) {
      confidence = Math.max(82, confidence - 6);
    }

    const summary = scenario.summaryTemplate;
    const rootCause = scenario.rootCauseTemplate;
    const recommendation = scenario.recommendations.join("\n• ");

    return {
      summary,
      rootCause,
      recommendation: `• ${recommendation}`,
      confidence
    };
  }
}
