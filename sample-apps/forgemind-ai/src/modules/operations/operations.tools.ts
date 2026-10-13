import { ToolDecorator as Tool, Widget, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { OperationsService } from './operations.service.js';
import { DiagnosticsService } from '../diagnostics/diagnostics.service.js';

@Injectable({ deps: [OperationsService, DiagnosticsService] })
export class OperationsTools {
  constructor(
    private operationsService: OperationsService,
    private diagnosticsService: DiagnosticsService
  ) {}

  @Tool({
    name: 'checkInventory',
    description: 'Check inventory levels for a specific spare part',
    inputSchema: z.object({
      partName: z.string().describe('Name of the part (bearing, lubricant, motor, filter, belt)')
    })
  })
  async checkInventory(
    input: { partName: string },
    ctx: ExecutionContext
  ) {
    const result = this.operationsService.checkInventory(input.partName);
    return result;
  }

  @Tool({
    name: 'recommendMaintenanceWindow',
    description: 'Recommend when to schedule maintenance for a machine based on RUL and production schedule',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)')
    })
  })
  async recommendMaintenanceWindow(
    input: { machineId: string },
    ctx: ExecutionContext
  ) {
    const result = this.operationsService.recommendMaintenanceWindow(input.machineId);
    return result;
  }

  @Tool({
    name: 'simulateScenario',
    description: 'Simulate what-if scenarios: project failure probability and production loss if maintenance is delayed',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)'),
      delayHours: z.number().describe('Number of hours to delay maintenance')
    })
  })
  @Widget('scenario-comparison')
  async simulateScenario(
    input: { machineId: string; delayHours: number },
    ctx: ExecutionContext
  ) {
    const result = this.operationsService.simulateScenario(input.machineId, input.delayHours);
    return result;
  }

  @Tool({
    name: 'recommendProductionReroute',
    description: 'Recommend which machine can absorb the workload if the target machine needs maintenance',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)')
    })
  })
  async recommendProductionReroute(
    input: { machineId: string },
    ctx: ExecutionContext
  ) {
    const result = this.operationsService.recommendProductionReroute(input.machineId);
    return result;
  }

  @Tool({
    name: 'createMaintenanceTicket',
    description: 'Create a maintenance ticket for a machine issue',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)'),
      issue: z.string().describe('Description of the issue'),
      recommendedAction: z.string().describe('Recommended maintenance action'),
      urgency: z.enum(['Low', 'Medium', 'High', 'Critical']).describe('Urgency level')
    })
  })
  async createMaintenanceTicket(
    input: {
      machineId: string;
      issue: string;
      recommendedAction: string;
      urgency: 'Low' | 'Medium' | 'High' | 'Critical';
    },
    ctx: ExecutionContext
  ) {
    const ticket = this.operationsService.createMaintenanceTicket(
      input.machineId,
      input.issue,
      input.recommendedAction,
      input.urgency
    );
    return ticket;
  }

  @Tool({
    name: 'notifySupervisor',
    description: 'Generate a notification message for the supervisor about a machine issue',
    inputSchema: z.object({
      machineId: z.string().describe('Machine ID (M1-M8)'),
      summary: z.string().describe('Summary of the issue and recommended action')
    })
  })
  async notifySupervisor(
    input: { machineId: string; summary: string },
    ctx: ExecutionContext
  ) {
    const result = this.operationsService.notifySupervisor(input.machineId, input.summary);
    return result;
  }

  @Tool({
    name: 'factoryOverview',
    description: 'Get a comprehensive overview of all machines in the factory with their health status and risk levels',
    inputSchema: z.object({})
  })
  @Widget('factory-dashboard')
  async factoryOverview(
    input: Record<string, never>,
    ctx: ExecutionContext
  ) {
    const machineIds = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8'];
    const machines: any[] = [];
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let totalHealthScore = 0;

    for (const machineId of machineIds) {
      const prediction = this.diagnosticsService.predictFailure(machineId);
      const healthScore = this.diagnosticsService.computeHealthScore(machineId);
      const status = this.diagnosticsService.getMachineStatus(machineId);

      totalHealthScore += healthScore.score;

      // Determine riskLevel based on healthScore for consistency
      let riskLevel: 'Healthy' | 'Warning' | 'Critical' = 'Healthy';
      if (healthScore.score >= 80) {
        riskLevel = 'Healthy';
      } else if (healthScore.score >= 60) {
        riskLevel = 'Warning';
      } else {
        riskLevel = 'Critical';
      }

      if (riskLevel === 'Healthy') healthyCount++;
      else if (riskLevel === 'Warning') warningCount++;
      else if (riskLevel === 'Critical') criticalCount++;

      machines.push({
        machineId,
        riskLevel,
        healthScore: healthScore.score,
        estimatedRemainingUsefulLifeHours: prediction.estimatedRemainingUsefulLifeHours,
        confidence: prediction.confidence,
        temperature: status?.temperature || 0,
        vibration: status?.vibration || 0,
        pressure: status?.pressure || 0,
        rpm: status?.rpm || 0
      });
    }

    // Sort by risk level (Critical first, then Warning, then Healthy)
    machines.sort((a, b) => {
      const riskOrder = { Critical: 0, Warning: 1, Healthy: 2 };
      return riskOrder[a.riskLevel as keyof typeof riskOrder] - riskOrder[b.riskLevel as keyof typeof riskOrder];
    });

    const averageHealthScore = Math.round(totalHealthScore / machineIds.length);

    return {
      timestamp: new Date().toISOString(),
      factoryHealthScore: averageHealthScore,
      riskCounts: {
        healthy: healthyCount,
        warning: warningCount,
        critical: criticalCount
      },
      machines,
      summary: `Factory health: ${averageHealthScore}/100. ${criticalCount} critical, ${warningCount} warning, ${healthyCount} healthy.`
    };
  }
}
