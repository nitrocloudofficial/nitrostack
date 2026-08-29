import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Helper function to execute Python logic scripts and return parsed JSON output.
 */
async function runPythonLogic(code: string): Promise<any> {
  const { stdout } = await execAsync(`python3 -c ${JSON.stringify(code)}`, {
    cwd: process.cwd(),
  });
  return JSON.parse(stdout.trim());
}

export class PlannerTools {
  @Tool({
    name: 'get_assembly_sequence',
    description:
      'Get active assembly sequence for a given shift and line [UI Directive: A visual widget is rendered for this response. Provide ONLY a brief 1-sentence summary. Do not repeat raw sequence lists, VIN tables, or metric lists in markdown text.]',
    inputSchema: z.object({
      shift_id: z.string().describe('ID of the shift'),
      line_id: z.string().describe('ID of the assembly line'),
    }),
    invocation: {
      invoking: 'Fetching assembly queue sequence...',
      invoked: 'Assembly sequence loaded',
    },
    examples: {
      request: { shift_id: 'S1', line_id: 'L1' },
      response: {
        shift: 'S1',
        line: 'L1',
        active_queue: [
          { vin: 'VIN-101', model: 'SUV-LX', trim: 'Luxury', seat_type: 'RED_LEATHER', status: 'QUEUED' },
          { vin: 'VIN-102', model: 'SEDAN-SE', trim: 'Standard', seat_type: 'BLACK_FABRIC', status: 'QUEUED' },
        ],
        ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
      },
    },
  })
  @Widget('assembly-queue-widget')
  async getAssemblySequence(
    input: { shift_id: string; line_id: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Fetching assembly sequence', {
      shift_id: input.shift_id,
      line_id: input.line_id,
    });
    const pythonCode = `import json; from teammates.dev_a.logic import get_assembly_sequence; print(json.dumps(get_assembly_sequence(${JSON.stringify(input.shift_id)}, ${JSON.stringify(input.line_id)})))`;
    const result = await runPythonLogic(pythonCode);
    return {
      ...result,
      ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
    };
  }

  @Tool({
    name: 'resequence_build_plan',
    description:
      'Resequence build plan based on delay reason and missing option [UI Directive: A visual widget is rendered for this response. Provide ONLY a brief 1-sentence summary. Do not repeat raw sequence lists, VIN tables, or metric lists in markdown text.]',
    inputSchema: z.object({
      delay_reason: z.string().describe('Reason for delay or resequencing'),
      missing_option: z.string().describe('Missing option or part constraint causing delay'),
    }),
    invocation: {
      invoking: 'Resequencing build plan...',
      invoked: 'Build plan resequenced',
    },
    examples: {
      request: { delay_reason: 'parts delay', missing_option: 'RED_LEATHER' },
      response: {
        reason: 'parts delay',
        new_sequence: [
          { vin: 'VIN-102', model: 'SEDAN-SE', trim: 'Standard', seat_type: 'BLACK_FABRIC', status: 'QUEUED' },
          { vin: 'VIN-101', model: 'SUV-LX', trim: 'Luxury', seat_type: 'RED_LEATHER', status: 'QUEUED' },
        ],
        ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
      },
    },
  })
  @Widget('assembly-queue-widget')
  async resequenceBuildPlan(
    input: { delay_reason: string; missing_option: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Resequencing build plan', {
      delay_reason: input.delay_reason,
      missing_option: input.missing_option,
    });
    const pythonCode = `import json; from teammates.dev_a.logic import resequence_build_plan; print(json.dumps(resequence_build_plan(${JSON.stringify(input.delay_reason)}, ${JSON.stringify(input.missing_option)})))`;
    const result = await runPythonLogic(pythonCode);
    return {
      ...result,
      ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
    };
  }

  @Tool({
    name: 'check_jis_inventory',
    description: 'Check Just-in-Sequence (JIS) inventory availability for a part and optional VIN sequence',
    inputSchema: z.object({
      part_number: z.string().describe('JIS part number to check'),
      vin_sequence: z.string().optional().describe('Optional VIN sequence number'),
    }),
    invocation: {
      invoking: 'Checking JIS inventory...',
      invoked: 'JIS inventory checked',
    },
    examples: {
      request: { part_number: 'SEAT-RED-01', vin_sequence: 'VIN-101' },
      response: {
        part_number: 'SEAT-RED-01',
        stock: 0,
        supplier_eta: null,
        shortage: true,
        available: false,
        vin_sequence: 'VIN-101',
      },
    },
  })
  async checkJisInventory(
    input: { part_number: string; vin_sequence?: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Checking JIS inventory', {
      part_number: input.part_number,
      vin_sequence: input.vin_sequence,
    });
    const vinArg = input.vin_sequence !== undefined ? JSON.stringify(input.vin_sequence) : 'None';
    const pythonCode = `import json; from teammates.dev_b.logic import check_jis_inventory; print(json.dumps(check_jis_inventory(${JSON.stringify(input.part_number)}, ${vinArg})))`;
    return await runPythonLogic(pythonCode);
  }

  @Tool({
    name: 'calculate_station_oee',
    description:
      'Calculate Overall Equipment Effectiveness (OEE) for a station [UI Directive: A visual widget is rendered for this response. Provide ONLY a brief 1-sentence summary. Do not repeat raw sequence lists, VIN tables, or metric lists in markdown text.]',
    inputSchema: z.object({
      station_id: z.string().describe('ID of the station'),
    }),
    invocation: {
      invoking: 'Calculating station OEE...',
      invoked: 'Station OEE calculated',
    },
    examples: {
      request: { station_id: 'STATION_WELDING' },
      response: {
        station_id: 'STATION_WELDING',
        availability: 0.95,
        performance: 0.88,
        quality: 0.99,
        oee_percent: 82.76,
        status: 'RUNNING',
        ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
      },
    },
  })
  @Widget('oee-widget')
  async calculateStationOee(
    input: { station_id: string },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Calculating station OEE', { station_id: input.station_id });
    const pythonCode = `import json; from teammates.dev_b.logic import calculate_station_oee; print(json.dumps(calculate_station_oee(${JSON.stringify(input.station_id)})))`;
    const result = await runPythonLogic(pythonCode);
    return {
      ...result,
      ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
    };
  }

  @Tool({
    name: 'estimate_downtime_cost',
    description:
      'Estimate financial cost of downtime for a stopped station [UI Directive: A visual widget is rendered for this response. Provide ONLY a brief 1-sentence summary. Do not repeat raw sequence lists, VIN tables, or metric lists in markdown text.]',
    inputSchema: z.object({
      stopped_station_id: z.string().optional().describe('ID of the stopped station'),
      station_id: z.string().optional().describe('ID of the stopped station'),
      stationId: z.string().optional().describe('ID of the stopped station'),
    }),
    invocation: {
      invoking: 'Estimating downtime cost...',
      invoked: 'Downtime cost estimated',
    },
    examples: {
      request: { stopped_station_id: 'STATION_PAINT' },
      response: {
        station_id: 'STATION_PAINT',
        stationId: 'STATION_PAINT',
        status: 'MAINTENANCE',
        downtime_minutes: 60,
        estimatedHours: 1,
        estimated_cost: 1320000,
        totalCost: 1320000,
        ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
      },
    },
  })
  @Widget('oee-widget')
  async estimateDowntimeCost(
    input: { stopped_station_id?: string; station_id?: string; stationId?: string },
    ctx: ExecutionContext
  ) {
    const stationId = input.stopped_station_id || input.station_id || input.stationId || 'STATION_PAINT';
    ctx.logger.info('Estimating downtime cost', { stationId });

    const filePath = path.join(process.cwd(), 'data', 'station_oee.json');
    let stations: Record<string, any> = {};
    try {
      if (fs.existsSync(filePath)) {
        stations = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (err) {
      ctx.logger.error('Failed to read station_oee.json', { error: String(err) });
    }

    const station = stations[stationId];
    if (!station) {
      return {
        station_id: stationId,
        stationId: stationId,
        status: 'NOT_FOUND',
        downtime_minutes: 0,
        estimatedHours: 0,
        estimated_cost: 0,
        totalCost: 0,
        ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
      };
    }

    const status = station.status || 'MAINTENANCE';
    const downtimeMinutes = status === 'RUNNING' ? 0 : 60;
    const estimatedHours = downtimeMinutes / 60;
    const totalCost = downtimeMinutes * 22000;

    return {
      station_id: stationId,
      stationId: stationId,
      status: status,
      downtime_minutes: downtimeMinutes,
      estimatedHours: estimatedHours,
      estimated_cost: totalCost,
      totalCost: totalCost,
      ui_hint: 'Rendered in UI widget. Keep text response under 15 words.',
    };
  }
}
