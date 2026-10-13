import {
  ToolDecorator as Tool,
  Widget,
  ExecutionContext,
  z,
} from "@nitrostack/core";

import { InvestigationService } from "../../services/investigation.service.js";
import { CaseStore } from "../../services/case.store.js";
import { InvestigationClassifier } from "../../services/engine/investigation.classifier.js";
import { InvestigationScenarioFactory } from "../../services/engine/investigation.scenarios.js";

export class EchoMindTools {
  @Tool({
    name: "create_case",
    description: "Start a new AI investigation case for a specific question",
    inputSchema: z.object({
      question: z.string().describe("Investigation question"),
      file: z
        .string()
        .optional()
        .describe("Source file to investigate (optional)"),
    }),
  })
  @Widget("investigation-result")
  async startInvestigation(
    input: { question: string; file?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info("Starting Investigation", input);

    const investigation = InvestigationService.investigate(
      input.file,
      input.question
    );

    return {
      viewType: "case-investigation",
      caseId: investigation.caseId,
      question: investigation.question,
      title: investigation.question,
      file: investigation.file,
      project: investigation.project,
      status: investigation.status,
      priority: "High",
      progress: 100,
      createdAt: investigation.createdAt,
      primaryAuthor: investigation.primaryAuthor,
      confidence: investigation.verdict.confidence,
      sources: ["Git Commits", "Meetings", "Documents"],
      evidence: investigation.evidence,
      timeline: investigation.timeline,
      verdict: investigation.verdict,
    };
  }

  @Tool({
    name: "collect_code_evidence",
    description:
      "Collect and correlate code evidence, author details, meeting decisions and documents",
    inputSchema: z.object({
      file: z.string().optional(),
      author: z.string().optional(),
    }),
  })
  @Widget("investigation-result")
  async collectCodeEvidence(
    input: {
      file?: string;
      author?: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info("Collecting Code Evidence", input);

    const targetFile =
      input.file?.trim() || "PaymentService.ts";

    const category = InvestigationClassifier.classify(
      targetFile,
      targetFile
    );

    const scenario =
      InvestigationScenarioFactory.createScenario(
        category,
        `Collect code evidence for ${targetFile}`,
        targetFile
      );

    const investigation = scenario.commits.map(
      (commit: any, idx: number) => {
        const meeting =
          scenario.meetings[idx % scenario.meetings.length];

        const document =
          scenario.documents[idx % scenario.documents.length];

        return {
          commitId: commit.id,
          date: commit.date,
          message: commit.message,
          project: scenario.project,

          author: {
            id: `emp-${(input.author ??
              scenario.primaryAuthor.name)
              .toLowerCase()
              .replace(/\s+/g, "-")}`,

            name:
              input.author ??
              scenario.primaryAuthor.name,

            role: scenario.primaryAuthor.role,
            team: scenario.project,
          },

          meeting: meeting
            ? {
                id: meeting.id,
                title: meeting.title,
                decision: meeting.decision,
                date: meeting.date,
              }
            : null,

          document: document
            ? {
                id: document.id,
                title: document.title,
                summary: document.summary,
              }
            : null,
        };
      }
    );

    return {
      viewType: "code-evidence",
      success: true,
      file: scenario.file,
      commitsFound: scenario.commits.length,
      investigation,
    };
  }

  @Tool({
    name: "list_cases",
    description:
      "List all active and completed AI investigation cases",
    inputSchema: z.object({}),
  })
  @Widget("investigation-result")
  async listCases(_: unknown, ctx: ExecutionContext) {
    ctx.logger.info("Listing investigation cases");

    const cases = CaseStore.getCases();

    return {
      viewType: "case-dashboard",
      success: true,
      casesCount: cases.length,
      cases,
    };
  }
    @Tool({
    name: "add_evidence",
    description:
      "Attach a new piece of evidence to an investigation case",
    inputSchema: z.object({
      caseId: z.string(),
      evidenceType: z.enum(["Document", "Meeting"]),
      title: z.string(),
      description: z.string(),
    }),
  })
  @Widget("investigation-result")
  async addEvidence(
    input: {
      caseId: string;
      evidenceType: "Document" | "Meeting";
      title: string;
      description: string;
    },
    ctx: ExecutionContext
  ) {
    ctx.logger.info("Adding evidence", input);

    return {
      viewType: "evidence-added",
      success: true,
      caseId: input.caseId,
      evidence: {
        type: input.evidenceType,
        title: input.title,
        description: input.description,
        timestamp: new Date().toISOString(),
      },
      message: `${input.evidenceType} successfully attached to ${input.caseId}.`,
    };
  }

  @Tool({
    name: "search_engineering_docs",
    description:
      "Search engineering specifications, design docs and meeting notes",
    inputSchema: z.object({
      query: z.string(),
    }),
  })
  @Widget("investigation-result")
  async searchEngineeringDocs(
    input: { query: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info("Searching engineering docs", input);

    const targetQuery = input.query.trim() || "architecture";

    const category = InvestigationClassifier.classify(
      targetQuery,
      targetQuery
    );

    const scenario =
      InvestigationScenarioFactory.createScenario(
        category,
        `Search engineering documents for ${targetQuery}`,
        targetQuery
      );

    const investigation = scenario.commits.map(
      (commit: any, idx: number) => {
        const meeting =
          scenario.meetings[idx % scenario.meetings.length];

        const document =
          scenario.documents[idx % scenario.documents.length];

        return {
          commitId: commit.id,
          date: commit.date,
          message: commit.message,
          project: scenario.project,

          author: {
            id: `emp-${scenario.primaryAuthor.name
              .toLowerCase()
              .replace(/\s+/g, "-")}`,
            name: scenario.primaryAuthor.name,
            role: scenario.primaryAuthor.role,
            team: scenario.project,
          },

          meeting: meeting
            ? {
                id: meeting.id,
                title: meeting.title,
                decision: meeting.decision,
                date: meeting.date,
              }
            : null,

          document: document
            ? {
                id: document.id,
                title: document.title,
                summary: document.summary,
              }
            : null,
        };
      }
    );

    return {
      viewType: "code-evidence",
      success: true,
      file: scenario.file,
      commitsFound: scenario.commits.length,
      investigation,
    };
  }

  @Tool({
    name: "find_similar_incidents",
    description:
      "Retrieve historical incidents related to a technical topic",
    inputSchema: z.object({
      topic: z.string(),
    }),
  })
  @Widget("investigation-result")
  async findSimilarIncidents(
    input: { topic: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info("Searching similar incidents", input);

    const investigation =
      InvestigationService.investigate(
        undefined,
        `Investigate ${input.topic} incident`
      );

    return {
      viewType: "case-investigation",
      caseId: investigation.caseId,
      question: `Historical Post-Mortem Lookup: ${input.topic}`,
      title: `Similar Incident (${input.topic})`,
      file: investigation.file,
      project: investigation.project,
      status: investigation.status,
      priority: "High",
      progress: 100,
      createdAt: investigation.createdAt,
      primaryAuthor: investigation.primaryAuthor,
      confidence: investigation.verdict.confidence,
      sources: [
        "Historical Incidents",
        "Git Commits",
        "Meetings",
      ],
      evidence: investigation.evidence,
      timeline: investigation.timeline,
      verdict: investigation.verdict,
    };
  }
}