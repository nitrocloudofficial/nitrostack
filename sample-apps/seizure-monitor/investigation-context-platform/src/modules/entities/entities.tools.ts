import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

import { randomUUID } from "crypto";
import { EntitySchema } from "./entities.data.js";

export class EntityTools {
  @Tool({
    name: "add_entity",
    description: "Add an entity to an investigation",

    inputSchema: z.object({
      investigationId: z.string().uuid(),

      name: z.string().min(1).max(255),

      type: z.enum([
        "person",
        "device",
        "ip",
        "domain",
        "email",
        "organization",
        "url",
        "file",
        "hash",
        "process",
        "registry",
        "other",
      ]),

      value: z.string(),

      description: z.string().optional(),

      confidence: z.number().min(0).max(100).optional(),

      discoveredFrom: z.string().optional(),

      tags: z.array(z.string()).optional(),
    }),

    examples: {
      request: {
        investigationId: "550e8400-e29b-41d4-a716-446655440000",
        name: "192.168.1.10",
        type: "ip",
        value: "192.168.1.10",
      },

      response: {
        success: true,
        message: "Entity added successfully",
      },
    },
  })
  @Widget("entity-card")
  async addEntity(input: any, ctx: ExecutionContext) {
    ctx.logger.info("Adding entity", {
      name: input.name,
      type: input.type,
    });

    const now = new Date().toISOString();

    const entity = EntitySchema.parse({
      id: randomUUID(),

      investigationId: input.investigationId,

      name: input.name,

      type: input.type,

      value: input.value,

      description: input.description,

      confidence: input.confidence ?? 100,

      discoveredFrom: input.discoveredFrom,

      createdAt: now,

      updatedAt: now,

      tags: input.tags ?? [],
    });

    return {
      success: true,
      message: "Entity added successfully",
      entity,
    };
  }
}