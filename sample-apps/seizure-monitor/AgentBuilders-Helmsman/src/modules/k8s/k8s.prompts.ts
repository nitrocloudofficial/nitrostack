import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { getActionLog } from './audit.js';

export class K8sPrompts {
  @Prompt({
    name: 'cluster_health_brief',
    description: 'Executive cluster health + cost brief for the platform lead.',
    arguments: [{ name: 'lead_name', description: 'Who to address', required: false }],
  })
  async healthBrief(args: { lead_name?: string }, _ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `You are the HelmsMan platform analyst. First call get_cluster_state and get_pod_health, then write a
brief for ${args.lead_name ?? 'the Platform Lead'} using these headers:
## Posture (one line: healthy/degraded)
## Cost (total est INR/hr, and any over-provisioned deployments)
## Risks (pods not Ready, restart storms, cordoned nodes)
## Recommendation (one right-sizing or reliability action)
Use only real tool data. Do not invent numbers.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'change_record',
    description: 'Turn the remediation audit log into a formal change record, highlighting vetoes.',
    arguments: [],
  })
  async changeRecord(_args: {}, _ctx: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Produce a change record from this audit log. Headers:
## Executed Changes (action, target, rationale)
## Blocked Changes (action, target, and the exact PDB/policy veto reason — emphasize availability protection)
## Net Effect (replicas/cost before vs after)
Audit log JSON:
${JSON.stringify(getActionLog(), null, 2)}`,
        },
      },
    ];
  }
}
