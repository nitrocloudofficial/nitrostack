import { ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { DbService } from './db.service.js';

const GetDbSchemaInputSchema = z.object({
  projectName: z.string().optional().describe('Project name (for reference)')
});

const GetDbSchemaOutputSchema = z.object({
  status: z.enum(['success', 'error']),
  projectName: z.string().optional(),
  tables: z.array(
    z.object({
      name: z.string(),
      columns: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          notnull: z.number(),
          dflt_value: z.any().optional(),
          pk: z.number()
        })
      ),
      indexes: z.array(z.string()).optional()
    })
  ),
  message: z.string(),
  timestamp: z.string()
});

/**
 * Get Database Schema Tool
 * Retrieves and displays the database schema
 */
@Injectable({ deps: [DbService] })
export class GetDbSchemaTools {
  constructor(private dbService: DbService) {}

  @Tool({
    name: 'get-db-schema',
    description: 'Retrieve and display the database schema including all tables, columns, and indexes',
    inputSchema: GetDbSchemaInputSchema,
    outputSchema: GetDbSchemaOutputSchema
  })
  @Widget('schema-viewer')
  async getDbSchema(input: any, ctx: ExecutionContext) {
    const { projectName } = input;

    ctx.logger.info('Retrieving database schema', { projectName });

    try {
      const db = this.dbService.getDb();

      // Get all tables
      const tableRows = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all() as any[];

      const tables = tableRows.map((row: any) => {
        const tableName = row.name;

        // Get columns for this table
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

        // Get indexes for this table
        const indexes = db
          .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='${tableName}'`)
          .all() as any[];

        return {
          name: tableName,
          columns: columns.map((col: any) => ({
            name: col.name,
            type: col.type,
            notnull: col.notnull,
            dflt_value: col.dflt_value,
            pk: col.pk
          })),
          indexes: indexes.map((idx: any) => idx.name)
        };
      });

      ctx.logger.info('Schema retrieved successfully', {
        tableCount: tables.length
      });

      return {
        status: 'success',
        projectName: projectName || 'quantguard-mcp',
        tables,
        message: `Retrieved schema for ${tables.length} tables`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.logger.error('Failed to retrieve schema', {
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        status: 'error',
        projectName: projectName || 'quantguard-mcp',
        tables: [],
        message: `Failed to retrieve schema: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}
