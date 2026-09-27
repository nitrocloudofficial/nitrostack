import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { POLICY_RULES } from './policies.js';

export class GovernanceResources {
    @Resource({
        uri: 'aegis://policies',
        name: 'Aegis Policies',
        description: "Toxic capability-combination rules Aegis checks for when auditing an agent's effective capabilities.",
        mimeType: 'application/json',
        examples: {
            response: {
                rules: [
                    {
                        id: 'exfiltration',
                        source: 'READ_PRIVATE_DATA',
                        sink: 'SEND_EXTERNAL',
                        severity: 'critical',
                        message: 'Agent can read private data AND send it externally — data exfiltration path.',
                    },
                ],
            },
        },
    })
    async getPolicies(uri: string, ctx: ExecutionContext) {
        ctx.logger.info('Serving Aegis policy rules', { uri, count: POLICY_RULES.length });
        return POLICY_RULES;
    }
}
