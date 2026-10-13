// @ts-ignore
import dotenv from 'dotenv';
dotenv.config();

declare const process: any;

// @ts-ignore
import { createServer, Tool, Resource, Prompt, z } from '@nitrostack/core';

// @ts-ignore
import {
  checkMachineHealthLogic, checkMachineHealthSchema,
  predictFailureLogic, predictFailureSchema,
  scheduleMaintenanceLogic, scheduleMaintenanceSchema
} from './maintenance.tools';

// @ts-ignore
import {
  checkComplianceEventLogic, checkComplianceEventSchema,
  escalateIncidentLogic, escalateIncidentSchema
} from './safety.tools';

// @ts-ignore
import { InventoryController } from './modules/inventory.controller';
// @ts-ignore
import { ProcurementController } from './modules/procurement.controller';
// @ts-ignore
import { PolicyController } from './modules/policy.controller';
// @ts-ignore
import { OrchestratorController } from './modules/orchestrator.controller';

const server = createServer({
  name: 'GearMind',
  version: '1.0.0',
  description: 'FactoryMind Multi-Agent Autonomous Plant Operations Platform',
});

// Controllers Instances
const inventoryCtrl = new InventoryController();
const procurementCtrl = new ProcurementController();
const policyCtrl = new PolicyController();
const orchestratorCtrl = new OrchestratorController();

// ==========================================
// 1. DEFAULT HELLO TOOL
// ==========================================
server.tool(
  new Tool({
    name: 'hello',
    description: 'Say hello to someone',
    inputSchema: z.object({
      name: z.string().describe('The name to greet'),
    }) as any,
    handler: async (input: any, context: any) => {
      context?.logger?.info?.(`Greeting ${input.name}`);
      return `Hello, ${input.name}! 👋`;
    },
  })
);

// ==========================================
// 2. MAINTENANCE TOOLS (camelCase & snake_case)
// ==========================================
server.tool(
  new Tool({
    name: 'checkMachineHealth',
    description: 'Query real-time health telemetry for factory machines.',
    inputSchema: checkMachineHealthSchema as any,
    handler: async (input: any) => await checkMachineHealthLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'check_machine_health',
    description: 'Checks health status, temperature, and telemetry of plant machinery.',
    inputSchema: checkMachineHealthSchema as any,
    handler: async (input: any) => await checkMachineHealthLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'predictFailure',
    description: 'Analyze telemetry to predict machine failure probabilities.',
    inputSchema: predictFailureSchema as any,
    handler: async (input: any) => await predictFailureLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'predict_failure',
    description: 'Predicts failure probability and component risks for plant equipment.',
    inputSchema: predictFailureSchema as any,
    handler: async (input: any) => await predictFailureLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'scheduleMaintenance',
    description: 'Generate an official work order to schedule maintenance.',
    inputSchema: scheduleMaintenanceSchema as any,
    handler: async (input: any) => await scheduleMaintenanceLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'schedule_maintenance',
    description: 'Schedules maintenance work orders and dispatches detailed email notifications.',
    inputSchema: scheduleMaintenanceSchema as any,
    handler: async (input: any) => await scheduleMaintenanceLogic(input),
  })
);

// ==========================================
// 3. SAFETY TOOLS (camelCase & snake_case)
// ==========================================
server.tool(
  new Tool({
    name: 'checkComplianceEvent',
    description: 'Inspect plant safety compliance events and zone hazard logs.',
    inputSchema: checkComplianceEventSchema as any,
    handler: async (input: any) => await checkComplianceEventLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'check_compliance_event',
    description: 'Checks plant safety compliance and active hazard status across plant zones.',
    inputSchema: checkComplianceEventSchema as any,
    handler: async (input: any) => await checkComplianceEventLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'escalateIncident',
    description: 'Escalate emergency safety incidents and command shutdowns.',
    inputSchema: escalateIncidentSchema as any,
    handler: async (input: any) => await escalateIncidentLogic(input),
  })
);

server.tool(
  new Tool({
    name: 'escalate_incident',
    description: 'Escalates safety incidents and triggers automated emergency response protocols.',
    inputSchema: escalateIncidentSchema as any,
    handler: async (input: any) => await escalateIncidentLogic(input),
  })
);

// ==========================================
// 4. INVENTORY & PROCUREMENT TOOLS
// ==========================================
server.tool(
  new Tool({
    name: 'check_stock',
    description: 'Check available inventory stock for a given part or raw material.',
    inputSchema: z.object({
      partName: z.string().describe('Name or ID of the part to check.'),
    }) as any,
    handler: async (input: any, ctx: any) => await inventoryCtrl.checkStock(input, ctx),
  })
);

server.tool(
  new Tool({
    name: 'find_supplier',
    description: 'Searches the supplier catalog for an item to find prices and delivery times.',
    inputSchema: z.object({
      itemName: z.string().describe('The name of the item to search for'),
    }) as any,
    handler: async (input: any, ctx: any) => await procurementCtrl.findSupplier(input, ctx),
  })
);

server.tool(
  new Tool({
    name: 'place_order',
    description: 'Places an order for an item, logs it in order history.',
    inputSchema: z.object({
      supplierName: z.string(),
      itemName: z.string(),
      quantity: z.number(),
      totalCost: z.number(),
    }) as any,
    handler: async (input: any, ctx: any) => await procurementCtrl.placeOrder(input, ctx),
  })
);

// ==========================================
// 5. RESOURCES & PROMPTS
// ==========================================
server.resource(
  new Resource({
    uri: 'memo://manufacturing/inventory-rules',
    name: 'Manufacturing Inventory & Procurement Rules',
    description: 'Defines minimum stock levels and procurement policies for industrial spare parts.',
    mimeType: 'text/plain',
    handler: (async (_uri: any, ctx: any) => await policyCtrl.getInventoryRules(ctx)) as any,
  })
);

server.prompt(
  new Prompt({
    name: 'run_factory_supervisor',
    description: 'Master orchestrator prompt for evaluating inventory, procurement, machinery health, and safety protocols.',
    arguments: [
      { name: 'itemName', description: 'The inventory item to evaluate', required: false },
      { name: 'machineId', description: 'The machine ID to evaluate', required: false },
      { name: 'zoneId', description: 'The safety zone ID to audit', required: false },
    ],
    handler: async (args: any, ctx: any) => await orchestratorCtrl.getSupervisorPrompt(args, ctx),
  })
);

// Start Server
server.start().catch((error: any) => {
  console.error('Failed to start NitroStack server:', error);
});