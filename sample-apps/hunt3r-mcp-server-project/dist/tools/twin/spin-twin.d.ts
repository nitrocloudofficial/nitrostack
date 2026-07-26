import { ExecutionContext } from '@nitrostack/core';
export declare class SpinTwinTools {
    spinTwin({ seed_host_id, depth_hops }: {
        seed_host_id: string;
        depth_hops: number;
    }, ctx: ExecutionContext): Promise<{
        twin_id: string;
        seed_host: string;
        depth: number;
        total_hosts: number;
        critical_assets_in_scope: number;
        hosts: {
            host_id: string;
            compromised: boolean;
            criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
            trust_relationships: string[];
        }[];
        simulation_ready: boolean;
    }>;
}
//# sourceMappingURL=spin-twin.d.ts.map