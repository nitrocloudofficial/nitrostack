// @ts-ignore
import dotenv from 'dotenv';
dotenv.config();

declare const process: any;

// @ts-ignore
import WebSocket from 'ws';

// @ts-ignore
import { ControllerDecorator as Controller, ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';

// @ts-ignore
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hkpgwgyzwmlkqskbpuok.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: WebSocket as any }
});

@Controller()
export class InventoryController {
  @Tool({
    name: 'check_stock',
    description: 'Check available inventory stock for a given part or raw material.',
    inputSchema: z.object({
      partName: z.string().describe('Name or ID of the part to check.'),
    }),
  })
  async checkStock(input: { partName: string }, ctx: ExecutionContext) {
    ctx.logger?.info?.(`Checking stock for ${input.partName}`);
    return {
      partName: input.partName,
      inStock: 150,
      reserved: 20,
      status: 'AVAILABLE',
    };
  }
}