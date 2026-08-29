import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import Groq from 'groq-sdk';
import { createHash } from 'node:crypto';
import { detectAttackPaths } from './detector.js';

// Only invoked on a detected path; cached by hash of ruleId + sorted(viaTools).
// This is the only token spend in Aegis — detection itself is pure TS, 0 tokens.
const explanationCache = new Map<string, string>();
let groqClient: Groq | undefined;

function getClient(): Groq {
    if (!groqClient) {
        groqClient = new Groq();
    }
    return groqClient;
}

function cacheKey(ruleId: string, viaTools: string[]): string {
    const sorted = [...viaTools].sort().join(',');
    return createHash('sha256').update(`${ruleId}:${sorted}`).digest('hex');
}

export class GovernancePrompts {
    @Prompt({
        name: 'explain_attack_path',
        description: 'Explain a detected Aegis attack path in plain English for a non-technical audience.',
        arguments: [
            { name: 'agentId', description: 'ID of the agent the attack path was detected on', required: true },
            { name: 'ruleId', description: "ID of the detected policy rule (e.g. 'exfiltration')", required: true },
        ],
    })
    async explainAttackPath(args: { agentId: string; ruleId: string }, ctx: ExecutionContext) {
        const attackPath = detectAttackPaths(args.agentId).find((path) => path.ruleId === args.ruleId);

        if (!attackPath) {
            return [
                {
                    role: 'assistant' as const,
                    content: `No active '${args.ruleId}' attack path is currently detected for agent '${args.agentId}'.`,
                },
            ];
        }

        const key = cacheKey(attackPath.ruleId, attackPath.viaTools);
        let explanation = explanationCache.get(key);

        if (!explanation) {
            ctx.logger.info('Generating attack path explanation (cache miss)', {
                ruleId: attackPath.ruleId,
                viaTools: attackPath.viaTools,
            });

            const response = await getClient().chat.completions.create({
                model: 'llama-3.1-8b-instant',
                max_completion_tokens: 300,
                messages: [
                    {
                        role: 'user',
                        content:
                            `Explain this AI-agent security finding in 2-3 plain-English sentences for a ` +
                            `non-technical reader. Rule: ${attackPath.ruleId}. Severity: ${attackPath.severity}. ` +
                            `Capabilities involved: ${attackPath.source} -> ${attackPath.sink}. Connected tools ` +
                            `providing this path: ${attackPath.viaTools.join(', ')}. Technical description: ` +
                            `${attackPath.message}`,
                    },
                ],
            });

            explanation = response.choices[0]?.message?.content ?? attackPath.message ?? '';
            explanationCache.set(key, explanation);
        } else {
            ctx.logger.info('Serving cached attack path explanation', {
                ruleId: attackPath.ruleId,
                viaTools: attackPath.viaTools,
            });
        }

        return [{ role: 'assistant' as const, content: explanation }];
    }
}
