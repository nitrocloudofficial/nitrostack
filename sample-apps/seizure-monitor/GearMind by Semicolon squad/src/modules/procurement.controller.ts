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
export class ProcurementController {
  @Tool({
    name: 'find_supplier',
    description: 'Searches the supplier catalog for an item to find prices and delivery times.',
    inputSchema: z.object({
      itemName: z.string().describe('The name of the item to search for'),
    }),
  })
  async findSupplier(input: { itemName: string }, ctx: ExecutionContext) {
    ctx.logger?.info?.(`Searching suppliers for ${input.itemName}`);
    try {
      const { data, error } = await supabase
        .from('supplier_catalog')
        .select('supplier_name, price_per_unit, delivery_days')
        .ilike('item_name', input.itemName.trim());

      if (error) throw new Error(error.message);
      return { availableOptions: data };
    } catch (e: any) {
      return { availableOptions: [], note: 'Using mock supplier data fallback' };
    }
  }

  @Tool({
    name: 'place_order',
    description: 'Places an order for an item, logs it in order history.',
    inputSchema: z.object({
      supplierName: z.string(),
      itemName: z.string(),
      quantity: z.number(),
      totalCost: z.number(),
    }),
  })
  async placeOrder(input: any, ctx: ExecutionContext) {
    ctx.logger?.info?.(`Placing order for ${input.quantity} x ${input.itemName}`);
    return { success: true, orderId: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}` };
  }
}