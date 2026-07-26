import { ExecutionContext } from '@nitrostack/core';
export declare class SimulateLateralMovementTools {
    simulateLateralMovement({ twin_id, attacker_profile, entry_point, simulation_duration_minutes }: {
        twin_id: string;
        attacker_profile: string;
        entry_point: string;
        simulation_duration_minutes: number;
    }, ctx: ExecutionContext): Promise<{
        twin_id: string;
        time_to_critical: number;
        total_hosts_compromised: number;
        critical_assets_reached: number;
        simulation_steps: any[];
        recommended_blocks: string[];
    }>;
}
//# sourceMappingURL=simulate-lateral-movement.d.ts.map