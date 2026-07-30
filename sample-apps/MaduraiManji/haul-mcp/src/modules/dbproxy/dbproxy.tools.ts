import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { db } from '../../db/database.js';

const ALLOWED_TABLES: Record<string, string> = {
  tasks: 'tasks',
  calendar: 'calendar_events',
  risk: 'risk_logs',
  progress: 'progress_logs',
};

export class DbProxyTools {
  @Tool({
    name: 'get_agent_logs',
    description: 'Returns all stored records for a given agent type from the database. Used by the frontend to display real-time data.',
    inputSchema: z.object({
      agent: z.enum(['tasks', 'calendar', 'risk', 'progress'])
    })
  })
  async getAgentLogs(input: any, ctx: ExecutionContext): Promise<any> {
    const tableName = ALLOWED_TABLES[input.agent];
    if (!tableName) {
      return { error: 'Unknown agent', rows: [] };
    }

    return new Promise((resolve) => {
      db.all(
        `SELECT * FROM ${tableName} ORDER BY created_at DESC`,
        (err: Error | null, rows: any[]) => {
          if (err) {
            ctx.logger.error(`DB error: ${err.message}`);
            resolve({ error: err.message, rows: [] });
          } else {
            resolve({ rows: rows ?? [] });
          }
        }
      );
    });
  }

  @Tool({
    name: 'get_agent_counts',
    description: 'Returns the record count for all 4 agent tables. Used by the frontend home page to show live session counts.',
    inputSchema: z.object({})
  })
  async getAgentCounts(_input: any, ctx: ExecutionContext): Promise<any> {
    const tables = Object.entries(ALLOWED_TABLES);
    const counts: Record<string, number> = {};

    for (const [key, table] of tables) {
      await new Promise<void>((resolve) => {
        db.get(
          `SELECT COUNT(*) as cnt FROM ${table}`,
          (err: Error | null, row: any) => {
            counts[key] = err ? 0 : (row?.cnt ?? 0);
            resolve();
          }
        );
      });
    }

    return counts;
  }
}
