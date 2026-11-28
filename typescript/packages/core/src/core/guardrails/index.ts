import 'reflect-metadata';
import type { ExecutionContext } from '../types.js';
import type { Tool } from '../tool.js';

export type Scalar = string | number | boolean;
export type Facts = Readonly<Record<string, Scalar>>;
export type Effect = 'allow' | 'deny' | 'require_information' | 'require_approval';
export type Condition = { field: string; op: 'eq' | 'neq' | 'in' | 'gt' | 'gte' | 'lt' | 'lte'; value: Scalar | Scalar[] };
export type Rule = { id: string; effect: Effect; all: [Condition, ...Condition[]] };
export type Policy = { schemaVersion: 1; id: string; tenantId: string; version: number; defaultEffect: 'deny'; rules: Rule[] };
export type Decision = { effect: Effect; reasonCode: string; policyId: string; version: number };
export type VerifiedIdentity = { principalId: string; tenantId: string; scopes: readonly string[]; source: string };
export type GuardrailDeclaration = { policy: string; facts: readonly string[] } | { public: true };

export interface PolicyProvider {
  getActive(tenantId: string, policyId: string, opts: { signal?: AbortSignal }): Promise<Policy>;
}
export interface GuardrailsConfig {
  mode: 'enforce' | 'observe';
  requireDeclaration?: boolean;
  provider: PolicyProvider;
  identityResolver(ctx: ExecutionContext): Promise<VerifiedIdentity | null> | VerifiedIdentity | null;
  contextResolver(args: { tool: Tool<any, any>; input: unknown; identity: VerifiedIdentity; ctx: ExecutionContext }): Promise<Facts> | Facts;
  evaluator?: JsonPolicyEvaluator;
  audit?: (event: { tool: string; tenantId: string; principalId: string; decision: Decision }) => Promise<void> | void;
}

const METADATA = Symbol('nitrostack:guardrail');
const FIELD = /^[a-zA-Z][a-zA-Z0-9_.]{0,127}$/;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const EFFECTS = new Set<Effect>(['allow', 'deny', 'require_information', 'require_approval']);
const OPS = new Set<Condition['op']>(['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte']);
const isScalar = (x: unknown): x is Scalar => typeof x === 'string' || typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x));
const validField = (x: string): boolean => FIELD.test(x) && x.split('.').every(part => part && !FORBIDDEN.has(part));

export function Guardrail(declaration: { policy: string; facts: readonly string[] }): MethodDecorator {
  return (target, key) => Reflect.defineMetadata(METADATA, declaration, target, key);
}
export namespace Guardrail {
  export function Public(): MethodDecorator {
    return (target, key) => Reflect.defineMetadata(METADATA, { public: true }, target, key);
  }
}
export function getGuardrailMetadata(target: object, key: string): GuardrailDeclaration | undefined {
  return Reflect.getMetadata(METADATA, target, key) as GuardrailDeclaration | undefined;
}

export class GuardrailDecisionError extends Error {
  readonly publicMessage: string;
  constructor(readonly reasonCode: string, message = "This action isn't permitted.") {
    super(message);
    this.name = 'GuardrailDecisionError';
    this.publicMessage = message;
  }
}

export function assertValidPolicy(policy: Policy, tenantId: string, policyId: string, fields: readonly string[]): void {
  if (!policy || policy.schemaVersion !== 1 || policy.id !== policyId || policy.tenantId !== tenantId ||
      !Number.isSafeInteger(policy.version) || policy.version < 1 || policy.defaultEffect !== 'deny' ||
      !Array.isArray(policy.rules) || policy.rules.length > 100 || JSON.stringify(policy).length > 65536 ||
      Object.keys(policy).some(k => !['schemaVersion', 'id', 'tenantId', 'version', 'defaultEffect', 'rules'].includes(k))) {
    throw new Error('Invalid policy');
  }
  const allowed = new Set(fields);
  const ids = new Set<string>();
  for (const rule of policy.rules) {
    if (!rule || typeof rule.id !== 'string' || !rule.id || ids.has(rule.id) || !EFFECTS.has(rule.effect) ||
        !Array.isArray(rule.all) || rule.all.length < 1 || rule.all.length > 20 ||
        Object.keys(rule).some(k => !['id', 'effect', 'all'].includes(k))) throw new Error('Invalid rule');
    ids.add(rule.id);
    for (const condition of rule.all) {
      if (!condition || typeof condition.field !== 'string' || !validField(condition.field) ||
          !allowed.has(condition.field) || !OPS.has(condition.op) ||
          Object.keys(condition).some(k => !['field', 'op', 'value'].includes(k))) throw new Error('Invalid condition');
      if (condition.op === 'in') {
        if (!Array.isArray(condition.value) || !condition.value.length || condition.value.length > 100 || !condition.value.every(isScalar)) throw new Error('Invalid condition');
      } else if (['gt', 'gte', 'lt', 'lte'].includes(condition.op)) {
        if (typeof condition.value !== 'number' || !Number.isFinite(condition.value)) throw new Error('Invalid condition');
      } else if (!isScalar(condition.value)) throw new Error('Invalid condition');
    }
  }
}

export class JsonPolicyEvaluator {
  evaluate(policy: Policy, facts: Facts): Decision {
    for (const effect of ['deny', 'require_approval', 'require_information', 'allow'] as const) {
      const rule = policy.rules.find(r => r.effect === effect && r.all.every(c => {
        if (!Object.prototype.hasOwnProperty.call(facts, c.field)) return false;
        const actual = facts[c.field];
        if (!isScalar(actual)) return false;
        switch (c.op) {
          case 'eq': return actual === c.value;
          case 'neq': return actual !== c.value;
          case 'in': return (c.value as Scalar[]).includes(actual);
          case 'gt': return typeof actual === 'number' && actual > (c.value as number);
          case 'gte': return typeof actual === 'number' && actual >= (c.value as number);
          case 'lt': return typeof actual === 'number' && actual < (c.value as number);
          case 'lte': return typeof actual === 'number' && actual <= (c.value as number);
        }
      }));
      if (rule) return { effect, reasonCode: rule.id, policyId: policy.id, version: policy.version };
    }
    return { effect: 'deny', reasonCode: 'DEFAULT_DENY', policyId: policy.id, version: policy.version };
  }
}

export class InMemoryPolicyProvider implements PolicyProvider {
  private readonly policies = new Map<string, Policy>();
  publish(policy: Policy): void { this.policies.set(`${policy.tenantId}\0${policy.id}`, policy); }
  async getActive(tenantId: string, policyId: string): Promise<Policy> {
    const policy = this.policies.get(`${tenantId}\0${policyId}`);
    if (!policy) throw new Error('Policy unavailable');
    return policy;
  }
}

export function assertDeclaration(declaration: GuardrailDeclaration): void {
  if ('public' in declaration) return;
  if (!declaration.policy || !Array.isArray(declaration.facts) || !declaration.facts.length ||
      declaration.facts.some(f => typeof f !== 'string' || !validField(f)) ||
      new Set(declaration.facts).size !== declaration.facts.length) throw new Error('Invalid guardrail declaration');
}

export { CachedPolicyProvider, InMemoryPolicySource, chainIdentity } from './runtime.js';
export type { PolicySource, PolicyChangeEvent, CachedPolicyProviderOptions } from './runtime.js';
