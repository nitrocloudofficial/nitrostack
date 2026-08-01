import { AppState, ConflictResult } from '../../../state/state.js';

export interface Rule {
  id: string;
  toolName: string;
  priority: number;
  check: (params: Record<string, any>, state: AppState) => ConflictResult | null | Promise<ConflictResult | null>;
}

const rules: Rule[] = [];

export function registerRule(rule: Rule) {
  rules.push(rule);
  rules.sort((a, b) => b.priority - a.priority);
}

export async function runConflictCheck(toolName: string, params: Record<string, any>, state: AppState): Promise<ConflictResult | null> {
  const applicable = rules.filter(r => r.toolName === toolName || r.toolName === '*');
  for (const rule of applicable) {
    const result = await rule.check(params, state);
    if (result?.has_conflict) return result;
  }
  return null;
}

export function listRules() {
  return rules.map(r => ({ id: r.id, toolName: r.toolName, priority: r.priority }));
}
