import { ExecutionContext } from '@nitrostack/core';

export interface CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean> | boolean;
}

export const approvalRegistry = new Map<string, 'approved' | 'rejected'>();

export class HumanApprovalGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const input = (context as any)?.input as { requestId?: string; decision?: string } | undefined;
        const requestId = input?.requestId;

        if (!requestId) {
            return false;
        }

        const recordedDecision = approvalRegistry.get(requestId);
        return recordedDecision === 'approved';
    }
}