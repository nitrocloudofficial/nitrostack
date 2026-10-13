import { InvestigationScenario, ScenarioCommit, ScenarioMeeting, ScenarioDocument } from "./investigation.types.js";

export interface CorrelatedEvidence {
  commits: ScenarioCommit[];
  meetings: ScenarioMeeting[];
  documents: ScenarioDocument[];
}

export class EvidenceGenerator {
  static generate(scenario: InvestigationScenario): CorrelatedEvidence {
    return {
      commits: scenario.commits,
      meetings: scenario.meetings,
      documents: scenario.documents
    };
  }
}
