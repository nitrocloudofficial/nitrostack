import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import * as memoryService from './memory.service.js';

export class MemoryTools {
  @Tool({
    name: 'remember',
    description: 'Store a new memory (fact, decision, event, or result) so other agents can find it later.',
    inputSchema: z.object({
      content: z.string().describe('The content of the memory to store'),
      memory_type: z.enum(['fact', 'decision', 'event', 'result']).describe('Type of memory'),
      project_id: z.string().describe('Project identifier'),
      task_id: z.string().describe('Task identifier'),
      agent_id: z.string().describe('ID of the agent storing this memory'),
      importance: z.number().min(0).max(1).default(0.5).describe('Importance score from 0 to 1'),
    }),
  })
  async remember(
    input: { content: string; memory_type: string; project_id: string; task_id: string; agent_id: string; importance: number },
    ctx: ExecutionContext
  ) {
    const memoryId = memoryService.remember(
      input.content,
      input.memory_type,
      input.project_id,
      input.task_id,
      input.agent_id,
      input.importance
    );
    return { memory_id: memoryId, status: 'stored' };
  }

  @Tool({
    name: 'recall',
    description: 'Search memory by meaning. Use this BEFORE starting work to see what other agents already found.',
    inputSchema: z.object({
      query: z.string().describe('Search query to find relevant memories'),
      project_id: z.string().describe('Project identifier'),
      task_id: z.string().default('').describe('Optional task identifier to narrow search'),
      limit: z.number().int().min(1).max(50).default(5).describe('Maximum number of results'),
    }),
  })
  async recall(
    input: { query: string; project_id: string; task_id: string; limit: number },
    ctx: ExecutionContext
  ) {
    const taskId = input.task_id || undefined;
    return memoryService.recall(input.query, input.project_id, taskId, input.limit);
  }

  @Tool({
    name: 'get_task_memory',
    description: 'Get everything known about one task, grouped by type: facts, decisions, events, results.',
    inputSchema: z.object({
      task_id: z.string().describe('Task identifier'),
    }),
  })
  async getTaskMemory(
    input: { task_id: string },
    ctx: ExecutionContext
  ) {
    return memoryService.getTaskMemory(input.task_id);
  }

  @Tool({
    name: 'get_decisions',
    description: 'Get just the decisions made so far on this project or task, with reasons.',
    inputSchema: z.object({
      project_id: z.string().describe('Project identifier'),
      task_id: z.string().default('').describe('Optional task identifier'),
    }),
  })
  async getDecisions(
    input: { project_id: string; task_id: string },
    ctx: ExecutionContext
  ) {
    const taskId = input.task_id || undefined;
    return memoryService.getDecisions(input.project_id, taskId);
  }

  @Tool({
    name: 'get_agent_history',
    description: 'Get everything a specific agent has done before on this project.',
    inputSchema: z.object({
      agent_id: z.string().describe('Agent identifier'),
      project_id: z.string().describe('Project identifier'),
    }),
  })
  async getAgentHistory(
    input: { agent_id: string; project_id: string },
    ctx: ExecutionContext
  ) {
    return memoryService.getAgentHistory(input.agent_id, input.project_id);
  }

  @Tool({
    name: 'store_result',
    description: 'Store the final output of a completed task.',
    inputSchema: z.object({
      task_id: z.string().describe('Task identifier'),
      result: z.string().describe('The result content to store'),
      agent_id: z.string().describe('Agent that produced this result'),
      project_id: z.string().describe('Project identifier'),
    }),
  })
  async storeResult(
    input: { task_id: string; result: string; agent_id: string; project_id: string },
    ctx: ExecutionContext
  ) {
    const memoryId = memoryService.storeResult(
      input.task_id,
      input.result,
      input.agent_id,
      input.project_id
    );
    return { memory_id: memoryId, status: 'result_stored' };
  }

  @Tool({
    name: 'handoff_task',
    description: 'Record that one agent is handing a task off to another, with a summary and next steps.',
    inputSchema: z.object({
      task_id: z.string().describe('Task identifier'),
      from_agent: z.string().describe('Agent handing off'),
      to_agent: z.string().describe('Agent receiving the task'),
      summary: z.string().describe('Summary of work done so far'),
      next_steps: z.string().describe('What the next agent should do'),
      project_id: z.string().describe('Project identifier'),
    }),
  })
  async handoffTask(
    input: { task_id: string; from_agent: string; to_agent: string; summary: string; next_steps: string; project_id: string },
    ctx: ExecutionContext
  ) {
    const memoryId = memoryService.handoffTask(
      input.task_id,
      input.from_agent,
      input.to_agent,
      input.summary,
      input.next_steps,
      input.project_id
    );
    return { memory_id: memoryId, status: 'handoff_recorded' };
  }
}
