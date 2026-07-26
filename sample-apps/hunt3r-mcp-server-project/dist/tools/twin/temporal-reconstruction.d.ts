import { ExecutionContext } from '@nitrostack/core';
export declare class TemporalReconstructionTools {
    temporalReconstruction({ host_id, lookback_hours }: {
        host_id: string;
        lookback_hours: number;
    }, ctx: ExecutionContext): Promise<{
        host_id: string;
        patient_zero: {
            timestamp: string;
            technique: string | undefined;
            description: string;
        } | null;
        dwell_time_hours: number;
        total_events: number;
        suspicious_events: number;
        key_moments: {
            timestamp: string;
            type: string;
            severity: "high" | "critical" | "low" | "medium";
        }[];
    }>;
}
//# sourceMappingURL=temporal-reconstruction.d.ts.map