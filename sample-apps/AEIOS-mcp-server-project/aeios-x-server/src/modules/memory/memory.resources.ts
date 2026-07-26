import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { MemoryService } from './memory.service.js';

const memoryService = new MemoryService();

export class MemoryResources {
  @Resource({
    uri: 'aeios://memory/stats',
    name: 'Memory Statistics',
    description: 'Persistent enterprise memory usage statistics',
    mimeType: 'application/json',
  })
  async memoryStats(ctx: ExecutionContext) {
    const stats = memoryService.stats();
    return {
      contents: [{
        uri: 'aeios://memory/stats',
        mimeType: 'application/json',
        text: JSON.stringify(stats, null, 2),
      }],
    };
  }

  @Resource({
    uri: 'aeios://memory/all',
    name: 'All Memory Entries',
    description: 'All entries currently stored in enterprise memory',
    mimeType: 'application/json',
  })
  async allMemory(ctx: ExecutionContext) {
    const entries = memoryService.listAll();
    return {
      contents: [{
        uri: 'aeios://memory/all',
        mimeType: 'application/json',
        text: JSON.stringify({ count: entries.length, entries }, null, 2),
      }],
    };
  }
}
