import { ControllerDecorator as Controller, ToolDecorator as Tool, z, type ExecutionContext } from '@nitrostack/core';
import {
  findOrCreateCustomer,
  getOwnersForCategory,
  getCurrentLoad,
  createAssignment,
} from '../db.js';

/**
 * AGENT: Classifier & Assignment Agent
 * Labels the issue by category, checks the owner's current load against a
 * max threshold, and either assigns to them or overflows to the next
 * available owner in that category.
 */
export const LABELS = [
  'Billing',
  'Technical Bug',
  'Onboarding',
  'Feature Request',
  'Account/Security',
] as const;
export type Label = (typeof LABELS)[number];

const KEYWORD_MAP: Record<Label, string[]> = {
  Billing: ['invoice', 'charge', 'payment', 'refund', 'billing', 'subscription', 'price'],
  'Technical Bug': ['error', 'bug', 'crash', 'broken', 'not working', 'exception', '500', 'fails'],
  Onboarding: ['setup', 'onboarding', 'get started', 'how do i', 'configure', 'first time'],
  'Feature Request': ['feature', 'would be nice', 'can you add', 'request', 'suggestion'],
  'Account/Security': ['login', 'password', 'account', 'security', 'locked out', '2fa', 'breach'],
};

function classify(text: string): Label {
  const lower = text.toLowerCase();
  let best: Label = 'Technical Bug';
  let bestHits = 0;
  for (const label of LABELS) {
    const hits = KEYWORD_MAP[label].filter((kw) => lower.includes(kw)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = label;
    }
  }
  return best;
}

@Controller('classify')
export class ClassifierController {
  @Tool({
    name: 'classify_and_assign',
    description:
      'Classify an issue into a label (Billing, Technical Bug, Onboarding, Feature Request, Account/Security) and assign it to an available owner for that category, overflowing to the next owner if the primary is at max load.',
    inputSchema: z.object({
      customerName: z.string(),
      issueText: z.string().describe('The raw text of the issue/ticket/message to classify'),
      riskScore: z.number().min(1).max(10).optional(),
    }),
  })
  async classifyAndAssign(
    input: { customerName: string; issueText: string; riskScore?: number },
    ctx: ExecutionContext
  ) {
    const label = classify(input.issueText);
    const customer = await findOrCreateCustomer(input.customerName);
    const owners = await getOwnersForCategory(label);

    if (owners.length === 0) {
      return { label, assigned: null, error: `No owners configured for category "${label}"` };
    }

    let chosen = owners[0];
    let overflowed = false;
    for (const owner of owners) {
      const load = await getCurrentLoad(owner.id);
      if (load < owner.max_load) {
        chosen = owner;
        overflowed = owner.id !== owners[0].id;
        break;
      }
    }

    const assignmentId = await createAssignment(customer.id, chosen.id, label, input.riskScore ?? 5);

    ctx.logger.info('Assigned issue', { customer: customer.name, label, owner: chosen.name });

    return {
      label,
      assignmentId,
      assignedTo: chosen.name,
      overflowed,
      currentLoad: await getCurrentLoad(chosen.id),
      maxLoad: chosen.max_load,
    };
  }
}
