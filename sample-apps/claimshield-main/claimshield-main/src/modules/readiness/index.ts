import { Module, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { INCIDENTS_DB } from '../incidents/index.js';
import { DISCLAIMER } from '../fixtures/data.js';
import { Incident, ClaimReadinessResult } from '../fixtures/types.js';
import { determineDocuments } from '../documents/index.js';

import { runDenialRiskEngine } from '../../engine/denial-rules.engine.js';

@Injectable()
export class ReadinessTools {
  @Tool({
    name: 'evaluate_claim_readiness',
    description: 'Create a transparent deterministic readiness assessment based on incident data.',
    inputSchema: z.object({
      incidentId: z.string(),
    }) as any
  })
  async evaluateClaimReadiness(input: { incidentId: string }) {
    const incident = INCIDENTS_DB.get(input.incidentId);
    if (!incident) throw new Error("Incident not found");

    const result = runDenialRiskEngine(incident);
    incident.riskResult = result;
    return { incidentId: input.incidentId, ...result, suggestedNextTool: 'create_action_plan', disclaimer: DISCLAIMER };
  }
}

@Module({
  name: 'ReadinessModule',
  controllers: [ReadinessTools]
})
export class ReadinessModule {}
