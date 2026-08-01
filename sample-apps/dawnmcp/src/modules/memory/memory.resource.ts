import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { MemoryService } from './memory.service.js';

/**
 * Memory MCP Resources
 *
 * Read-only resources that expose memory data to AI clients.
 */
export class MemoryResources {
  constructor(private readonly memoryService: MemoryService) {}

  // ── memory://history ───────────────────────────────────────────────

  @Resource({
    uri: 'memory://history',
    name: 'Memory History',
    description: 'The 50 most recent memories stored by the AI assistant, sorted newest first.',
    mimeType: 'application/json',
  })
  async getHistory(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching memory history');

    const memories = await this.memoryService.getRecentMemories(50);

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              totalMemories: memories.length,
              memories: memories.map((m) => ({
                id: m.id,
                content: m.content,
                category: m.category,
                createdAt: m.createdAt,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  // ── user://profile ─────────────────────────────────────────────────

  @Resource({
    uri: 'user://profile',
    name: 'User Profile',
    description: 'Stored user preferences and profile information from memory.',
    mimeType: 'application/json',
  })
  async getUserProfile(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching user profile');

    const preferences = await this.memoryService.getMemoriesByCategory('user_preferences');

    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              totalPreferences: preferences.length,
              preferences: preferences.map((m) => ({
                id: m.id,
                content: m.content,
                metadata: m.metadata,
                createdAt: m.createdAt,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
