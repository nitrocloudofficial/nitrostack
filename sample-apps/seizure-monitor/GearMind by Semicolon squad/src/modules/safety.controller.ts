import 'dotenv/config';
import { 
  ControllerDecorator as Controller, 
  ToolDecorator as Tool, 
  z, 
  ExecutionContext 
} from '@nitrostack/core';
import { 
  checkComplianceEventLogic,
  escalateIncidentLogic 
} from '../safety.tools.js';

export const checkComplianceEventSchema = z.object({
  zoneId: z.string().optional(),
  severityFilter: z.enum(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional().default('ALL'),
  unresolvedOnly: z.boolean().optional().default(false),
});

export const escalateIncidentSchema = z.object({
  zoneId: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string(),
  actionRequired: z.enum(['EVACUATION', 'SHUTDOWN', 'FIRST_AID', 'INSPECTION', 'CONTAINMENT']),
  reportedBy: z.string().optional().default('Safety Sentinel AI'),
});

@Controller()
export class SafetyController {
  @Tool({
    name: 'check_compliance_event',
    description: 'Checks plant safety compliance and active hazard status across plant zones.',
    inputSchema: checkComplianceEventSchema,
  })
  async checkComplianceEvent(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Checking compliance events for zone: ${input?.zoneId || 'All'}`);
    return checkComplianceEventLogic(input);
  }

  @Tool({
    name: 'escalate_incident',
    description: 'Escalates safety incidents and triggers automated emergency response protocols.',
    inputSchema: escalateIncidentSchema,
  })
  async escalateIncident(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Escalating safety incident in zone: ${input?.zoneId}`);
    return escalateIncidentLogic(input);
  }
}
