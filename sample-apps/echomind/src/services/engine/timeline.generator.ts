import { TimelineEvent } from "../../models/investigation.js";
import { InvestigationScenario } from "./investigation.types.js";
import { CorrelatedEvidence } from "./evidence.generator.js";

export class TimelineGenerator {
  static generate(scenario: InvestigationScenario, evidence: CorrelatedEvidence): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Add meetings first
    for (const m of evidence.meetings) {
      events.push({
        date: m.date,
        type: "Meeting",
        title: m.title,
        description: m.decision
      });
    }

    // Add commits
    for (const c of evidence.commits) {
      events.push({
        date: c.date,
        type: "Commit",
        title: c.message,
        description: `Author: ${scenario.primaryAuthor.name} (${scenario.primaryAuthor.role}) • File: ${c.file}`
      });
    }

    // Add documents
    for (const d of evidence.documents) {
      // Offset document date relative to commits for realistic timeline order
      const commitDate = evidence.commits[0]?.date || new Date().toISOString();
      const docDate = new Date(new Date(commitDate).getTime() + 3600000).toISOString();
      events.push({
        date: docDate,
        type: "Document",
        title: d.title,
        description: d.summary
      });
    }

    // Sort chronologically ascending
    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }
}
