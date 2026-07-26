import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';

/**
 * profile Tools
 * 
 * TODO: Add description
 */
@Injectable()
export class profileTools {
  @Tool({
    name: 'ping',
    description: 'Smoke test tool that returns server version and timestamp.',
    inputSchema: z.object({}),
  })
  async ping(input: any, context: ExecutionContext) {
    const timestamp = new Date().toISOString();
    return { 
      version: '1.0.0', 
      timestamp,
      calculation_trace: {
        inputs: {},
        rules_applied: ['smoke_test_ping'],
        intermediate_values: {
          generated_timestamp: timestamp
        }
      }
    };
  }
}
