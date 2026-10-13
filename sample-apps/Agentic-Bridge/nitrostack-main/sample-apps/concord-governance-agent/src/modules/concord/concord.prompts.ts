import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { getState } from '../../state/state.js';

export class ConcordPrompts {
  @Prompt({
    name: 'incident_briefing_template',
    description: 'Generates a structured governance briefing for a proposed high-risk action, including cross-domain context and any detected conflicts.',
    arguments: [
      { name: 'role',        description: 'IAM role of the requester',            required: true  },
      { name: 'tool_name',   description: 'Name of the high-risk tool proposed',  required: true  },
      { name: 'params',      description: 'JSON-encoded parameters for the tool', required: true  },
      { name: 'conflict',    description: 'JSON-encoded conflict object or null', required: false }
    ]
  })
  async incidentBriefing(args: { role: string; tool_name: string; params: string; conflict?: string }, ctx: ExecutionContext) {
    const params  = JSON.parse(args.params  || '{}');
    const conflict = args.conflict ? JSON.parse(args.conflict) : null;
    const state   = getState();

    const devopsSummary = state.devops.clusters.map(c => `${c.id}: ${c.status}`).join(', ');
    const secSummary    = state.secops.threats.map(t => `${t.id}(${t.severity})`).join(', ') || 'none';
    const finSummary    = state.finops.ledgers.map(l => `${l.department}: ₹${l.budget.toLocaleString()}`).join(', ');

    let briefing = `Requested by: ${args.role}\nAction: ${args.tool_name}(${JSON.stringify(params)})\n\n`;
    briefing    += `Relevant state:\n`;
    briefing    += `- DevOps clusters: ${devopsSummary}\n`;
    briefing    += `- SecOps threats: ${secSummary}\n`;
    briefing    += `- FinOps budgets: ${finSummary}\n`;

    if (conflict?.has_conflict) {
      briefing += `\n⚠️  Conflict detected: ${conflict.message}`;
    }

    return {
      messages: [
        {
          role: 'user' as const,
          content: `You are Concord, a cross-departmental governance agent. Review this proposed action and provide your assessment:\n\n${briefing}`
        }
      ]
    };
  }
}
