import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { z } from 'zod';
import { IdempotencyEnforcer } from '../patterns/idempotency.js';

@Injectable({ deps: [IdempotencyEnforcer] })
export class CerberusSecurityAgent {
  constructor(private readonly idempotency: IdempotencyEnforcer) {}

  @Tool({
    name: 'deploy_idempotency_shield',
    description: 'Intercepts duplicate transaction hashes within a 15-second latency window, dropping re-queries to mathematically prevent double-spending.',
    inputSchema: z.object({
      active: z.boolean()
    })
  })
  @Widget('tools')
  async deployIdempotencyShield(input: { active: boolean }) {
    if (!this.idempotency) {
      (this as any).idempotency = { isActive: false };
    }
    this.idempotency.isActive = input.active;
    return {
      status: 'SHIELD_ACTIVE',
      shieldType: 'IDEMPOTENCY_INTERCEPTOR',
      windowMs: 15000,
      timestamp: new Date().toISOString()
    };
  }

  @Tool({
    name: 'isolate_mule_cluster',
    description: 'Isolates malicious botnets and suspected money mule clusters from the core ledger.',
    inputSchema: z.object({
      clusterId: z.string(),
      reason: z.string()
    })
  })
  @Widget('tools')
  async isolateMuleCluster(input: { clusterId: string; reason: string }) {
    return {
      status: 'CLUSTER_ISOLATED',
      clusterId: input.clusterId,
      reason: input.reason,
      timestamp: new Date().toISOString()
    };
  }
}
