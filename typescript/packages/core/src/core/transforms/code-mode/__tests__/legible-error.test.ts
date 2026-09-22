import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import { Tool } from '../../../../core/tool.js';
import { formatLegibleToolError } from '../legible-error.js';

describe('Code Mode Error Formatter & Contracts (NITRO-103-M1)', () => {
  const toolWithZod = new Tool({
    name: 'stripe_charge',
    description: 'Create a customer charge in Stripe',
    inputSchema: z.object({
      customerId: z.string().describe('Target customer identifier'),
      amountCents: z.number().describe('Amount in pennies'),
      currency: z.string().optional().describe('3-letter ISO currency'),
    }),
    handler: async () => ({ ok: true }),
  });

  const toolWithJsonSchema = new Tool({
    name: 'pg_exec',
    description: 'Execute SQL query on Postgres database',
    inputSchema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'SQL query string' },
        timeoutMs: { type: 'number', description: 'Execution timeout in ms' },
      },
      required: ['sql'],
    },
    handler: async () => ({ ok: true }),
  });

  const toolWithNoParams = new Tool({
    name: 'system_ping',
    description: 'Ping the system status',
    inputSchema: z.object({}),
    handler: async () => ({ pong: true }),
  });

  describe('formatLegibleToolError', () => {
    it('formats error with asterisk-flagged required parameters for Zod schemas', async () => {
      const err = new Error("Parameter 'amountCents' is required");
      const formatted = await formatLegibleToolError(toolWithZod, err);

      expect(formatted).toContain("callTool('stripe_charge') failed: Parameter 'amountCents' is required");
      expect(formatted).toContain('Valid parameters for stripe_charge (* = required):');
      expect(formatted).toContain('customerId*');
      expect(formatted).toContain('amountCents*');
      expect(formatted).toContain('currency');
      expect(formatted).not.toContain('currency*');
    });

    it('formats error with asterisk-flagged required parameters for JSON Schemas', async () => {
      const err = "Missing parameter 'sql'";
      const formatted = await formatLegibleToolError(toolWithJsonSchema, err);

      expect(formatted).toContain("callTool('pg_exec') failed: Missing parameter 'sql'");
      expect(formatted).toContain('Valid parameters for pg_exec (* = required):');
      expect(formatted).toContain('sql*');
      expect(formatted).toContain('timeoutMs');
      expect(formatted).not.toContain('timeoutMs*');
    });

    it('displays (none) when tool has no input parameters', async () => {
      const err = new Error('Unexpected parameter passed');
      const formatted = await formatLegibleToolError(toolWithNoParams, err);

      expect(formatted).toContain("callTool('system_ping') failed: Unexpected parameter passed");
      expect(formatted).toContain('Valid parameters for system_ping (* = required): (none)');
    });
  });
});
