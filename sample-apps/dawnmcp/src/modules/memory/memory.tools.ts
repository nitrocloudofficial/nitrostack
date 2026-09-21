import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { MemoryService } from './memory.service.js';
import type { MemoryCategory } from './memory.service.js';

/**
 * Memory MCP Tools
 *
 * Exposes memory operations as MCP tools for AI clients.
 * All tools are prefixed with "memory_" (e.g. memory_save_memory).
 */
@Controller('memory')
export class MemoryTools {
  constructor(private readonly memoryService: MemoryService) {}

  // ── save_memory ────────────────────────────────────────────────────

  @Tool({
    name: 'save_memory',
    description:
      'Save a piece of information to long-term memory. Use this to remember user preferences, project context, technical decisions, conversations, or important events for future reference.',
    inputSchema: z.object({
      content: z
        .string()
        .min(1)
        .describe('The information to remember. Be specific and descriptive.'),
      category: z
        .enum([
          'user_preferences',
          'project_info',
          'technical_decisions',
          'conversations',
          'events',
        ])
        .describe('Category of the memory for organized retrieval.'),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe('Optional key-value metadata (e.g. { project: "DawnMCP", tags: ["auth"] }).'),
    }),
  })
  async saveMemory(
    input: { content: string; category: MemoryCategory; metadata?: Record<string, unknown> },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Saving memory', { category: input.category, length: input.content.length });

    try {
      const record = await this.memoryService.createMemory(
        input.content,
        input.category,
        input.metadata ?? {},
      );

      return {
        success: true,
        memory: {
          id: record.id,
          category: record.category,
          createdAt: record.createdAt,
          contentPreview: record.content.slice(0, 100),
        },
        message: `Memory saved successfully (${record.category})`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Failed to save memory', { error: message });
      return { success: false, error: message };
    }
  }

  // ── search_memory ──────────────────────────────────────────────────

  @Tool({
    name: 'search_memory',
    description:
      'Search stored memories by semantic similarity. Use this to recall past conversations, find previously stored project context, retrieve technical decisions, or look up user preferences.',
    inputSchema: z.object({
      query: z.string().min(1).describe('Natural language search query.'),
      category: z
        .enum([
          'user_preferences',
          'project_info',
          'technical_decisions',
          'conversations',
          'events',
        ])
        .optional()
        .describe('Filter results to a specific category (optional).'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(5)
        .describe('Maximum number of results to return.'),
    }),
  })
  async searchMemory(
    input: { query: string; category?: MemoryCategory; limit?: number },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Searching memory', { query: input.query, category: input.category });

    try {
      const results = await this.memoryService.searchMemory(
        input.query,
        input.limit ?? 5,
        input.category,
      );

      return {
        success: true,
        count: results.length,
        results: results.map((r) => ({
          id: r.id,
          content: r.content,
          category: r.category,
          similarity: Math.round(r.similarity * 1000) / 1000,
          createdAt: r.createdAt,
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Memory search failed', { error: message });
      return { success: false, error: message, results: [] };
    }
  }

  // ── update_memory ──────────────────────────────────────────────────

  @Tool({
    name: 'update_memory',
    description:
      'Update the content of an existing memory. The embedding is regenerated automatically. Use the memory ID from a previous search result.',
    inputSchema: z.object({
      id: z.string().uuid().describe('The UUID of the memory to update.'),
      content: z.string().min(1).describe('The new content for this memory.'),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe('Optional updated metadata.'),
    }),
  })
  async updateMemory(
    input: { id: string; content: string; metadata?: Record<string, unknown> },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Updating memory', { id: input.id });

    try {
      const updated = await this.memoryService.updateMemory(
        input.id,
        input.content,
        input.metadata,
      );

      if (!updated) {
        return { success: false, error: `Memory with ID "${input.id}" not found` };
      }

      return {
        success: true,
        memory: {
          id: updated.id,
          category: updated.category,
          updatedAt: updated.updatedAt,
          contentPreview: updated.content.slice(0, 100),
        },
        message: 'Memory updated successfully',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Failed to update memory', { error: message });
      return { success: false, error: message };
    }
  }

  // ── delete_memory ──────────────────────────────────────────────────

  @Tool({
    name: 'delete_memory',
    description:
      'Permanently delete a stored memory by its ID. Use the memory ID from a previous search result.',
    inputSchema: z.object({
      id: z.string().uuid().describe('The UUID of the memory to delete.'),
    }),
  })
  async deleteMemory(input: { id: string }, ctx: ExecutionContext) {
    ctx.logger.info('Deleting memory', { id: input.id });

    try {
      const deleted = await this.memoryService.deleteMemory(input.id);

      if (!deleted) {
        return { success: false, error: `Memory with ID "${input.id}" not found` };
      }

      return { success: true, message: `Memory ${input.id} deleted` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ctx.logger.error('Failed to delete memory', { error: message });
      return { success: false, error: message };
    }
  }
}
