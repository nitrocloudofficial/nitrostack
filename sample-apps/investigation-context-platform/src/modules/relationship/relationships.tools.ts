import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

import { randomUUID } from "crypto";

import { RelationshipSchema } from "./relationships.data.js";

export class RelationshipTools {

  @Tool({
    name: "create_relationship",

    description: "Connect two investigation entities",

    inputSchema: z.object({

      investigationId: z.string().uuid(),

      sourceEntityId: z.string().uuid(),

      targetEntityId: z.string().uuid(),

      relationship: z.enum([
        "connected_to",
        "logged_into",
        "accessed",
        "downloaded",
        "uploaded",
        "created",
        "owns",
        "uses",
        "communicated_with",
        "resolved_to",
        "related_to",
      ]),

      confidence: z.number().optional(),

      description: z.string().optional(),
    }),
  })
  @Widget("relationship-card")
  async createRelationship(input: any, ctx: ExecutionContext) {

    ctx.logger.info("Creating relationship");

    const now = new Date().toISOString();

    const relationship = RelationshipSchema.parse({

      id: randomUUID(),

      investigationId: input.investigationId,

      sourceEntityId: input.sourceEntityId,

      targetEntityId: input.targetEntityId,

      relationship: input.relationship,

      confidence: input.confidence ?? 100,

      description: input.description,

      createdAt: now,

      updatedAt: now,
    });

    return {

      success: true,

      message: "Relationship created",

      relationship,
    };
  }
}