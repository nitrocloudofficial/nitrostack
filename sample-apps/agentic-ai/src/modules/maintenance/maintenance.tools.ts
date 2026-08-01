import { ControllerDecorator as Controller, ExecutionContext, ToolDecorator as Tool, z } from '@nitrostack/core';
import { DatabaseService, MachineAlert } from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { ORCHESTRATOR_JOBS } from '../../orchestrator/orchestrator.jobs.js';
import { MaintenanceAgent } from './maintenance.agent.js';

const alertSchema = z.object({
  alertId: z.string().describe('Machine Agent alert ID'),
  machineId: z.string().describe('Machine ID from the registry'),
  failureProbability: z.number().min(0).max(1),
  urgency: z.enum(['Low', 'Medium', 'High', 'Critical']),
  likelyCause: z.string().describe('Failure cause diagnosed by the Machine Agent'),
  primaryPart: z.string().describe('Part suggested by the Machine Agent'),
  timestamp: z.string(),
  message: z.string().default(''),
});

@Controller('maintenance')
export class MaintenanceTools {
  private readonly maintenanceAgent: MaintenanceAgent;
  private readonly database: DatabaseService;

  constructor(maintenanceAgent?: MaintenanceAgent, database?: DatabaseService) {
    const resolvedDatabase = database ?? new DatabaseService();
    this.database = resolvedDatabase;

    if (maintenanceAgent) {
      this.maintenanceAgent = maintenanceAgent;
    } else {
      // NitroStack can instantiate a tool controller outside the application DI
      // container (for example during direct MCP tool execution). Keep ticket
      // creation usable in that mode while the normal module path continues to
      // use the shared queue and its real downstream handlers.
      const queue = new QueueService(resolvedDatabase);
      queue.registerHandler('manager', 'maintenance_summary', async () => {});
      queue.registerHandler('inventory', ORCHESTRATOR_JOBS.RUN_INVENTORY, async () => {});
      this.maintenanceAgent = new MaintenanceAgent(resolvedDatabase, queue);
    }

    void resolvedDatabase.onModuleInit();
  }

  @Tool({
    name: 'create_maintenance_ticket',
    description: 'Create a maintenance ticket from a Machine Agent alert using maintenance history, machine registry part/team, and technician availability. Does not diagnose failures.',
    inputSchema: alertSchema,
  })
  async createMaintenanceTicket(input: z.infer<typeof alertSchema>, ctx: ExecutionContext) {
    await this.database.onModuleInit();
    const plan = await this.maintenanceAgent.createMaintenanceTicket({ kind: 'machine_failure', ...input } satisfies MachineAlert);
    ctx.logger.info(`Maintenance ticket ${plan.ticket.ticketId} created for ${plan.ticket.machineId}`);
    return plan;
  }

  @Tool({
    name: 'get_history',
    description: 'Look up historical maintenance records for a machine, optional part, and optional issue.',
    inputSchema: z.object({
      machineId: z.string(),
      requiredPart: z.string().optional(),
      issueDetected: z.string().optional(),
    }),
  })
  async getHistory(input: { machineId: string; requiredPart?: string; issueDetected?: string }) {
    return this.database.getMaintenanceHistory(input.machineId, input.requiredPart, input.issueDetected);
  }

  @Tool({
    name: 'list_tickets',
    description: 'List maintenance tickets created during this server run.',
    inputSchema: z.object({
      machineId: z.string().optional(),
    }),
  })
  async listTickets(input: { machineId?: string }) {
    return this.database.listMaintenanceTickets(input.machineId);
  }

}
