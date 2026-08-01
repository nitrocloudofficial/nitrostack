import { ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { HumanApprovalGuard, approvalRegistry } from '../../guards/human-approval.guard.js';

export interface ChangeRequest {
    requestId: string;
    planId: string;
    approver: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    decisionAt?: string;
}

const changeRequestsStore = new Map<string, ChangeRequest>();

function Tool(_options: { name: string; description: string; inputSchema: z.ZodSchema }): any {
    return function (..._args: any[]): any { };
}

function UseGuards(_guard: any): any {
    return function (..._args: any[]): any { };
}

export class WorkflowTools {
    @Tool({
        name: 'create_change_request',
        description: 'Creates a pending human-in-the-loop change request for a remediation plan',
        inputSchema: z.object({
            planId: z.string().describe('The ID of the remediation plan'),
            approver: z.string().describe('Email or ID of the assigned human approver'),
        }),
    })
    async create(input: { planId: string; approver: string }, _ctx?: ExecutionContext): Promise<ChangeRequest> {
        const requestId = `cr-${Date.now()}`;
        const cr: ChangeRequest = {
            requestId,
            planId: input.planId,
            approver: input.approver,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };

        changeRequestsStore.set(requestId, cr);
        return cr;
    }

    @Tool({
        name: 'approve_change_request',
        description: 'Records a human approval or rejection decision for a change request',
        inputSchema: z.object({
            requestId: z.string().describe('The change request ID'),
            decision: z.enum(['approved', 'rejected']).describe('Human decision'),
        }),
    })
    @UseGuards(HumanApprovalGuard)
    async approve(input: { requestId: string; decision: 'approved' | 'rejected' }, _ctx?: ExecutionContext): Promise<ChangeRequest | { error: string }> {
        const cr = changeRequestsStore.get(input.requestId);

        if (!cr) {
            return { error: `Change request '${input.requestId}' not found.` };
        }

        // Register decision in guard registry
        approvalRegistry.set(input.requestId, input.decision);

        cr.status = input.decision === 'approved' ? 'APPROVED' : 'REJECTED';
        cr.decisionAt = new Date().toISOString();
        changeRequestsStore.set(input.requestId, cr);

        return cr;
    }
}