import { v4 as uuidv4 } from 'uuid';
import * as sqliteService from './sqlite.service.js';
import type { MemoryRow } from './sqlite.service.js';

const VALID_TYPES = ['fact', 'decision', 'event', 'result'] as const;

export async function setup(): Promise<void> {
  await sqliteService.initDb();
}

export function remember(
  content: string,
  memoryType: string,
  projectId: string,
  taskId: string,
  agentId: string,
  importance: number = 0.5
): string {
  if (!VALID_TYPES.includes(memoryType as any)) {
    throw new Error(`memory_type must be one of ${VALID_TYPES.join(', ')}, got ${memoryType}`);
  }

  const memory: MemoryRow = {
    memory_id: `mem_${uuidv4().replace(/-/g, '').slice(0, 8)}`,
    content,
    memory_type: memoryType,
    project_id: projectId,
    task_id: taskId,
    agent_id: agentId,
    importance,
    timestamp: new Date().toISOString(),
  };

  sqliteService.insertMemory(memory);
  return memory.memory_id;
}

export function recall(
  query: string,
  projectId: string,
  taskId?: string,
  limit: number = 5
): MemoryRow[] {
  return sqliteService.searchByContent(query, projectId, taskId, limit);
}

export function getTaskMemory(taskId: string): Record<string, MemoryRow[]> {
  const rows = sqliteService.getByTask(taskId);
  const grouped: Record<string, MemoryRow[]> = {
    fact: [],
    decision: [],
    event: [],
    result: [],
  };
  for (const r of rows) {
    if (grouped[r.memory_type]) {
      grouped[r.memory_type].push(r);
    }
  }
  return grouped;
}

export function getDecisions(projectId: string, taskId?: string): MemoryRow[] {
  return sqliteService.getDecisions(projectId, taskId);
}

export function getAgentHistory(agentId: string, projectId: string): MemoryRow[] {
  return sqliteService.getByAgent(agentId, projectId);
}

export function storeResult(
  taskId: string,
  result: string,
  agentId: string,
  projectId: string
): string {
  return remember(result, 'result', projectId, taskId, agentId, 0.8);
}

export function handoffTask(
  taskId: string,
  fromAgent: string,
  toAgent: string,
  summary: string,
  nextSteps: string,
  projectId: string
): string {
  const content = `Handoff from ${fromAgent} to ${toAgent}. Summary: ${summary}. Next steps: ${nextSteps}`;
  return remember(content, 'event', projectId, taskId, fromAgent, 0.7);
}
