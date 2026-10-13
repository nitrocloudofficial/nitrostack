import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  z,
} from '@nitrostack/core';
import { ComplianceService } from './compliance.service.js';

@Controller('compliance')
export class ComplianceTools {
  constructor(private readonly svc: ComplianceService) {}

  @Tool({
    name: 'compliance_screen_vendor',
    description: 'Screens a vendor name against the denied parties list.',
    inputSchema: z.object({
      vendorName: z.string().describe('The name of the vendor to screen'),
    }),
    outputSchema: z.object({
      status: z.enum(['CLEAN', 'FLAGGED', 'BLOCKED']),
      matches: z.array(
        z.object({
          entity_name: z.string(),
          reason: z.string(),
        })
      ),
    }),
  })
  async screenVendor(
    input: { vendorName: string },
    _ctx: ExecutionContext,
  ) {
    return this.svc.screenVendor(input.vendorName);
  }
}
