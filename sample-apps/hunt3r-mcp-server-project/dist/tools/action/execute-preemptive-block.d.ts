import { ExecutionContext } from '@nitrostack/core';
export declare class ExecutePreemptiveBlockTools {
    executePreemptiveBlock({ action, target, justification, twin_validation_id }: {
        action: 'BLOCK_DOMAIN' | 'ISOLATE_HOST' | 'REVOKE_CRED';
        target: string;
        justification: string;
        twin_validation_id: string;
    }, ctx: ExecutionContext): Promise<{
        status: string;
        action: "BLOCK_DOMAIN" | "ISOLATE_HOST" | "REVOKE_CRED";
        target: string;
        twin_validation_id: string;
        rollback_window_seconds: number;
        estimated_impact: string;
    }>;
}
//# sourceMappingURL=execute-preemptive-block.d.ts.map