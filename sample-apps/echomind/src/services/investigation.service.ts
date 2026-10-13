import { Investigation, TimelineEvent } from "../models/investigation.js";
import { InvestigationClassifier } from "./engine/investigation.classifier.js";
import { InvestigationScenarioFactory } from "./engine/investigation.scenarios.js";
import { EvidenceGenerator } from "./engine/evidence.generator.js";
import { TimelineGenerator } from "./engine/timeline.generator.js";
import { VerdictGenerator } from "./engine/verdict.generator.js";
import { CaseStore } from "./case.store.js";

export class InvestigationService {
  static investigate(file?: string, question?: string): Investigation {
    const targetQuestion = question && question.trim() !== ""
      ? question.trim()
      : "Investigate system architecture security and performance regression";

    // Step 1: Classify Question Intent into Category
    const category = InvestigationClassifier.classify(targetQuestion, file);

    // Step 2: Create Enterprise Incident Scenario
    const scenario = InvestigationScenarioFactory.createScenario(category, targetQuestion, file);

    // Step 3: Generate Correlated Evidence Artifacts
    const evidenceData = EvidenceGenerator.generate(scenario);

    // Step 4: Construct Chronological Timeline
    const timeline = TimelineGenerator.generate(scenario, evidenceData);

    // Step 5: Synthesize Root Cause & Recommendation Verdict
    const verdict = VerdictGenerator.generate(scenario, evidenceData, targetQuestion);

    // Step 6: Assemble Full Investigation Result
    const caseNum = Math.floor(100 + Math.random() * 900);
    const caseId = `CASE-${caseNum}`;

    const investigationResult: Investigation = {
      caseId,
      question: targetQuestion,
      file: scenario.file,
      project: scenario.project,
      status: "Completed",
      createdAt: new Date().toISOString(),
      primaryAuthor: scenario.primaryAuthor.name,
      evidence: {
        commits: evidenceData.commits.length,
        meetings: evidenceData.meetings.length,
        documents: evidenceData.documents.length
      },
      timeline,
      verdict
    };

    // Automatically persist case in CaseStore so list_cases displays it
    CaseStore.addCase({
      caseId,
      title: targetQuestion,
      question: targetQuestion,
      file: scenario.file,
      project: scenario.project,
      status: "Completed",
      priority: category === "Security" || category === "Authentication" ? "Critical" : "High",
      progress: 100,
      confidence: verdict.confidence,
      createdAt: investigationResult.createdAt,
      primaryAuthor: scenario.primaryAuthor.name
    });

    return investigationResult;
  }
}