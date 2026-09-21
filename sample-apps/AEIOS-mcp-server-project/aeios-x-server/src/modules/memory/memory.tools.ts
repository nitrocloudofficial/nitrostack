import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { MemoryService } from './memory.service.js';

const memoryService = new MemoryService();

export class MemoryTools {
  @Tool({
    name: 'memory_store',
    description: 'Store a key-value pair in persistent enterprise memory with optional category, tags, and TTL',
    parameters: z.object({
      key: z.string().describe('Unique key for the memory entry'),
      value: z.string().describe('Value to store (text or JSON string)'),
      category: z.string().optional().describe('Category (e.g., facts, decisions, context)'),
      tags: z.array(z.string()).optional().describe('Tags for searchability'),
      ttlMinutes: z.number().optional().describe('Time-to-live in minutes (omit for permanent)'),
    }),
  })
  async store(ctx: ExecutionContext) {
    const { key, value, category, tags, ttlMinutes } = ctx.params as {
      key: string; value: string; category?: string; tags?: string[]; ttlMinutes?: number;
    };
    let parsed: unknown = value;
    try { parsed = JSON.parse(value); } catch { /* keep as string */ }
    const entry = memoryService.store(key, parsed, category || 'general', tags || [], ttlMinutes);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, entry }, null, 2) }] };
  }

  @Tool({
    name: 'memory_retrieve',
    description: 'Retrieve a value from persistent enterprise memory by key',
    parameters: z.object({
      key: z.string().describe('Key to retrieve'),
    }),
  })
  async retrieve(ctx: ExecutionContext) {
    const { key } = ctx.params as { key: string };
    const entry = memoryService.retrieve(key);
    if (!entry) return { content: [{ type: 'text' as const, text: JSON.stringify({ found: false, key }, null, 2) }] };
    return { content: [{ type: 'text' as const, text: JSON.stringify({ found: true, entry }, null, 2) }] };
  }

  @Tool({
    name: 'memory_search',
    description: 'Search enterprise memory by keyword across keys, values, categories, and tags',
    parameters: z.object({
      query: z.string().describe('Search query'),
    }),
  })
  async search(ctx: ExecutionContext) {
    const { query } = ctx.params as { query: string };
    const results = memoryService.search(query);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ query, count: results.length, results }, null, 2) }] };
  }

  @Tool({
    name: 'memory_list',
    description: 'List all entries in enterprise memory, optionally filtered by category',
    parameters: z.object({
      category: z.string().optional().describe('Filter by category'),
    }),
  })
  async list(ctx: ExecutionContext) {
    const { category } = ctx.params as { category?: string };
    const entries = category ? memoryService.byCategory(category) : memoryService.listAll();
    return { content: [{ type: 'text' as const, text: JSON.stringify({ count: entries.length, entries }, null, 2) }] };
  }

  @Tool({
    name: 'memory_delete',
    description: 'Delete a specific entry from enterprise memory',
    parameters: z.object({
      key: z.string().describe('Key to delete'),
    }),
  })
  async remove(ctx: ExecutionContext) {
    const { key } = ctx.params as { key: string };
    const deleted = memoryService.remove(key);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: deleted, key }, null, 2) }] };
  }

  @Tool({
    name: 'memory_clear',
    description: 'Clear enterprise memory - all entries or by category',
    parameters: z.object({
      category: z.string().optional().describe('Category to clear (omit to clear all)'),
    }),
  })
  async clear(ctx: ExecutionContext) {
    const { category } = ctx.params as { category?: string };
    const count = memoryService.clear(category);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, cleared: count }, null, 2) }] };
  }

  @Tool({
    name: 'memory_stats',
    description: 'Get enterprise memory usage statistics',
    parameters: z.object({}),
  })
  async stats(ctx: ExecutionContext) {
    const stats = memoryService.stats();
    return { content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }] };
  }
}
