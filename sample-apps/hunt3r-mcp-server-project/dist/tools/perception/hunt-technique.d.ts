import { ExecutionContext } from '@nitrostack/core';
export declare class HuntTechniqueTools {
    huntTechnique({ technique_id, timeframe_hours, host_filter }: {
        technique_id: string;
        timeframe_hours: number;
        host_filter?: string[];
    }, ctx: ExecutionContext): Promise<{
        technique_id: string;
        total_hits: number;
        severity: string;
        corroborated_evidence: {
            timestamp: string;
            host_id: string;
            user: string;
            evidence_type: string;
            description: string;
            confidence: number;
        }[];
        recommended_next_steps: string[];
    }>;
}
//# sourceMappingURL=hunt-technique.d.ts.map