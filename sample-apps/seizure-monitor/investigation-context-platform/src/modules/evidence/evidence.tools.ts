import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

import { randomUUID } from "crypto";
import { EvidenceSchema } from "./evidence.data.js";

export class EvidenceTools {
  @Tool({
    name: "add_evidence",
    description: "Add evidence to an investigation",

    inputSchema: z.object({
      investigationId: z
        .string()
        .uuid()
        .describe("Investigation ID"),

      title: z
        .string()
        .min(3)
        .max(150)
        .describe("Evidence title"),

      description: z
        .string()
        .describe("Evidence description"),

      type: z.enum([
        "log",
        "image",
        "document",
        "email",
        "pcap",
        "memory",
        "disk",
        "url",
        "ip",
        "domain",
        "hash",
        "malware",
        "other",
      ]),

      source: z
        .string()
        .describe("Source of the evidence"),

      collectedBy: z
        .string()
        .describe("Collector name"),

      tags: z.array(z.string()).optional(),
    }),

    examples: {
      request: {
        investigationId: "550e8400-e29b-41d4-a716-446655440000",
        title: "Firewall Log",
        description: "Suspicious outbound traffic",
        type: "log",
        source: "Firewall",
        collectedBy: "Analyst",
        tags: ["network", "ioc"],
      },

      response: {
        message: "Evidence added successfully",
      },
    },
  })
  @Widget("evidence-card")
  async addEvidence(input: any, ctx: ExecutionContext) {
    ctx.logger.info("Adding evidence", {
      title: input.title,
      investigationId: input.investigationId,
    });

    const now = new Date().toISOString();

    const evidence = EvidenceSchema.parse({
      id: randomUUID(),

      investigationId: input.investigationId,

      title: input.title,

      description: input.description,

      type: input.type,

      status: "collected",

      source: input.source,

      collectedBy: input.collectedBy,

      collectedAt: now,

      createdAt: now,

      updatedAt: now,

      tags: input.tags ?? [],
    });

    return {
      success: true,
      message: "Evidence added successfully",
      evidence,
    };
  }
}