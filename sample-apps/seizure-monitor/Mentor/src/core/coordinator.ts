/**
 * The Coordinator — COMMAND as a working organization.
 *
 * Commanders don't just run in a fixed line; a commander that hits a problem
 * outside its own domain can pull in the right teammate MID-RUN, wait for them
 * to resolve it, and then continue with the result in hand. That is real
 * delegation + synchronization: LEDGER, while healing a cloud bill, can discover
 * the spike is caused by a code regression and hand that off to SENTINEL,
 * blocking until SENTINEL reports back.
 *
 * The Coordinator wires each commander's engine with a shared AEGIS `guard`
 * (so every action — own or delegated — is trust-gated), records the
 * collaboration graph, and guards against cycles / runaway depth.
 */

import { Engine } from './engine.js';
import type { Guard, Planner } from './engine.js';
import type { DomainAdapter } from './adapter.js';

/** Given to a delegating adapter so it can ask another commander for help. */
export type DelegateFn = (toDomain: string, reason: string) => Promise<DelegationResult>;

export interface DelegationResult {
  domain: string;
  status: string;
  summary: string;
  trustScore: number;
}

export interface DomainRegistration {
  key: string;
  makeAdapter: (delegate: DelegateFn) => DomainAdapter;
  makePlanner: () => Planner;
}

export interface OrgTraceEntry {
  depth: number;
  from: string;
  to: string;
  kind: 'referral' | 'return' | 'referral-skipped';
  detail: string;
}

export interface OrgResult {
  domain: string;
  incidentId: string;
  status: string;
  fixSummary: string;
  confidence: number | null;
  trustScore: number;
  /** Commanders this one pulled in to help (their full results). */
  children: OrgResult[];
}

export type OrgEventSink = (domain: string, event: { type: string; title: string; detail: Record<string, unknown> }) => void;

export class Coordinator {
  private readonly registry = new Map<string, DomainRegistration>();
  readonly orgTrace: OrgTraceEntry[] = [];

  constructor(
    private readonly guard?: Guard,
    private readonly onEvent?: OrgEventSink,
    private readonly maxDepth = 3,
  ) {}

  register(reg: DomainRegistration): this {
    this.registry.set(reg.key, reg);
    return this;
  }

  async run(domain: string, symptom: string, stack: string[] = []): Promise<OrgResult> {
    const reg = this.registry.get(domain);
    if (!reg) throw new Error(`no such commander: ${domain}`);

    const depth = stack.length;
    const children: OrgResult[] = [];

    const delegate: DelegateFn = async (toDomain, reason) => {
      if (stack.includes(toDomain) || stack.includes(domain) && depth >= this.maxDepth) {
        this.orgTrace.push({ depth, from: domain, to: toDomain, kind: 'referral-skipped', detail: stack.includes(toDomain) ? 'cycle guard' : 'max depth' });
        return { domain: toDomain, status: 'SKIPPED', summary: 'not run (cycle/depth guard)', trustScore: 1 };
      }
      if (depth >= this.maxDepth) {
        this.orgTrace.push({ depth, from: domain, to: toDomain, kind: 'referral-skipped', detail: 'max depth' });
        return { domain: toDomain, status: 'SKIPPED', summary: 'not run (max depth)', trustScore: 1 };
      }
      this.orgTrace.push({ depth, from: domain, to: toDomain, kind: 'referral', detail: reason });
      const child = await this.run(toDomain, reason, [...stack, domain]);
      children.push(child);
      this.orgTrace.push({ depth, from: toDomain, to: domain, kind: 'return', detail: `${child.status}: ${child.fixSummary}` });
      return { domain: toDomain, status: child.status, summary: child.fixSummary, trustScore: child.trustScore };
    };

    let trustScore = 1;
    const engine = new Engine(reg.makeAdapter(delegate), {
      planner: reg.makePlanner(),
      approvalGate: () => true,
      guard: this.guard,
      onEvent: (e) => {
        if (e.type === 'trust.checked' && typeof e.detail.trustScore === 'number') trustScore = e.detail.trustScore;
        this.onEvent?.(domain, e);
      },
    });

    const inc = await engine.runIncident(symptom);
    return {
      domain,
      incidentId: inc.id,
      status: inc.status,
      fixSummary: inc.fixSummary,
      confidence: inc.verdict?.score ?? null,
      trustScore,
      children,
    };
  }
}
