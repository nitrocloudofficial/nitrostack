import { ToolDecorator as Tool, Widget, UseGuards, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { JWTGuard } from '../../guards/jwt.guard.js';
import { AuditService } from '../../services/audit.service.js';

// @Injectable({ deps: [...] }) is required here even though this is a tool
// controller, not a "service" — see invoices.tools.ts for the full
// explanation of why omitting this silently breaks constructor injection.
@Injectable({ deps: [AuditService] })
export class AuditTools {
  constructor(private auditService: AuditService) {}

  @Tool({
    name: 'get_audit_trail',
    description:
      'Return the most recent entries from the hash-chained audit log, including blocked/refused tool calls.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .positive()
        .max(200)
        .optional()
        .describe('Maximum number of most-recent audit entries to return. Defaults to 50.'),
    }),
    examples: {
      request: { limit: 10 },
      response: {
        entries: [
          {
            seq: 1,
            timestamp: '2026-07-26T01:09:08.683Z',
            tool: 'execute_payment',
            subject: 'demo-agent',
            outcome: 'blocked',
            reason: 'controller role required',
            hash: '18b296ac9c0c516d03d61d335db1840784ba68850873d5d822c3d0dc85f20d2e',
            prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
          },
        ],
      },
    },
  })
  @UseGuards(JWTGuard)
  @Widget('audit-timeline')
  async getAuditTrail(input: any, ctx: ExecutionContext) {
    const entries = this.auditService.getTrail().reverse().slice(0, input.limit ?? 50);
    return { entries };
  }
}
