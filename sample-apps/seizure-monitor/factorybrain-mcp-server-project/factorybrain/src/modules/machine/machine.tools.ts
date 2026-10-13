import { ControllerDecorator as Controller, ExecutionContext, ToolDecorator as Tool, z } from '@nitrostack/core';
import { DatabaseService, SensorReading } from '../../services/database.service.js';
import { QueueService } from '../../services/queue.service.js';
import { MachineAgent } from './machine.agent.js';

export const readingSchema = z.object({
  machineId: z.string().describe('Factory machine ID, for example M002'),
  timestamp: z.string().datetime().describe('Required ISO 8601 timestamp for the live reading'),
  airTemperature: z.number(),
  processTemperature: z.number(),
  rpm: z.number(),
  torque: z.number(),
  vibration: z.number(),
  pressure: z.number(),
  humidity: z.number(),
  voltage: z.number(),
  current: z.number(),
  powerConsumption: z.number(),
  toolWear: z.number(),
  operatingHours: z.number(),
});

@Controller('machine')
export class MachineTools {
  private readonly machineAgent: MachineAgent;
  private readonly database: DatabaseService;

  constructor(machineAgent?: MachineAgent, database?: DatabaseService) {
    const resolvedDatabase = database ?? new DatabaseService();
    this.database = resolvedDatabase;
    this.machineAgent = machineAgent ?? new MachineAgent(resolvedDatabase, new QueueService(resolvedDatabase));
    void resolvedDatabase.onModuleInit();
  }

  @Tool({
    name: 'predict_failure',
    description: 'Analyze one complete live sensor reading. Requires machineId, an ISO 8601 timestamp, and every declared numeric sensor field; use get_machine only for registry lookup, never as a substitute for telemetry.',
    inputSchema: readingSchema,
  })
  async predictFailure(input: z.infer<typeof readingSchema>, ctx: ExecutionContext) {
    await this.database.onModuleInit();
    const result = await this.machineAgent.analyzeReading({
      ...input,
      timestamp: input.timestamp,
    } satisfies SensorReading);
    ctx.logger.info(`Machine analysis complete for ${result.machineId}: ${result.failureProbability}`);
    return result;
  }

  @Tool({
    name: 'get_machine',
    description: 'Read registry data only. This tool cannot predict failure; after lookup, request a complete timestamped sensor reading before calling predict_failure.',
    inputSchema: z.object({
      machineId: z.string().describe('Factory machine ID, for example M002'),
    }),
  })
  async getMachine(input: { machineId: string }) {
    await this.database.onModuleInit();
    const machine = this.database.findMachine(input.machineId);
    if (!machine) {
      throw new Error(`Unknown machine: ${input.machineId}`);
    }
    return {
      ...machine,
      predictionAvailable: false,
      predictionMessage: 'Registry data alone cannot determine whether this machine is failing. Provide an ISO 8601 timestamp and all required live sensor fields to machine_predict_failure.',
      predictionRequiredFields: [
        'timestamp', 'airTemperature', 'processTemperature', 'rpm', 'torque', 'vibration',
        'pressure', 'humidity', 'voltage', 'current', 'powerConsumption', 'toolWear', 'operatingHours',
      ],
    };
  }

  @Tool({
    name: 'list_alerts',
    description: 'List machine-agent alerts generated during this server run.',
    inputSchema: z.object({
      machineId: z.string().optional(),
    }),
  })
  async listAlerts(input: { machineId?: string }) {
    await this.database.onModuleInit();
    return this.database.listAlerts(input.machineId);
  }
}
