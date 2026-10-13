import { GeminiService } from "./services/gemini.service.js";
import { CommitmentStore } from "./commitment.store.js";

import {
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from "@nitrostack/core";

export class CommitmentsTools {
  private geminiService = new GeminiService();

  @Tool({
    name: "extract_commitments",
    description: "Extract commitments from a meeting transcript",
    inputSchema: z.object({
      transcript: z.string(),
    }),
  })
@Tool({
  name: "extract_commitments",
  description: "Extract commitments from a meeting transcript",
  inputSchema: z.object({
    transcript: z.string(),
  }),
})
async extractCommitments(input: any, ctx: ExecutionContext) {

  ctx.logger.info("Extracting commitments...");

  const commitments = [
    {
      id: "cmt-001",
      who: "Alice",
      what: "Send API docs",
      dueDate: "Friday",
      meetingId: "meeting-001",
      status: "open",
      confidence: 0.98,
    },
    {
      id: "cmt-002",
      who: "Bob",
      what: "Finish frontend",
      dueDate: "Next week",
      meetingId: "meeting-001",
      status: "open",
      confidence: 0.95,
    },
  ];

  CommitmentStore.add(commitments);

  return {
    success: true,
    stored: commitments.length,
    commitments,
  };
}

  @Tool({
    name: "get_commitments",
    description: "Return all stored commitments",
    inputSchema: z.object({}),
  })
@Tool({
  name: "get_commitments",
  description: "Return all stored commitments",
  inputSchema: z.object({}),
})
async getCommitments() {
  return {
    commitments: CommitmentStore.getAll(),
  };
}
}