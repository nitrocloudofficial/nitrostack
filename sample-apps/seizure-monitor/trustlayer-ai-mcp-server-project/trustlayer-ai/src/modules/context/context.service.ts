import { Injectable } from '@nitrostack/core';
import { ToolDecorator as Tool, ResourceDecorator as Resource, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { Claim, ClaimInput, Corroboration, TrustContext, SEVERITY_TO_STRENGTH } from '../../shared/trust-context.interface.js';

import fs from 'fs';
import path from 'path';

@Injectable()
export class ContextService {
  private store: Map<string, TrustContext> = new Map();
  private dbPath = path.join(process.cwd(), 'data', 'trust_contexts.json');

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        const parsed = JSON.parse(raw);
        for (const [key, value] of Object.entries(parsed)) {
          this.store.set(key, value as TrustContext);
        }
        console.log(`[ContextService] Loaded ${this.store.size} TrustContext records from disk (${this.dbPath}).`);
      }
    } catch (err: any) {
      console.warn('[ContextService] Error loading trust contexts from disk:', err.message);
    }
  }

  public saveToDisk() {
    try {
      const obj: Record<string, TrustContext> = {};
      this.store.forEach((value, key) => { obj[key] = value; });
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[ContextService] Failed to save trust contexts to disk:', err.message);
    }
  }

  /**
   * Internal method — used by other services via DI.
   * Also exposed as an MCP Resource below.
   */
  getTrustContext(transactionId: string): TrustContext {
    if (!this.store.has(transactionId)) {
      this.store.set(transactionId, {
        transactionId,
        claims: [],
        corroborations: []
      });
      this.saveToDisk();
    }
    return this.store.get(transactionId)!;
  }

  @Resource({
    uri: 'trustcontext://{transactionId}',
    name: 'getTrustContext',
    description: 'Get TrustContext object for transaction'
  })
  getTrustContextResource(ctx: ExecutionContext): TrustContext {
    // Extract transactionId from the resource URI metadata
    const transactionId = ctx.metadata?.['transactionId'] as string ?? 'unknown';
    return this.getTrustContext(transactionId);
  }

  @Tool({
    name: 'addClaim',
    description: 'Add a claim to transaction context',
    inputSchema: z.object({
      transactionId: z.string(),
      claim: z.object({
        source: z.string(),
        type: z.string(),
        fact: z.string(),
        value: z.any(),
        description: z.string(),
        severity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      })
    })
  })
  addClaim(input: { transactionId: string; claim: ClaimInput }, _ctx?: ExecutionContext): Claim {
    const context = this.getTrustContext(input.transactionId);
    
    const newClaim: Claim = {
      ...input.claim,
      id: `claim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      ts: Date.now(),
      strength: SEVERITY_TO_STRENGTH[input.claim.severity] ?? 0.5
    };
    
    context.claims.push(newClaim);
    this.saveToDisk();
    return newClaim;
  }

  /**
   * Internal method — used by PolicyService via DI.
   * Also exposed as an MCP Tool below.
   */
  getContradictions(transactionId: string): Corroboration[] {
    const context = this.getTrustContext(transactionId);
    
    const hasPayIntent = context.claims.find(c => c.fact === 'qr_payload_mode' && c.value === 'PAY');
    const hasRefundClaim = context.claims.find(c => c.fact === 'seller_claimed_transaction_type' && c.value === 'REFUND');
    
    if (hasPayIntent && hasRefundClaim) {
      const exists = context.corroborations.some(c => 
        c.relation === 'CONTRADICTS' && 
        c.claimIds.includes(hasPayIntent.id) && 
        c.claimIds.includes(hasRefundClaim.id)
      );
      
      if (!exists) {
        context.corroborations.push({
          relation: 'CONTRADICTS',
          claimIds: [hasPayIntent.id, hasRefundClaim.id],
          description: 'QR Semantic Inversion: Seller claims refund but QR requests payment.'
        });
      }
    }
    
    return context.corroborations;
  }

  @Tool({
    name: 'getContradictions',
    description: 'Get contradictions for transaction context',
    inputSchema: z.object({
      transactionId: z.string()
    })
  })
  getContradictionsTool(input: { transactionId: string }, _ctx?: ExecutionContext): Corroboration[] {
    return this.getContradictions(input.transactionId);
  }
}
