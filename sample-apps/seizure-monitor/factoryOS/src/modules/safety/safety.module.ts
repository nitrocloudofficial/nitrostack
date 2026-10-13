import { Module, ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { SafetyResources } from './safety.resources.js';
import { SafetyPrompts } from './safety.prompts.js';
import { StateService } from './state.service.js';
import { autonomyLedger } from './autonomy-ledger.service.js';

@Injectable({ deps: [StateService] })
export class SafetyTools {
  constructor(private state: StateService) {}

  @Tool({
    name: 'generate_safety_report',
    description: 'Generates a safety report for a machine or line, and updates the shared safety compliance status.',
    inputSchema: z.object({
      machineId: z.string().optional(),
      line: z.string().optional(),
      riskLevel: z.number().min(1).max(10).optional(),
      likelyCause: z.string().optional(),
    }),
  })
  async generate_safety_report({
    machineId,
    line,
    riskLevel,
    likelyCause,
  }: {
    machineId?: string;
    line?: string;
    riskLevel?: number;
    likelyCause?: string;
  }) {
    const state = this.state.getState();
    const isEscalation = (riskLevel ?? 0) >= 8;

    if (isEscalation) {
      state.safety.open_incidents += 1;
      state.safety.last_incident_date = new Date().toISOString().slice(0, 10);
      state.safety.compliance_status = 'Yellow';
      this.state.saveState(state);
    }

    const summary =
      `Safety assessment for ${machineId ?? line ?? 'factory'}: ` +
      `risk level ${riskLevel ?? 'N/A'}${likelyCause ? `, likely cause: ${likelyCause}` : ''}. ` +
      (isEscalation ? 'Incident logged, compliance status updated to Yellow.' : 'No escalation required.');

    autonomyLedger.recordAction({
      agentName: 'Safety',
      actionType: 'generate_safety_report',
      inputSummary: `Safety report for ${machineId ?? line ?? 'factory'}`,
      decision: isEscalation ? 'Incident logged' : 'No incident logged',
      confidence: 1,
      reasoning: summary,
      policyParams: {},
    });

    return {
      machineId: machineId ?? null,
      line: line ?? null,
      generatedAt: new Date().toISOString(),
      riskLevel: riskLevel ?? null,
      likelyCause: likelyCause ?? null,
      summary,
      complianceStatus: state.safety.compliance_status,
    };
  }

  @Tool({
    name: 'create_incident_timeline',
    description: 'Creates a chronological incident timeline entry for audit/compliance purposes.',
    inputSchema: z.object({
      machineId: z.string().optional(),
      note: z.string(),
    }),
  })
  async create_incident_timeline({ machineId, note }: { machineId?: string; note: string }) {
    const timelineEntry = {
      machineId: machineId ?? null,
      timestamp: new Date().toISOString(),
      note,
    };

    autonomyLedger.recordAction({
      agentName: 'Safety',
      actionType: 'create_incident_timeline',
      inputSummary: `Timeline entry for ${machineId ?? 'factory'}`,
      decision: note,
      confidence: 1,
      reasoning: 'Audit log entry — no real-world action taken, record only.',
      policyParams: {},
    });

    return timelineEntry;
  }
}

@Module({
  name: 'safety',
  description: 'FactoryOS Safety & EHS Hazard Assessment Module',
  controllers: [SafetyTools, SafetyResources, SafetyPrompts],
  providers: [StateService],
})
export class SafetyModule {}
