import { getEffectiveCapabilities, getCapabilitySources } from './capability.js';
import { POLICY_RULES, type Severity } from './policies.js';

export interface AttackPath {
    ruleId: string;
    source: string;
    sink: string;
    viaTools: string[];
    severity: Severity;
    message: string;
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
    critical: 1.0,
    high: 0.6,
    medium: 0.3,
};

/**
 * Pure TS, no LLM, 0 tokens. For each policy rule, if the agent's effective
 * capabilities include both source and sink, emit a path naming the tools
 * that supply each side.
 */
export function detectAttackPaths(agentId: string): AttackPath[] {
    const effectiveCaps = new Set(getEffectiveCapabilities(agentId));
    const sources = getCapabilitySources(agentId);
    const paths: AttackPath[] = [];

    for (const rule of POLICY_RULES) {
        if (!effectiveCaps.has(rule.source) || !effectiveCaps.has(rule.sink)) {
            continue;
        }
        const viaTools = Array.from(new Set([
            ...(sources.get(rule.source) ?? []),
            ...(sources.get(rule.sink) ?? []),
        ]));
        paths.push({
            ruleId: rule.id,
            source: rule.source,
            sink: rule.sink,
            viaTools,
            severity: rule.severity,
            message: rule.message,
        });
    }

    return paths;
}

export function computeRiskScore(paths: AttackPath[]): number {
    const sum = paths.reduce((total, path) => total + SEVERITY_WEIGHT[path.severity], 0);
    return Math.min(1, Math.round(sum * 100) / 100);
}
