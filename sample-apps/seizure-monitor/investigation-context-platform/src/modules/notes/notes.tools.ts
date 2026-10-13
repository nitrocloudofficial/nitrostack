import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

import { randomUUID } from "crypto";
import { NoteSchema } from "./notes.data.js";

export class NotesTools {
  @Tool({
    name: "add_note",
    description: "Add an investigation note",

    inputSchema: z.object({
      investigationId: z.string().uuid(),

      title: z.string().min(3).max(150),

      content: z.string(),

      type: z.enum([
        "observation",
        "analysis",
        "hypothesis",
        "finding",
        "recommendation",
      ]),

      author: z.string(),

      evidenceIds: z.array(z.string()).optional(),

      entityIds: z.array(z.string()).optional(),

      tags: z.array(z.string()).optional(),
    }),

    examples: {
      request: {
        investigationId: "550e8400-e29b-41d4-a716-446655440000",
        title: "PowerShell Activity",
        content: "PowerShell execution appears suspicious.",
        type: "analysis",
        author: "Vinay",
      },

      response: {
        success: true,
        message: "Note added successfully",
      },
    },
  })
  @Widget("note-card")
  async addNote(input: any, ctx: ExecutionContext) {
    ctx.logger.info("Adding investigation note");

    const now = new Date().toISOString();

    const note = NoteSchema.parse({
      id: randomUUID(),

      investigationId: input.investigationId,

      title: input.title,

      content: input.content,

      type: input.type,

      author: input.author,

      evidenceIds: input.evidenceIds ?? [],

      entityIds: input.entityIds ?? [],

      tags: input.tags ?? [],

      createdAt: now,

      updatedAt: now,
    });

    return {
      success: true,
      message: "Note added successfully",
      note,
    };
  }
}