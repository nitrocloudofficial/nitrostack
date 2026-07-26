import { ExecutionContext } from '@nitrostack/core';
export declare class GenerateDecisionChainTools {
    generateDecisionChain({ incident_id, observations, hypothesis, actions_taken }: {
        incident_id: string;
        observations: any[];
        hypothesis: any;
        actions_taken: string[];
    }, ctx: ExecutionContext): Promise<{
        chain_id: string;
        incident_id: string;
        overall_confidence: number;
        nodes: ({
            phase: string;
            decision: string;
            chosen: string;
            confidence: number;
            evidence: any[];
            alternatives?: undefined;
        } | {
            phase: string;
            decision: string;
            chosen: any;
            confidence: number;
            alternatives: {
                action: string;
                rejected_reason: string;
            }[];
            evidence?: undefined;
        })[];
        human_summary: string;
    }>;
}
//# sourceMappingURL=generate-decision-chain.d.ts.map