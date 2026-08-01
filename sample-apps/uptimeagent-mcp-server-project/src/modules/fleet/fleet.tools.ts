import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { getMachine, getMachineHistory, getManualEntryForSensor } from './fleet.data.js';
import { analyzeSensors, predictFailureWindow } from './fleet.analysis.js';
import type { Severity } from './fleet.types.js';

function requireMachine(machineId: string) {
  const machine = getMachine(machineId);
  const history = getMachineHistory(machineId);
  if (!machine || !history) {
    throw new Error(`Unknown machineId "${machineId}". Call the fleet://machines resource to see valid ids (e.g. "engine-01").`);
  }
  return { machine, history };
}

/** Combines anomaly severity and remaining useful life into a single urgency level. */
function computeUrgency(severity: Severity, remainingDays: number | null): 'routine' | 'medium' | 'high' | 'critical' {
  if (severity === 'none') return 'routine';
  if (severity === 'high' || (remainingDays !== null && remainingDays <= 7)) return 'critical';
  if (severity === 'moderate' || (remainingDays !== null && remainingDays <= 30)) return 'high';
  return 'medium';
}

export class FleetTools {
  @Tool({
    name: 'analyze_sensor_reading',
    description:
      'Step 1 of 3 in the predictive-maintenance workflow for a machine. ' +
      'Pulls the most recent sensor readings for a machine and compares them against that machine\'s own healthy baseline to detect anomalies. ' +
      'Returns anomaly true/false, severity (low/moderate/high), and which sensor(s) triggered it. ' +
      'REQUIRED FOLLOW-UP: if anomaly is true, you must immediately continue the workflow by calling predict_failure_window with the same machineId (step 2 of 3) — do not stop here and do not just summarize these raw readings in prose, the workflow is not complete until the failure window has been assessed.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: z.object({
      machineId: z.string().describe('Machine/engine id, e.g. "engine-03"')
    }),
    examples: {
      request: { machineId: 'engine-03' },
      response: {
        machineId: 'engine-03',
        anomaly: true,
        severity: 'high',
        triggeredSensors: [{ sensor: 'rotationalSpeed', unit: 'rpm', currentValue: 8255.3, baselineMean: 8138.4, zScore: 34.5, severity: 'high' }],
        summary: 'engine-03 shows high severity anomalies in rotationalSpeed, pressure, temperature, deviating from its own healthy baseline.'
      }
    }
  })
  async analyzeSensorReading(input: { machineId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Analyzing sensor reading', { machineId: input.machineId });
    const { history } = requireMachine(input.machineId);
    return analyzeSensors(input.machineId, history);
  }

  @Tool({
    name: 'predict_failure_window',
    description:
      'Step 2 of 3 in the predictive-maintenance workflow for a machine. ' +
      'Estimates the remaining useful life (in cycles/days) before a machine reaches critical failure risk, by fitting a trend line to its recent sensor readings. ' +
      'Call this immediately after analyze_sensor_reading reports anomaly: true for the same machineId — this is a required follow-up, not optional. ' +
      'REQUIRED FOLLOW-UP: if the original severity was moderate or high, you must immediately continue by calling generate_work_order for the same machineId (step 3 of 3, the final step) to produce the actionable maintenance ticket — do this even if this tool\'s remaining-life estimate comes back inconclusive (confidence: "low" or remainingCycles: null), since high severity alone already warrants a work order. The workflow is not complete until generate_work_order has been called.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    inputSchema: z.object({
      machineId: z.string().describe('Machine/engine id, e.g. "engine-03"')
    }),
    examples: {
      request: { machineId: 'engine-03' },
      response: {
        machineId: 'engine-03',
        atRisk: true,
        remainingCycles: 12,
        remainingDays: 12,
        drivingSensor: 'rotationalSpeed',
        confidence: 'high',
        summary: 'Based on the rotationalSpeed trend, engine-03 is projected to reach critical failure risk in approximately 12 cycles (~12 days), with high confidence.'
      }
    }
  })
  async predictFailureWindowTool(input: { machineId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Predicting failure window', { machineId: input.machineId });
    const { history } = requireMachine(input.machineId);
    const analysis = analyzeSensors(input.machineId, history);
    return predictFailureWindow(input.machineId, history, analysis);
  }

  @Tool({
    name: 'generate_work_order',
    description:
      'Step 3 of 3 (final step) in the predictive-maintenance workflow for a machine. ' +
      'Creates a structured maintenance work order by combining anomaly analysis and failure-window prediction with the maintenance manual\'s recommended repair actions. ' +
      'Produces machine id, issue description, urgency level, recommended action(s), and estimated remaining life. ' +
      'This is the actionable deliverable the user actually wants whenever a machine shows moderate or high severity anomalies — do not substitute your own prose summary for calling this tool. ' +
      'This is a read-only reporting tool: it only computes and returns a JSON ticket, it does not file, submit, or persist anything to any external system, so it never needs user confirmation before being called. ' +
      'Safe to call directly for any machineId — it re-runs the analysis and prediction internally, so it never depends on prior tool calls having happened.',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    },
    inputSchema: z.object({
      machineId: z.string().describe('Machine/engine id, e.g. "engine-03"')
    }),
    examples: {
      request: { machineId: 'engine-03' },
      response: {
        ticketId: 'WO-engine-03-000001',
        machineId: 'engine-03',
        machineName: 'Engine 3',
        urgencyLevel: 'critical',
        issueDescription: 'High severity anomalies in rotationalSpeed, pressure, temperature.',
        recommendedActions: ['Inspect drive-train and fuel control unit; recalibrate governor.'],
        estimatedRemainingLife: { cycles: 12, days: 12, confidence: 'high' }
      }
    }
  })
  @Widget('work-order')
  async generateWorkOrder(input: { machineId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating work order', { machineId: input.machineId });
    const { machine, history } = requireMachine(input.machineId);

    const analysis = analyzeSensors(input.machineId, history);
    const prediction = predictFailureWindow(input.machineId, history, analysis);
    const urgencyLevel = computeUrgency(analysis.severity, prediction.remainingDays);

    if (!analysis.anomaly) {
      return {
        ticketId: `WO-${input.machineId}-${Date.now()}`,
        machineId: machine.id,
        machineName: machine.name,
        generatedAt: new Date().toISOString(),
        urgencyLevel,
        issueDescription: 'No anomaly detected. Machine is operating within normal baseline parameters.',
        recommendedActions: ['No action required. Continue routine monitoring.'],
        estimatedRemainingLife: { cycles: null, days: null, confidence: null },
        analysis,
        prediction
      };
    }

    const recommendedActions = analysis.triggeredSensors
      .map(t => getManualEntryForSensor(t.sensor))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .map(entry => entry.recommendedAction);

    const issueDescription = `${analysis.severity} severity anomalies in ${analysis.triggeredSensors.map(t => t.sensor).join(', ')}.` +
      (prediction.atRisk && prediction.remainingDays !== null
        ? ` Projected to reach critical failure risk in ~${prediction.remainingDays} days (driven by ${prediction.drivingSensor}).`
        : '');

    return {
      ticketId: `WO-${input.machineId}-${Date.now()}`,
      machineId: machine.id,
      machineName: machine.name,
      generatedAt: new Date().toISOString(),
      urgencyLevel,
      issueDescription,
      recommendedActions: recommendedActions.length > 0 ? recommendedActions : ['Inspect machine; no specific manual entry matched.'],
      estimatedRemainingLife: {
        cycles: prediction.remainingCycles,
        days: prediction.remainingDays,
        confidence: prediction.confidence
      },
      analysis,
      prediction
    };
  }
}
