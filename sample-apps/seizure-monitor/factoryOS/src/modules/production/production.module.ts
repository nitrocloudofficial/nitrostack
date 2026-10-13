import { Module, ToolDecorator as Tool, Injectable, z } from '@nitrostack/core';
import { ProductionResources } from './production.resources.js';
import { ProductionPrompts } from './production.prompts.js';
import { StateService } from './state.service.js';
import { autonomyLedger } from './autonomy-ledger.service.js';

@Injectable({ deps: [StateService] })
export class ProductionTools {
  constructor(private state: StateService) {}

  @Tool({
    name: 'reroute_production',
    description: 'Reroutes a down machine\'s jobs to another compatible machine (shared produces_parts), or — for a whole-line safety hold — shifts capacity to the other line.',
    inputSchema: z.object({
      fromMachineId: z.string().optional(),
      fromLine: z.string().optional(),
      safetyFlag: z.boolean().optional(),
    }),
  })
  async reroute_production({
    fromMachineId,
    fromLine,
    safetyFlag,
  }: {
    fromMachineId?: string;
    fromLine?: string;
    safetyFlag?: boolean;
  }) {
    const state = this.state.getState();

    // Case 1: whole-line safety hold
    if (fromLine) {
      const line = state.production[fromLine];
      if (!line) return { error: `Line ${fromLine} not found` };

      const otherLineId = Object.keys(state.production).find((id) => id !== fromLine);
      let boosted: string | null = null;
      if (otherLineId) {
        const other = state.production[otherLineId] as any;
        if (!other.base_target_units_per_hr) {
          other.base_target_units_per_hr = other.target_units_per_hr;
        }
        other.target_units_per_hr = Math.round(other.base_target_units_per_hr * 1.2);
        boosted = otherLineId;
      }
      line.status = 'Safety Hold';
      this.state.saveState(state);

      const entry = autonomyLedger.recordAction({
        agentName: 'Production',
        actionType: 'reroute_production',
        inputSummary: `Hold ${fromLine} for safety`,
        decision: boosted
          ? `${fromLine} held; ${boosted} capacity temporarily increased`
          : `${fromLine} held; no other line available to absorb capacity`,
        confidence: 0.8,
        reasoning: 'Safety hold takes precedence; capacity shifted where possible.',
        policyParams: { safetyFlag: true },
      });

      return { fromLine, status: 'LINE_HELD', boostedLine: boosted, autonomyLevel: entry.autonomyLevel };
    }

    // Case 2: single machine reroute
    if (!fromMachineId) return { error: 'Provide fromMachineId or fromLine' };
    const source = state.machines[fromMachineId];
    if (!source) return { error: `Machine ${fromMachineId} not found` };

    const candidate = Object.entries(state.machines)
      .filter(
        ([id, m]) =>
          id !== fromMachineId &&
          m.status === 'Available' &&
          m.produces_parts.some((p) => source.produces_parts.includes(p)),
      )
      .sort(([, a], [, b]) => b.produces_parts.length - a.produces_parts.length)[0];

    if (candidate) {
      const [candidateId, candidateMachine] = candidate;
      candidateMachine.status = 'Running';
      this.state.saveState(state);

      const entry = autonomyLedger.recordAction({
        agentName: 'Production',
        actionType: 'reroute_production',
        inputSummary: `Reroute jobs from ${fromMachineId}`,
        decision: `Rerouted to ${candidateId} (${candidateMachine.name})`,
        confidence: 0.85,
        reasoning: `${candidateId} shares compatible parts and was Available.`,
        policyParams: { safetyFlag: !!safetyFlag },
      });

      return { fromMachineId, reroutedTo: candidateId, status: 'REROUTED', autonomyLevel: entry.autonomyLevel };
    }

    const entry = autonomyLedger.recordAction({
      agentName: 'Production',
      actionType: 'reroute_production',
      inputSummary: `Reroute jobs from ${fromMachineId}`,
      decision: 'No compatible Available machine found — jobs queued',
      confidence: 0.4,
      reasoning: 'No other machine currently shares produces_parts and is Available.',
      policyParams: { safetyFlag: !!safetyFlag },
    });

    return { fromMachineId, reroutedTo: null, status: 'QUEUED_NO_CAPACITY', autonomyLevel: entry.autonomyLevel };
  }
}

@Module({
  name: 'production',
  description: 'FactoryOS Production Scheduling & Rerouting Module',
  controllers: [ProductionTools, ProductionResources, ProductionPrompts],
  providers: [StateService],
})
export class ProductionModule {}
