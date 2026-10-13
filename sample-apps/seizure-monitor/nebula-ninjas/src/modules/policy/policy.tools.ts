/**
 * Sentinel Gateway — Policy Tools (Admin)
 * 
 * NitroStack MCP tools for managing RBAC policies.
 */

import {
  ToolDecorator as Tool,
  ControllerDecorator as Controller,
  ExecutionContext,
  Injectable,
  z,
} from '@nitrostack/core';
import { PolicyService } from './policy.service.js';

@Controller('sentinel')
@Injectable({ deps: [PolicyService] })
export class PolicyTools {
  constructor(private readonly policy: PolicyService) {}

  @Tool({
    name: 'add_policy_rule',
    description: 'Grant an agent access to a specific tool on a specific server. Use toolName="*" to grant access to all tools on that server.',
    inputSchema: z.object({
      agentId: z.string().describe('Agent identifier (e.g. "sales-bot", "data-analyst")'),
      serverName: z.string().describe('Target server name (e.g. "email-server")'),
      toolName: z.string().describe('Tool name to grant access to, or "*" for all tools'),
      maxAmount: z.number().optional().describe('Optional: maximum amount constraint'),
    }),
  })
  async addPolicyRule(
    input: { agentId: string; serverName: string; toolName: string; maxAmount?: number },
    ctx: ExecutionContext,
  ) {
    const constraints = input.maxAmount ? { maxAmount: input.maxAmount } : undefined;
    const rule = this.policy.addRule(input.agentId, input.serverName, input.toolName, constraints);

    ctx.logger.info(`Policy rule added: ${input.agentId} → ${input.serverName}/${input.toolName}`);

    return {
      success: true,
      rule: {
        id: rule.id,
        agentId: rule.agentId,
        serverName: rule.serverName,
        toolName: rule.toolName,
        constraints: rule.constraints,
        createdAt: rule.createdAt,
      },
      message: `✅ Agent "${input.agentId}" granted access to ${input.serverName}/${input.toolName}`,
    };
  }

  @Tool({
    name: 'remove_policy_rule',
    description: 'Revoke an agent\'s access to a specific tool.',
    inputSchema: z.object({
      agentId: z.string().describe('Agent identifier'),
      serverName: z.string().describe('Target server name'),
      toolName: z.string().describe('Tool name to revoke access from'),
    }),
  })
  async removePolicyRule(
    input: { agentId: string; serverName: string; toolName: string },
    ctx: ExecutionContext,
  ) {
    const removed = this.policy.removeRule(input.agentId, input.serverName, input.toolName);

    ctx.logger.info(`Policy rule ${removed ? 'removed' : 'not found'}: ${input.agentId} → ${input.serverName}/${input.toolName}`);

    return {
      success: removed,
      message: removed
        ? `✅ Access revoked: "${input.agentId}" → ${input.serverName}/${input.toolName}`
        : `⚠️ No matching policy rule found`,
    };
  }

  @Tool({
    name: 'list_policy_rules',
    description: 'List all RBAC policy rules. Optionally filter by agent ID.',
    inputSchema: z.object({
      agentId: z.string().optional().describe('Filter rules by agent ID'),
    }),
  })
  async listPolicyRules(
    input: { agentId?: string },
    ctx: ExecutionContext,
  ) {
    const rules = input.agentId
      ? this.policy.getAgentRules(input.agentId)
      : this.policy.getAllRules();

    ctx.logger.info(`Listing ${rules.length} policy rules`);

    return {
      rules: rules.map((r) => ({
        id: r.id,
        agentId: r.agentId,
        serverName: r.serverName,
        toolName: r.toolName,
        constraints: r.constraints,
        active: r.active,
        createdAt: r.createdAt,
      })),
      totalRules: rules.length,
    };
  }

  @Tool({
    name: 'check_agent_access',
    description: 'Test whether a specific agent is allowed to call a specific tool. Returns the policy decision and reason.',
    inputSchema: z.object({
      agentId: z.string().describe('Agent identifier to check'),
      serverName: z.string().describe('Target server name'),
      toolName: z.string().describe('Tool name to check access for'),
    }),
  })
  async checkAgentAccess(
    input: { agentId: string; serverName: string; toolName: string },
    ctx: ExecutionContext,
  ) {
    const result = this.policy.checkAccess(input.agentId, input.serverName, input.toolName);

    ctx.logger.info(`Access check: ${input.agentId} → ${input.serverName}/${input.toolName} = ${result.allowed ? 'ALLOWED' : 'DENIED'}`);

    return {
      agentId: input.agentId,
      serverName: input.serverName,
      toolName: input.toolName,
      allowed: result.allowed,
      reason: result.reason,
      decision: result.allowed ? '✅ ALLOWED' : '🛑 DENIED',
    };
  }

  @Tool({
    name: 'setup_demo_policies',
    description: 'Quick setup: Create demo RBAC policies for demonstration. Grants "sales-bot" access to CRM and email, "data-analyst" access to filesystem, and leaves "rogue-agent" with no access.',
    inputSchema: z.object({}),
  })
  async setupDemoPolicies(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Setting up demo policies');

    // Sales bot: access to CRM and email
    this.policy.addRule('sales-bot', 'crm-server', '*');
    this.policy.addRule('sales-bot', 'email-server', 'send_email');
    this.policy.addRule('sales-bot', 'email-server', 'list_inbox');

    // Data analyst: access to filesystem (read only)
    this.policy.addRule('data-analyst', 'filesystem-server', 'read_file');
    this.policy.addRule('data-analyst', 'filesystem-server', 'list_directory');

    // Admin: full access
    this.policy.addRule('admin', 'filesystem-server', '*');
    this.policy.addRule('admin', 'crm-server', '*');
    this.policy.addRule('admin', 'email-server', '*');

    // rogue-agent: NO ACCESS (default deny)

    return {
      success: true,
      policies: {
        'sales-bot': ['crm-server/*', 'email-server/send_email', 'email-server/list_inbox'],
        'data-analyst': ['filesystem-server/read_file', 'filesystem-server/list_directory'],
        'admin': ['filesystem-server/*', 'crm-server/*', 'email-server/*'],
        'rogue-agent': ['⛔ NO ACCESS (default deny)'],
      },
      totalRules: this.policy.ruleCount,
      message: '✅ Demo policies configured. "rogue-agent" has zero access by design.',
    };
  }
}
