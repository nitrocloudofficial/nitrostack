import { Module, ToolDecorator as Tool, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { INCIDENTS_DB } from '../incidents/index.js';
import { runDenialRiskEngine } from '../../engine/denial-rules.engine.js';
import { determineDocuments } from '../documents/index.js';
import { ActionItem } from '../fixtures/types.js';
import { DISCLAIMER } from '../fixtures/data.js';

export const ACTIONS_DB = new Map<string, ActionItem[]>();

function generateActions(incidentId: string): Omit<ActionItem, 'id'>[] {
  const incident = INCIDENTS_DB.get(incidentId);
  if (!incident) return [];

  if (!incident.riskResult) {
    incident.riskResult = runDenialRiskEngine(incident);
  }

  const actions: Omit<ActionItem, 'id'>[] = [];
  const factors = incident.riskResult.riskFactors || [];

  for (const factor of factors) {
    let priority: 'critical' | 'high' | 'medium' = 'medium';
    if (factor.severity === 'FATAL' || factor.severity === 'CRITICAL') priority = 'critical';
    else if (factor.severity === 'HIGH') priority = 'high';

    actions.push({
      incidentId,
      title: factor.fix,
      priority,
      deadlineText: 'ASAP',
      owner: 'User',
      status: 'open',
      reason: factor.regulation
    });
  }

  return actions;
}

@Injectable()
export class ActionsTools {
  @Tool({
    name: 'create_action_plan',
    description: 'Generate and save prioritized actions based on a readiness result.',
    inputSchema: z.object({
      incidentId: z.string(),
      userApproved: z.boolean().describe('If true, saves actions. If false, returns a preview.'),
    }) as any
  })
  async createActionPlan(input: { incidentId: string; userApproved: boolean }) {
    const incident = INCIDENTS_DB.get(input.incidentId);
    if (!incident) throw new Error("Incident not found");

    const draftedActions = generateActions(input.incidentId);
    const actionsWithIds: ActionItem[] = draftedActions.map(a => ({ id: Math.random().toString(36).substring(2, 9), ...a }));

    if (input.userApproved) {
      ACTIONS_DB.set(input.incidentId, actionsWithIds);
      return { actions: actionsWithIds, approvalRequired: false, message: 'Actions saved successfully.', disclaimer: DISCLAIMER };
    } else {
      return { actions: actionsWithIds, approvalRequired: true, message: 'Preview only. Re-run with userApproved: true to save.', disclaimer: DISCLAIMER };
    }
  }

  @Tool({
    name: 'generate_family_update',
    description: 'Create a plain-language, copyable message draft based on incident status and action plan.',
    inputSchema: z.object({
      incidentId: z.string(),
      tone: z.enum(['calm', 'formal', 'short']),
    }) as any
  })
  async generateFamilyUpdate(input: { incidentId: string; tone: 'calm' | 'formal' | 'short' }) {
    const incident = INCIDENTS_DB.get(input.incidentId);
    if (!incident) throw new Error("Incident not found");

    const actions = ACTIONS_DB.get(input.incidentId) || generateActions(input.incidentId);
    const openActionsCount = actions.filter(a => a.status === 'open').length;

    let draft = '';
    if (input.tone === 'calm') draft = `Hi everyone, just a quick update. We had a minor incident at ${incident.location} on ${incident.incidentDate}, but everyone is safe. We have ${openActionsCount} things left to organize for the documentation. Will keep you posted!`;
    else if (input.tone === 'formal') draft = `Update regarding the incident on ${incident.incidentDate} at ${incident.location}: The situation is stable. There are currently ${openActionsCount} pending tasks to complete the documentation requirements. Further updates will follow.`;
    else draft = `Incident on ${incident.incidentDate} at ${incident.location}. ${openActionsCount} actions remaining. Everyone safe.`;

    return { messageDraft: draft, keyFactsIncluded: ['incidentDate', 'location', 'openActionsCount'], notice: 'NO MESSAGE WAS SENT. This is a draft only.', disclaimer: DISCLAIMER };
  }

  @Tool({
    name: 'generate_appeal_letter',
    description: 'Generates a formal appeal letter for claim denial using cited regulations.',
    inputSchema: z.object({
      incidentId: z.string(),
    }) as any
  })
  async generateAppealLetter(input: { incidentId: string }) {
    const incident = INCIDENTS_DB.get(input.incidentId);
    if (!incident) throw new Error("Incident not found");

    if (!incident.riskResult) {
      incident.riskResult = runDenialRiskEngine(incident);
    }

    const factors = incident.riskResult.riskFactors || [];
    const policy = incident.policyNumber || 'UNKNOWN_POLICY';
    const dateStr = new Date(incident.incidentDate || incident.createdAt).toDateString();
    
    let letter = `To the Claims Department,\n\nI am writing to formally appeal the assessment regarding my claim for the incident on ${dateStr} under policy ${policy}.\n\nI understand there are missing elements, but I am taking the following corrective actions based on IRDA and legal regulations:\n\n`;
    
    const citedRegulations: string[] = [];
    let hasFatal = false;

    for (const factor of factors) {
      letter += `- ${factor.title} (${factor.regulation}):\n  Action taken/to be taken: ${factor.fix}\n\n`;
      citedRegulations.push(factor.regulation);
      if (factor.severity === 'FATAL') hasFatal = true;
    }

    letter += `Please reconsider my claim as I am addressing these fixable factors. I await your prompt response.\n\nSincerely,\n[Your Name]`;

    let appealStrength: 'STRONG' | 'MODERATE' | 'WEAK' = 'MODERATE';
    if (hasFatal) appealStrength = 'WEAK';
    else if (factors.every(f => f.fixable)) appealStrength = 'STRONG';

    return { letter, citedRegulations, appealStrength };
  }
}

@Module({
  name: 'ActionsModule',
  controllers: [ActionsTools]
})
export class ActionsModule {}
