import { ToolDecorator as Tool, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { DiagnosticsService } from './diagnostics.service.js';

@Injectable({ deps: [DiagnosticsService] })
export class DiagnosticsTools {
  constructor(private diagnosticsService: DiagnosticsService) {}

  @Tool({
    name: 'getMachineStatus',
    description: 'Get the latest sensor reading for a specific machine',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)')
    })
  })
  async getMachineStatus(
    input: { machineId: string },
    ctx: ExecutionContext
  ) {
    const status = this.diagnosticsService.getMachineStatus(input.machineId);
    if (!status) {
      return {
        error: `Machine ${input.machineId} not found`,
        machineId: input.machineId
      };
    }
    return {
      machineId: input.machineId,
      ...status
    };
  }

  @Tool({
    name: 'getMachineHistory',
    description: 'Get historical sensor readings for a machine over a specified time period',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)'),
      hours: z.number().optional().describe('Number of hours of history (default: 24)')
    })
  })
  async getMachineHistory(
    input: { machineId: string; hours?: number },
    ctx: ExecutionContext
  ) {
    const history = this.diagnosticsService.getMachineHistory(
      input.machineId,
      input.hours || 24
    );
    if (history.length === 0) {
      return {
        error: `No history found for machine ${input.machineId}`,
        machineId: input.machineId
      };
    }
    return {
      machineId: input.machineId,
      hoursRequested: input.hours || 24,
      readingsCount: history.length,
      history
    };
  }

  @Tool({
    name: 'computeHealthScore',
    description: 'Calculate the health score (0-100) for a machine based on all sensor parameters',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)')
    })
  })
  async computeHealthScore(
    input: { machineId: string },
    ctx: ExecutionContext
  ) {
    const result = this.diagnosticsService.computeHealthScore(input.machineId);
    if (result.score === 0 && result.scoreHistory.length === 0) {
      return {
        error: `Machine ${input.machineId} not found`,
        machineId: input.machineId
      };
    }
    return {
      machineId: input.machineId,
      ...result
    };
  }

  @Tool({
    name: 'predictFailure',
    description: 'Predict failure risk and remaining useful life for a machine',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)')
    })
  })
  async predictFailure(
    input: { machineId: string },
    ctx: ExecutionContext
  ) {
    const result = this.diagnosticsService.predictFailure(input.machineId);
    return {
      machineId: input.machineId,
      ...result
    };
  }

  @Tool({
    name: 'rootCauseAnalysis',
    description: 'Analyze sensor patterns to identify the root cause of machine degradation',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)')
    })
  })
  async rootCauseAnalysis(
    input: { machineId: string },
    ctx: ExecutionContext
  ) {
    const result = this.diagnosticsService.rootCauseAnalysis(input.machineId);
    return {
      machineId: input.machineId,
      ...result
    };
  }
}
