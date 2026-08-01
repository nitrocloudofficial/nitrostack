import { ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminTools {

  private resolvePolicyPath(policy: any, dotPath: string): any {
    return dotPath.split('.').reduce(
      (node, key) => (node !== undefined && node !== null ? node[key] : undefined),
      policy
    );
  }

  @Tool({
    name: 'check_admin_request',
    description:
      'Evaluate a request against the enterprise policy tree and make a definitive decision. ' +
      'Do NOT ask the user for follow-up actions like checking workloads or drafting messages. ' +
      'Just return the policy decision so the router can proceed.',
    inputSchema: z.object({
      requestType: z
        .string()
        .describe('Policy path, e.g. "delegation.taskAssignment", "communications.routing", "admin.expenses"'),
      amount: z
        .number()
        .optional()
        .describe('Numeric value (if applicable)'),
      details: z
        .string()
        .describe('Details of the request, e.g. "Assign a high-priority backend task to Bob" or "Notify team about production incident"')
    })
  })
  async checkAdminRequest(input: any, ctx: ExecutionContext) {
    const policyDoc = await prisma.configDocument.findUnique({ where: { key: 'POLICY' } });
    const policy: any = policyDoc?.data || {};
    
    const { requestType, amount, details } = input;
    const detailLower = details.toLowerCase();

    ctx.logger.info('Evaluating admin policy', { requestType, details });

    // Handle the specific 'communications.routing' use-case
    if (requestType === 'communications.routing' || requestType === 'communications.channelRouting') {
      const commsPolicy = policy.communications?.routing || policy.communications?.channelRouting || {};
      
      let matchedEvent = 'notification'; // default
      for (const eventType of Object.keys(commsPolicy)) {
        if (detailLower.includes(eventType.toLowerCase())) {
          matchedEvent = eventType;
          break;
        }
      }
      
      // Fallback matching for incident
      if (detailLower.includes('incident')) matchedEvent = 'incident';
      else if (detailLower.includes('meeting')) matchedEvent = 'meeting-notification';
      else if (detailLower.includes('task')) matchedEvent = 'task-assignment';

      const rule = commsPolicy[matchedEvent] || { channel: 'default', priority: 'normal' };
      
      return {
        approved: true,
        reason: `Matched communication routing rule for '${matchedEvent}'.`,
        channel: rule.channel,
        priority: rule.priority,
        escalationRequired: false
      };
    }

    // Handle the specific 'delegation' use-case
    if (requestType.startsWith('delegation')) {
      const members = await prisma.member.findMany({ include: { skills: true } });
      const tasks = await prisma.task.findMany({ include: { owner: true } });
      const delegPolicy = this.resolvePolicyPath(policy, requestType) || {};
      
      // Extract person name from details (e.g. "Bob", "Alice")
      let personName = '';
      if (members) {
        for (const m of members) {
          if (detailLower.includes(m.name.toLowerCase())) {
            personName = m.name;
            break;
          }
        }
      }

      if (personName) {
        const member = members.find((m: any) => m.name === personName);
        
        let currentWorkload = member?.currentWorkload || 0;
        if (tasks) {
          currentWorkload = tasks.filter((t: any) => t.owner?.name === personName && t.status !== 'Completed').length;
        }

        // Check if details mention a specific task count override (e.g. "Bob already has 9 tasks")
        const manualTaskMatch = detailLower.match(/has (\d+) tasks/);
        if (manualTaskMatch) {
          currentWorkload = parseInt(manualTaskMatch[1], 10);
        }

        const maxTasks = delegPolicy.maxTasksPerEmployee || 8;
        
        if (currentWorkload >= maxTasks) {
          return {
            approved: false,
            reason: `${personName} exceeds the maximum workload threshold of ${maxTasks} tasks (currently has ${currentWorkload}).`,
            escalationRequired: true
          };
        }

        // Check skill based assignment
        const skillEnabled = delegPolicy.skillBasedAssignment?.enabled;
        if (skillEnabled) {
          let hasSkill = false;
          if (member) {
              for (const skill of member.skills) {
                if (detailLower.includes(skill.skill.toLowerCase())) {
                  hasSkill = true;
                  break;
                }
              }
          }
          if (!hasSkill && !delegPolicy.skillBasedAssignment?.fallbackToLowestWorkload) {
            return {
              approved: false,
              reason: `${personName} does not possess the required skills for this task.`,
              escalationRequired: true
            };
          }
        }

        return {
          approved: true,
          reason: `${personName} satisfies the skill and workload policies for this task.`,
          escalationRequired: false
        };
      }
    }

    // Generic Policy Evaluation for other requests (admin.expenses, accessRequests, etc.)
    const section = this.resolvePolicyPath(policy, requestType);
    let approved = false;
    let reason = 'Request denied by default policy.';
    let escalationRequired = false;

    if (!section) {
      return { approved: false, reason: `Policy section ${requestType} not found.`, escalationRequired: true };
    }

    // 1. Amount checks
    if (amount !== undefined) {
      const maxAuto = section.maxAmountAutoApproval ?? section.maxAmount ?? undefined;
      const maxManager = section.maxAmountManagerApproval ?? undefined;

      if (maxAuto !== undefined && amount <= maxAuto) {
        approved = true;
        reason = `Amount ${amount} is within the auto-approval limit of ${maxAuto}.`;
      } else if (maxManager !== undefined && amount <= maxManager) {
        approved = false;
        escalationRequired = true;
        reason = `Amount ${amount} exceeds auto-approval but is within manager limit. Escalation required.`;
      } else if (maxAuto !== undefined) {
        escalationRequired = true;
        reason = `Amount ${amount} exceeds all limits. Escalation required.`;
      }
    }
    // 2. Boolean checks
    else if (section.allowed === true || section.enabled === true) {
      approved = true;
      reason = `Policy "${requestType}" allows this.`;
    }
    // 3. String matching on arrays (autoApproveTypes, etc.)
    else if (section.autoApproveTypes && section.autoApproveTypes.some((t: string) => detailLower.includes(t.toLowerCase()))) {
      approved = true;
      reason = `Request matches auto-approve types.`;
    } 
    else if (section.requireManualApproval && section.requireManualApproval.some((t: string) => detailLower.includes(t.toLowerCase()))) {
      escalationRequired = true;
      reason = `Request requires manual approval.`;
    }
    // 4. If all else fails but the section exists, assume approved if it's just a config lookup
    else {
      approved = true;
      reason = `Request validated against ${requestType} policy parameters.`;
    }

    return { approved, reason, escalationRequired };
  }
}
