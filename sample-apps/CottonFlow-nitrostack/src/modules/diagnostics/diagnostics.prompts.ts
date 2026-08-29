import { PromptDecorator as Prompt, ExecutionContext, Injectable } from '@nitrostack/core';
import { FactoryStateService } from './factory-state.service.js';

/**
 * Diagnostics Prompts
 * 
 * Provides reusable prompt templates for factory operations:
 * - daily-risk-briefing: Summarize all active risks
 * - incident-response-plan: Generate coordinated response plan
 * - shift-handover-report: Summarize status for next shift
 */
@Injectable({ deps: [FactoryStateService] })
export class DiagnosticsPrompts {
  constructor(private factoryState: FactoryStateService) {}

  /**
   * Prompt: daily-risk-briefing
   * Summarizes all active risks across the factory
   */
  @Prompt({
    name: 'daily-risk-briefing',
    description: 'Generate a daily risk briefing summarizing all active risks across the factory',
  })
  async dailyRiskBriefing(args: Record<string, unknown>, context: ExecutionContext) {
    context.logger.info('Generating daily risk briefing');

    const machines = this.factoryState.getAllMachines();
    const lines = this.factoryState.getAllLines();
    const orders = this.factoryState.getActiveOrders();
    const zones = this.factoryState.getAllZones();

    // Identify risks
    const machineRisks = machines.filter(m => m.vibration > 5 || m.temperature > 75);
    const lineRisks = lines.filter(l => l.yarnBreakageRate > 2.5);
    const humidityRisks = zones.filter(z => z.currentHumidity < 50);
    const urgentOrders = orders.filter(o => o.priority === 'high');

    const briefing = `
# Daily Risk Briefing

## Executive Summary
Factory status: ${machineRisks.length > 0 || lineRisks.length > 0 ? 'RISKS DETECTED' : 'NORMAL'}

## Machine Health Risks (${machineRisks.length})
${machineRisks.map(m => `- ${m.name} (${m.id}): Vibration ${m.vibration}mm/s, Temp ${m.temperature}°C, Failure window: ${m.predictedFailureWindow ? m.predictedFailureWindow + ' min' : 'N/A'}`).join('\n') || 'No critical machine risks'}

## Production Line Risks (${lineRisks.length})
${lineRisks.map(l => `- ${l.name} (${l.id}): Yarn breakage rate ${l.yarnBreakageRate}% (${l.yarnBreakageTrend})`).join('\n') || 'No critical line risks'}

## Environmental Risks (${humidityRisks.length})
${humidityRisks.map(z => `- ${z.name} (${z.id}): Humidity ${z.currentHumidity}% (target: ${z.targetHumidity}%)`).join('\n') || 'Environmental conditions normal'}

## Urgent Orders at Risk (${urgentOrders.length})
${urgentOrders.map(o => `- ${o.id} (${o.customerName}): Due ${o.dueDate}, Currently on ${o.lineId || 'QUEUED'}`).join('\n') || 'No urgent orders at risk'}

## Recommended Actions
1. Monitor machines with rising vibration trends
2. Adjust humidity in affected zones
3. Prioritize maintenance for critical machines
4. Ensure urgent orders have healthy production lines
`;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: briefing,
        },
      },
    ];
  }

  /**
   * Prompt: incident-response-plan
   * Generates a coordinated multi-department response plan for an incident
   */
  @Prompt({
    name: 'incident-response-plan',
    description: 'Generate a coordinated incident response plan given incident details',
  })
  async incidentResponsePlan(args: Record<string, unknown>, context: ExecutionContext) {
    context.logger.info('Generating incident response plan');

    const machineId = (args.machineId as string) || 'M-12';
    const zoneId = (args.zoneId as string) || 'zone-1';
    const orderId = (args.orderId as string) || 'ORD-2026-001';

    const machine = this.factoryState.getMachineHealth(machineId);
    const zone = this.factoryState.getZoneEnvironment(zoneId);
    const order = this.factoryState.getOrder(orderId);

    const plan = `
# Incident Response Plan

## Incident Summary
- **Machine**: ${machine?.name || machineId} (Vibration: ${machine?.vibration || 'N/A'}mm/s)
- **Zone**: ${zone?.name || zoneId} (Humidity: ${zone?.currentHumidity || 'N/A'}%)
- **Affected Order**: ${order?.id || orderId} (${order?.customerName || 'Unknown'})

## Coordinated Response Actions

### 1. Production Department
- **Action**: Reassign batch from ${machineId} to healthy line
- **Target Line**: L-2 (healthy, available capacity)
- **Timeline**: Immediate
- **Owner**: Production Manager

### 2. Maintenance Department
- **Action**: Create high-priority work order for ${machineId}
- **Issue Type**: Bearing replacement (vibration spike)
- **Spare Part**: SP-001 (Bearing Assembly) - ${this.factoryState.getSparePart('SP-001')?.quantity || 0} in stock
- **Timeline**: Within 30 minutes
- **Owner**: Maintenance Lead

### 3. Environmental Control
- **Action**: Adjust humidity in ${zone?.name || zoneId}
- **Current**: ${zone?.currentHumidity || 'N/A'}%
- **Target**: ${zone?.targetHumidity || 55}%
- **Method**: Activate humidifier system
- **Timeline**: Immediate
- **Owner**: Facilities Manager

### 4. Customer Relations
- **Action**: Update delivery estimate for ${order?.id || orderId}
- **Current ETA**: ${order?.currentEta || 'N/A'}
- **New ETA**: +2 hours (contingency)
- **Communication**: Notify customer of temporary delay
- **Owner**: Sales Manager

### 5. Quality Assurance
- **Action**: Inspect yarn from affected batch
- **Focus**: Breakage rate, fiber quality
- **Timeline**: Concurrent with reassignment
- **Owner**: QA Lead

## Success Criteria
✓ Batch reassigned to healthy line
✓ Maintenance work order created
✓ Humidity restored to target range
✓ Customer notified with revised ETA
✓ No production downtime

## Escalation Path
If any action fails:
1. Notify Plant Manager immediately
2. Activate backup production line
3. Consider emergency maintenance contractor
`;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: plan,
        },
      },
    ];
  }

  /**
   * Prompt: shift-handover-report
   * Summarizes factory status for shift handover
   */
  @Prompt({
    name: 'shift-handover-report',
    description: 'Generate a shift handover report summarizing current status and watch items',
  })
  async shiftHandoverReport(args: Record<string, unknown>, context: ExecutionContext) {
    context.logger.info('Generating shift handover report');

    const machines = this.factoryState.getAllMachines();
    const lines = this.factoryState.getAllLines();
    const orders = this.factoryState.getActiveOrders();

    const healthyMachines = machines.filter(m => m.vibration < 5);
    const warningMachines = machines.filter(m => m.vibration >= 5 && m.vibration < 7);
    const criticalMachines = machines.filter(m => m.vibration >= 7);

    const report = `
# Shift Handover Report

## Shift Summary
- **Timestamp**: ${new Date().toISOString()}
- **Total Machines**: ${machines.length}
- **Total Lines**: ${lines.length}
- **Active Orders**: ${orders.length}

## Machine Status Overview
- **Healthy**: ${healthyMachines.length} machines
- **Warning**: ${warningMachines.length} machines
- **Critical**: ${criticalMachines.length} machines

### Critical Machines (Immediate Attention Required)
${criticalMachines.map(m => `- ${m.name} (${m.id}): Vibration ${m.vibration}mm/s, Failure window: ${m.predictedFailureWindow} min`).join('\n') || 'None'}

### Warning Machines (Monitor Closely)
${warningMachines.map(m => `- ${m.name} (${m.id}): Vibration ${m.vibration}mm/s, Trend: ${m.vibrationTrend}`).join('\n') || 'None'}

## Production Status
${lines.map(l => `- ${l.name}: Breakage rate ${l.yarnBreakageRate}% (${l.yarnBreakageTrend}), Batch: ${l.currentBatchId}`).join('\n')}

## Active Orders
${orders.map(o => `- ${o.id} (${o.customerName}): Priority ${o.priority}, Due ${o.dueDate}, ETA ${o.currentEta}`).join('\n')}

## Watch Items for Next Shift
1. Monitor vibration on critical machines
2. Check humidity levels in all zones
3. Track yarn breakage rates on Line 1
4. Verify maintenance work orders are completed
5. Confirm spare parts inventory levels

## Handover Notes
- All systems operational
- No emergency shutdowns required
- Maintenance team on standby for critical machines
- Customer communications up to date

---
**Prepared by**: Outgoing Shift Lead
**Received by**: Incoming Shift Lead
`;

    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: report,
        },
      },
    ];
  }
}
