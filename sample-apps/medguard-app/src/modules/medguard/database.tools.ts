import { ToolDecorator as Tool, ResourceDecorator as Resource, PromptDecorator as Prompt, z, ExecutionContext } from '@nitrostack/core';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DatabaseTools {
  
  @Tool({
    name: 'setup_medguard_database',
    title: 'Setup MedGuard Database',
    description: 'Initializes the Supabase database with the MedGuard schema and seeds initial patient and interaction rule data.',
    taskSupport: 'optional', // Exposes this tool as a Task in NitroStudio
    inputSchema: z.object({
      connectionString: z.string().optional().describe('Optional Supabase Postgres connection string. If not provided, falls back to SUPABASE_DB_URL env var.'),
    }),
  })
  async setupDatabase(input: { connectionString?: string }) {
    const connectionString = input.connectionString || process.env.SUPABASE_DB_URL;

    if (!connectionString) {
      throw new Error('Missing Supabase connection string. Please provide it in input or set SUPABASE_DB_URL env var.');
    }

    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      
      // Use absolute path correctly relative to the project root
      // since __dirname in dist is `dist/modules/calculator/medguard`
      const schemaPath = path.resolve(process.cwd(), 'supabase-schema.sql');
      
      if (!fs.existsSync(schemaPath)) {
          throw new Error(`Schema file not found at ${schemaPath}`);
      }
      
      const sqlQuery = fs.readFileSync(schemaPath, 'utf8');

      await client.query(sqlQuery);
      
      return {
        success: true,
        message: 'Database setup and seeding completed successfully!',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Database setup failed: ${error?.message || error}`,
      };
    } finally {
      await client.end();
    }
  }

  @Resource({
    uri: 'file:///supabase-schema.sql',
    name: 'Supabase Schema',
    title: 'MedGuard Database Schema',
    description: 'Provides the raw SQL schema and seed data for the MedGuard database',
    mimeType: 'application/sql',
  })
  async getDatabaseSchema() {
    const schemaPath = path.resolve(process.cwd(), 'supabase-schema.sql');
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found at ${schemaPath}`);
    }
    const content = fs.readFileSync(schemaPath, 'utf8');
    return {
      text: content
    };
  }

  @Prompt({
    name: 'medguard_query_help',
    title: 'MedGuard Query Helper',
    description: 'Get help writing custom SQL queries for the MedGuard database based on its schema.',
    arguments: [
      {
        name: 'question',
        description: 'What do you want to query? (e.g. "Find all patients with eGFR < 60")',
        required: true
      }
    ]
  })
  async generateQueryPrompt(args: { question: string }) {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Given the MedGuard database schema, write a safe, read-only SQL query to answer this question: ${args.question}. Please return just the SQL block.`
          }
        }
      ]
    };
  }
}
