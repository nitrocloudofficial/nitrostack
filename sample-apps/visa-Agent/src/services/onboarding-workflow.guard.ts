import { createHash } from 'node:crypto';
import { Injectable, type ExecutionContext } from '@nitrostack/core';

type ToolResult = Record<string, unknown>;

/**
 * Keeps one deterministic onboarding turn from executing the same MCP tool
 * more than once. NitroStack gives each tools/call a new request ID, so the
 * key is a client-provided turn ID when available, with stable input/case
 * fallbacks for clients that do not send one.
 */
@Injectable()
export class OnboardingWorkflowGuard {
    private readonly results = new Map<string, ToolResult>();
    private readonly inFlight = new Map<string, Promise<ToolResult>>();
    private readonly workflowByCase = new Map<string, string>();

    onboardingKey(ctx: ExecutionContext, message: string): string {
        const turn = this.clientTurnId(ctx);
        const messageHash = createHash('sha256')
            .update(message.trim().replace(/\s+/g, ' ').toLowerCase())
            .digest('hex');

        return `onboarding:${this.actorKey(ctx)}:${turn ?? messageHash}`;
    }

    requirementsKey(ctx: ExecutionContext, caseId: string): string {
        const turn = this.clientTurnId(ctx);
        const actor = this.actorKey(ctx);
        const workflow = turn ?? this.workflowByCase.get(`${actor}:${caseId}`) ?? caseId;

        return `requirements:${actor}:${workflow}:${caseId}`;
    }

    linkCase(ctx: ExecutionContext, onboardingKey: string, caseId: string): void {
        this.workflowByCase.set(`${this.actorKey(ctx)}:${caseId}`, onboardingKey);
    }

    async executeOnce<T extends ToolResult>(key: string, execute: () => Promise<T>): Promise<T> {
        const cached = this.results.get(key);
        if (cached) return cached as T;

        const existing = this.inFlight.get(key);
        if (existing) return existing as Promise<T>;

        const execution = execute()
            .then((result) => {
                this.results.set(key, result);
                return result;
            })
            .finally(() => this.inFlight.delete(key));

        this.inFlight.set(key, execution);
        return execution;
    }

    private actorKey(ctx: ExecutionContext): string {
        return ctx.auth?.subject ?? 'anonymous';
    }

    private clientTurnId(ctx: ExecutionContext): string | null {
        const metadata = ctx.metadata ?? {};
        const candidate =
            metadata.onboardingWorkflowId ??
            metadata.messageId ??
            metadata.turnId ??
            metadata.conversationTurnId;

        return typeof candidate === 'string' && candidate.trim().length > 0
            ? candidate.trim()
            : null;
    }
}
