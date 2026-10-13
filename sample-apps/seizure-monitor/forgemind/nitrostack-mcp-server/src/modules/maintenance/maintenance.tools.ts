import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { Machine, Inventory, WorkOrder } from '../../database.js';
import fs from 'fs';
import path from 'path';

export class MaintenanceTools {
  @Tool({
    name: 'find_machine',
    description: 'Fetch machine details',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine')
    })
  })
  async findMachine(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching machine details for ${input.machine_id}`);
    const machine = await Machine.findOne({ machine_id: input.machine_id }).lean();
    if (!machine) {
      return { error: `Machine ${input.machine_id} not found` };
    }
    return { machine };
  }

  @Tool({
    name: 'check_inventory',
    description: 'Fetch part stock level',
    inputSchema: z.object({
      part_id: z.string().describe('The ID of the part to check')
    })
  })
  async checkInventory(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Checking inventory for ${input.part_id}`);
    const part = await Inventory.findOne({ part_id: input.part_id }).lean();
    if (!part) {
      return { error: `Part ${input.part_id} not found in inventory` };
    }
    return { part_id: part.part_id, stock_level: part.stock_level };
  }

  @Tool({
    name: 'create_work_order',
    description: 'Create a new maintenance work order',
    inputSchema: z.object({
      machine_id: z.string().describe('The machine needing maintenance'),
      issue_summary: z.string().describe('Summary of the issue')
    })
  })
  async createWorkOrder(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Creating work order for ${input.machine_id}`);
    const workOrder = new WorkOrder({
      machine_id: input.machine_id,
      issue_summary: input.issue_summary,
      status: 'open'
    });
    await workOrder.save();
    return { work_order_id: workOrder._id, status: 'created', details: workOrder.toJSON() };
  }

  @Tool({
    name: 'estimate_production_impact',
    description: 'Estimate production impact in units lost',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine'),
      downtime_min: z.number().describe('Estimated downtime in minutes')
    })
  })
  async estimateProductionImpact(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Estimating production impact for ${input.machine_id}`);
    // Static formula: assuming 120 units produced per hour (2 units/min)
    const productionRatePerMin = 2;
    const estimatedImpact = input.downtime_min * productionRatePerMin;
    return {
      machine_id: input.machine_id,
      downtime_min: input.downtime_min,
      estimated_units_lost: estimatedImpact
    };
  }

  @Tool({
    name: 'get_machine_history',
    description: 'Fetch the historical telemetry event logs and sensor logs for a specific machine to analyze recent baseline trends.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine')
    })
  })
  async getMachineHistory(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Fetching history for ${input.machine_id}`);
    try {
      const logsPath = path.resolve(process.cwd(), '..', 'forgemind_server', 'data', 'telemetry_logs.json');
      const rawData = fs.readFileSync(logsPath, 'utf8');
      const logs = JSON.parse(rawData);
      const machineLogs = logs.filter((l: any) => l.equipment_id === input.machine_id);
      return { success: true, history: machineLogs };
    } catch (err: any) {
      ctx.logger.error(`Error reading history: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  @Tool({
    name: 'retrieve_sop',
    description: 'Retrieve Standard Operating Procedure (SOP) guidelines and diagnostic criteria for diagnosing and resolving a machine fault.',
    inputSchema: z.object({
      machine_id: z.string().describe('The ID of the machine')
    })
  })
  async retrieveSop(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Retrieving SOP for machine ${input.machine_id}`);
    const sopDatabase: Record<string, any> = {
      'MAC-CNC-101': {
        sop_id: 'SOP-CNC-04',
        title: 'Spindle Bearing Failure & Thermal-Vibration Triangulation Protocol',
        relevanceScore: 0.96,
        contentSnippet: 'Section 4.2: When spindle vibration exceeds 5.0 mm/s concurrently with thermal rise (>80°C) inside a 45s correlation window, inspect front ceramic bearings for lubrication starvation or micro-pitting. Immediately check inventory for part PART-BRG-77 (Ceramic Angular Contact Bearing 7014-CT). Replace within 60 mins to prevent total spindle lockup.',
        recommendedAction: 'Emergency shutdown of spindle motor. Replace front bearing assembly PART-BRG-77 and re-grease seals.',
        requiredParts: ['PART-BRG-77 (Ceramic Spindle Bearing)', 'LUB-SYN-90 (Synthetic High-Speed Grease)']
      },
      'EQ101': {
        sop_id: 'SOP-CNC-04',
        title: 'Spindle Bearing Failure & Thermal-Vibration Triangulation Protocol',
        relevanceScore: 0.96,
        contentSnippet: 'Section 4.2: When spindle vibration exceeds 5.0 mm/s concurrently with thermal rise (>80°C) inside a 45s correlation window, inspect front ceramic bearings for lubrication starvation or micro-pitting. Immediately check inventory for part PART-BRG-77 (Ceramic Angular Contact Bearing 7014-CT). Replace within 60 mins to prevent total spindle lockup.',
        recommendedAction: 'Emergency shutdown of spindle motor. Replace front bearing assembly PART-BRG-77 and re-grease seals.',
        requiredParts: ['PART-BRG-77 (Ceramic Spindle Bearing)', 'LUB-SYN-90 (Synthetic High-Speed Grease)']
      },
      'MAC-ARM-202': {
        sop_id: 'SOP-ARM-09',
        title: 'Hydraulic Thermal Runaway & Servo Actuator Degrade Mitigation',
        relevanceScore: 0.94,
        contentSnippet: 'Section 3.1: Hydraulic temperature exceeding 90°C indicates fluid viscosity breakdown or proportional valve flow restriction. If vibration remains below 2.0 mm/s but power draw spikes by >40%, perform immediate heat exchanger flush and replace hydraulic filter element PART-FLD-12.',
        recommendedAction: 'Reduce robotic payload speed to 20%. Purge hydraulic circuit fluid and replace inline filter cartridge PART-FLD-12.',
        requiredParts: ['PART-FLD-12 (Hydraulic Filter Element)', 'ISO-VG-46 (Hydraulic Oil 20L)']
      },
      'EQ103': {
        sop_id: 'SOP-ARM-09',
        title: 'Hydraulic Thermal Runaway & Servo Actuator Degrade Mitigation',
        relevanceScore: 0.94,
        contentSnippet: 'Section 3.1: Hydraulic temperature exceeding 90°C indicates fluid viscosity breakdown or proportional valve flow restriction. If vibration remains below 2.0 mm/s but power draw spikes by >40%, perform immediate heat exchanger flush and replace hydraulic filter element PART-FLD-12.',
        recommendedAction: 'Reduce robotic payload speed to 20%. Purge hydraulic circuit fluid and replace inline filter cartridge PART-FLD-12.',
        requiredParts: ['PART-FLD-12 (Hydraulic Filter Element)', 'ISO-VG-46 (Hydraulic Oil 20L)']
      },
      'MAC-STP-404': {
        sop_id: 'SOP-STP-12',
        title: 'Main Pressure Relief Valve Valve Failure & Cascade Inventory Protocol',
        relevanceScore: 0.98,
        contentSnippet: 'Section 7.4: Rapid hydraulic pressure decay below 150 bar accompanied by high pulse noise indicates main proportional relief valve seat rupture (PART-VLV-99). CRITICAL: If PART-VLV-99 is out of stock in local warehouse, engage emergency rerouting to Line 3 auxiliary press and place expedited PO with Milwaukee Hydraulics.',
        recommendedAction: 'Lockout/Tagout (LOTO) Stamping Press P4. Check inventory for PART-VLV-99. If out of stock, trigger backup vendor procurement.',
        requiredParts: ['PART-VLV-99 (Proportional Relief Valve 350-Bar)']
      },
      'EQ107': {
        sop_id: 'SOP-STP-12',
        title: 'Main Pressure Relief Valve Valve Failure & Cascade Inventory Protocol',
        relevanceScore: 0.98,
        contentSnippet: 'Section 7.4: Rapid hydraulic pressure decay below 150 bar accompanied by high pulse noise indicates main proportional relief valve seat rupture (PART-VLV-99). CRITICAL: If PART-VLV-99 is out of stock in local warehouse, engage emergency rerouting to Line 3 auxiliary press and place expedited PO with Milwaukee Hydraulics.',
        recommendedAction: 'Lockout/Tagout (LOTO) Stamping Press P4. Check inventory for PART-VLV-99. If out of stock, trigger backup vendor procurement.',
        requiredParts: ['PART-VLV-99 (Proportional Relief Valve 350-Bar)']
      }
    };

    const matchedSop = sopDatabase[input.machine_id];
    if (!matchedSop) {
      return { success: false, error: `SOP not found for machine ${input.machine_id}` };
    }
    return { success: true, sop: matchedSop };
  }
}
