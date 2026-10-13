/**
 * Sentinel Gateway — Policy Service (RBAC)
 * 
 * Per-agent permission enforcement. Default policy: DENY ALL.
 * Each agent must be explicitly granted access to specific tools.
 */

import { Injectable } from '@nitrostack/core';
import { LedgerService } from '../ledger/ledger.service.js';
import { randomUUID } from 'crypto';
import type { PolicyRule, PolicyConstraints, PolicyCheckResult } from '../shared/types.js';

@Injectable({ deps: [LedgerService] })
export class PolicyService {
  private rules: Map<string, PolicyRule> = new Map();

  constructor(private readonly ledger: LedgerService) {}

  /**
   * Create a unique key for a policy rule.
   */
  private makeKey(agentId: string, serverName: string, toolName: string): string {
    return `${agentId}::${serverName}::${toolName}`;
  }

  /**
   * Add a policy rule granting an agent access to a tool.
   */
  addRule(
    agentId: string,
    serverName: string,
    toolName: string,
    constraints?: PolicyConstraints,
  ): PolicyRule {
    const key = this.makeKey(agentId, serverName, toolName);

    const rule: PolicyRule = {
      id: randomUUID(),
      agentId,
      serverName,
      toolName,
      constraints,
      createdAt: new Date().toISOString(),
      active: true,
    };

    this.rules.set(key, rule);

    // Log policy change to ledger
    this.ledger.append({
      agentId: 'admin',
      serverName,
      toolName,
      action: 'POLICY_CHANGE',
      status: 'INFO',
      details: `Policy GRANT: agent "${agentId}" → ${serverName}/${toolName}${constraints ? ` with constraints: ${JSON.stringify(constraints)}` : ''}`,
    });

    return rule;
  }

  /**
   * Remove a policy rule.
   */
  removeRule(agentId: string, serverName: string, toolName: string): boolean {
    const key = this.makeKey(agentId, serverName, toolName);
    const removed = this.rules.delete(key);

    if (removed) {
      this.ledger.append({
        agentId: 'admin',
        serverName,
        toolName,
        action: 'POLICY_CHANGE',
        status: 'INFO',
        details: `Policy REVOKE: agent "${agentId}" → ${serverName}/${toolName}`,
      });
    }

    return removed;
  }

  /**
   * Check if an agent has permission to call a tool.
   * Default policy: DENY ALL.
   */
  checkAccess(
    agentId: string,
    serverName: string,
    toolName: string,
    args?: Record<string, unknown>,
  ): PolicyCheckResult {
    // Check for wildcard rules first (agent has access to all tools on this server)
    const wildcardKey = this.makeKey(agentId, serverName, '*');
    const wildcardRule = this.rules.get(wildcardKey);
    if (wildcardRule?.active) {
      return { allowed: true, reason: 'Wildcard access granted', rule: wildcardRule };
    }

    // Check for specific tool rule
    const key = this.makeKey(agentId, serverName, toolName);
    const rule = this.rules.get(key);

    if (!rule || !rule.active) {
      return {
        allowed: false,
        reason: `Agent "${agentId}" has no policy granting access to ${serverName}/${toolName}. Default policy: DENY ALL.`,
      };
    }

    // Check parameter constraints
    if (rule.constraints && args) {
      if (rule.constraints.maxAmount !== undefined) {
        const amount = args.amount as number;
        if (amount !== undefined && amount > rule.constraints.maxAmount) {
          return {
            allowed: false,
            reason: `Amount ${amount} exceeds maximum allowed ${rule.constraints.maxAmount}`,
            rule,
          };
        }
      }

      if (rule.constraints.allowedPaths) {
        const path = args.path as string;
        if (path && !rule.constraints.allowedPaths.some((p) => path.startsWith(p))) {
          return {
            allowed: false,
            reason: `Path "${path}" not in allowed paths: ${rule.constraints.allowedPaths.join(', ')}`,
            rule,
          };
        }
      }
    }

    return { allowed: true, reason: 'Access granted by policy rule', rule };
  }

  /**
   * Get all policy rules.
   */
  getAllRules(): PolicyRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules for a specific agent.
   */
  getAgentRules(agentId: string): PolicyRule[] {
    return Array.from(this.rules.values()).filter((r) => r.agentId === agentId);
  }

  /**
   * Quick-setup: grant an agent access to all tools on all servers.
   */
  grantFullAccess(agentId: string, servers: string[]): PolicyRule[] {
    const rules: PolicyRule[] = [];
    for (const server of servers) {
      rules.push(this.addRule(agentId, server, '*'));
    }
    return rules;
  }

  /**
   * Total number of active rules.
   */
  get ruleCount(): number {
    return this.rules.size;
  }
}
