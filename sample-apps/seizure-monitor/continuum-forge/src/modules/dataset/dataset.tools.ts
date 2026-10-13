import { ControllerDecorator as Controller, ToolDecorator as Tool, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import pg from 'pg';
import { trackToolExecution } from '../../telemetry/langfuse.service.js';

@Controller('dataset')
export class DatasetTools {
  private pool: pg.Pool;

  constructor() {
    this.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  @Tool({
    name: 'query_neon_database',
    description: 'Execute a raw SQL query against the Neon PostgreSQL database to retrieve sensor logs and historical data. Returns up to 100 rows.',
    inputSchema: z.object({
      query: z.string().describe('The SQL query to execute (e.g., SELECT * FROM sensor_logs LIMIT 10)')
    }),
  })
  async queryNeonDatabase(input: any, ctx: ExecutionContext) {
    return trackToolExecution('query_neon_database', input, async () => {
      ctx.logger.info(`Executing Neon DB Query: ${input.query}`);
      
      // Safety check to ensure DATABASE_URL is set
      if (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) {
        return {
          success: false,
          error: 'DATABASE_URL environment variable is missing. Please add it to your NitroStack Cloud settings.'
        };
      }

      // Optional safety: prevent destructive queries from the LLM
      const upperQuery = input.query.toUpperCase();
      if (upperQuery.includes('DROP') || upperQuery.includes('DELETE') || upperQuery.includes('TRUNCATE') || upperQuery.includes('UPDATE')) {
        return {
          success: false,
          error: 'Only SELECT queries are allowed for security reasons.'
        };
      }

      try {
        const result = await this.pool.query(input.query);
        const finalRows = result.rows.slice(0, 100);
        return {
          success: true,
          rowCount: result.rowCount,
          rows: finalRows, // Hard limit to 100 rows to prevent massive payloads
          ui: {
            widget: {
              uri: '/database-visualizer',
              data: {
                query: input.query,
                columns: result.fields.map((f: any) => f.name),
                rows: finalRows
              }
            }
          }
        };
      } catch (e: any) {
        ctx.logger.error(`Database Query Failed: ${e.message}`);
        return {
          success: false,
          error: e.message
        };
      }
    });
  }

  @Prompt({
    name: 'database_analyst_subagent',
    description: 'Instructs the LLM to act as a secure Database Analyst.',
    arguments: [],
  })
  async getDatabaseAnalystPrompt() {
    return {
      messages: [
        {
          role: 'user',
          content: `You are the Database Analyst Subagent. Your job is to convert extracted parameters into safe PostgreSQL SELECT queries. Do not generate destructive queries.`
        }
      ]
    };
  }
}
