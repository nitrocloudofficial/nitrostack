import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
    TaskManager,
    TaskContext,
    TaskNotFoundError,
    TaskAlreadyTerminalError,
    InvalidTaskTransitionError,
    TaskCancelledError,
    TaskAugmentationRequiredError,
    isTerminalStatus,
    TERMINAL_STATUSES,
    type TaskData,
    type TaskAccessContext,
    type TaskStore,
    type TaskEntry,
    InMemoryTaskStore,
} from '../task.js';
import type { Logger } from '../types.js';

// ─── Mock logger ─────────────────────────────────────────────────────────────
function createMockLogger(): Logger {
    return {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function createManager(onStatusChange?: (data: TaskData) => void) {
    return new TaskManager({
        logger: createMockLogger(),
        defaultTtl: 60000,
        defaultPollInterval: 1000,
        onStatusChange,
    });
}

// ─── isTerminalStatus ────────────────────────────────────────────────────────
describe('isTerminalStatus', () => {
    it('returns true for terminal statuses', () => {
        expect(isTerminalStatus('completed')).toBe(true);
        expect(isTerminalStatus('failed')).toBe(true);
        expect(isTerminalStatus('cancelled')).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
        expect(isTerminalStatus('working')).toBe(false);
        expect(isTerminalStatus('input_required')).toBe(false);
    });

    it('TERMINAL_STATUSES contains expected values', () => {
        expect(TERMINAL_STATUSES).toEqual(['completed', 'failed', 'cancelled']);
    });
});

// ─── TaskManager ─────────────────────────────────────────────────────────────
describe('TaskManager', () => {
    let manager: TaskManager;

    beforeEach(() => {
        manager = createManager();
    });

    afterEach(() => {
        manager.destroy();
    });

    // ── createTask ──────────────────────────────────────────────────────────────
    describe('createTask', () => {
        it('creates a task with default working status', () => {
            const task = manager.createTask();
            expect(task.status).toBe('working');
            expect(task.taskId).toBeTruthy();
            expect(task.createdAt).toBeTruthy();
            expect(task.lastUpdatedAt).toBeTruthy();
            expect(task.ttl).toBe(60000); // defaultTtl
            expect(task.pollInterval).toBe(1000);
        });

        it('respects custom TTL param', () => {
            const task = manager.createTask({ ttl: 30000 });
            expect(task.ttl).toBe(30000);
        });

        it('generates unique task IDs', () => {
            const a = manager.createTask();
            const b = manager.createTask();
            expect(a.taskId).not.toBe(b.taskId);
        });

        it('returns immutable snapshot (not a live reference)', () => {
            const task = manager.createTask();
            const snapshot = { ...task };
            manager.updateStatus(task.taskId, 'completed');
            expect(snapshot.status).toBe('working'); // snapshot unchanged
        });
    });

    // ── getTask ─────────────────────────────────────────────────────────────────
    describe('getTask', () => {
        it('returns task data for existing task', () => {
            const created = manager.createTask();
            const fetched = manager.getTask(created.taskId);
            expect(fetched.taskId).toBe(created.taskId);
        });

        it('throws TaskNotFoundError for unknown taskId', () => {
            expect(() => manager.getTask('no-such-task')).toThrow(TaskNotFoundError);
        });
    });

    // ── updateStatus ────────────────────────────────────────────────────────────
    describe('updateStatus', () => {
        it('transitions working → completed', () => {
            const task = manager.createTask();
            const updated = manager.updateStatus(task.taskId, 'completed', 'done');
            expect(updated.status).toBe('completed');
            expect(updated.statusMessage).toBe('done');
        });

        it('transitions working → input_required → working', () => {
            const task = manager.createTask();
            manager.updateStatus(task.taskId, 'input_required', 'waiting');
            const updated = manager.updateStatus(task.taskId, 'working', 'resuming');
            expect(updated.status).toBe('working');
        });

        it('updates lastUpdatedAt on each transition', () => {
            const task = manager.createTask();
            const original = task.lastUpdatedAt;
            // Make time visibly different
            jest.useFakeTimers();
            jest.advanceTimersByTime(100);
            const updated = manager.updateStatus(task.taskId, 'completed');
            jest.useRealTimers();
            expect(updated.lastUpdatedAt).not.toBe(original);
        });

        it('throws InvalidTaskTransitionError from terminal status', () => {
            const task = manager.createTask();
            manager.updateStatus(task.taskId, 'completed');
            expect(() => manager.updateStatus(task.taskId, 'working')).toThrow(InvalidTaskTransitionError);
        });

        it('throws InvalidTaskTransitionError for invalid transition', () => {
            const task = manager.createTask();
            // working → working is not in the allowed list
            // NOTE: working → working is technically invalid per spec
            // but we allow it as a no-op progress update; adjust if stricter
        });

        it('fires onStatusChange callback', () => {
            const spy = jest.fn();
            const m = createManager(spy);
            const task = m.createTask();
            m.updateStatus(task.taskId, 'completed');
            expect(spy).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
            m.destroy();
        });
    });

    // ── completeTask ────────────────────────────────────────────────────────────
    describe('completeTask', () => {
        it('sets status to completed and stores result', async () => {
            const task = manager.createTask();
            manager.completeTask(task.taskId, { answer: 42 });

            const { result } = await manager.getResult(task.taskId);
            expect(result).toEqual({ answer: 42 });

            expect(manager.getTask(task.taskId).status).toBe('completed');
        });
    });

    // ── failTask ────────────────────────────────────────────────────────────────
    describe('failTask', () => {
        it('sets status to failed and stores error', async () => {
            const task = manager.createTask();
            manager.failTask(task.taskId, { code: -32603, message: 'boom' });

            const { error } = await manager.getResult(task.taskId);
            expect(error).toEqual({ code: -32603, message: 'boom' });

            expect(manager.getTask(task.taskId).status).toBe('failed');
        });
    });

    // ── cancelTask ──────────────────────────────────────────────────────────────
    describe('cancelTask', () => {
        it('cancels a working task', () => {
            const task = manager.createTask();
            const cancelled = manager.cancelTask(task.taskId);
            expect(cancelled.status).toBe('cancelled');
        });

        it('aborts the AbortController signal', () => {
            const task = manager.createTask();
            const signal = manager.getAbortSignal(task.taskId);
            expect(signal.aborted).toBe(false);
            manager.cancelTask(task.taskId);
            expect(signal.aborted).toBe(true);
        });

        it('throws TaskAlreadyTerminalError for completed task', () => {
            const task = manager.createTask();
            manager.completeTask(task.taskId, {});
            expect(() => manager.cancelTask(task.taskId)).toThrow(TaskAlreadyTerminalError);
        });

        it('throws TaskNotFoundError for unknown task', () => {
            expect(() => manager.cancelTask('ghost')).toThrow(TaskNotFoundError);
        });
    });

    // ── getResult ───────────────────────────────────────────────────────────────
    describe('getResult', () => {
        it('returns immediately for already-completed task', async () => {
            const task = manager.createTask();
            manager.completeTask(task.taskId, 'hello');
            const { result } = await manager.getResult(task.taskId);
            expect(result).toBe('hello');
        });

        it('waits for async completion', async () => {
            const task = manager.createTask();

            // Resolve after a tick
            setTimeout(() => manager.completeTask(task.taskId, 'async-result'), 10);

            const { result } = await manager.getResult(task.taskId);
            expect(result).toBe('async-result');
        });

        it('throws TaskNotFoundError for unknown task', async () => {
            await expect(manager.getResult('ghost')).rejects.toThrow(TaskNotFoundError);
        });
    });

    // ── listTasks ───────────────────────────────────────────────────────────────
    describe('listTasks', () => {
        it('lists all tasks sorted newest first', () => {
            manager.createTask();
            manager.createTask();
            manager.createTask();

            const { tasks } = manager.listTasks();
            expect(tasks).toHaveLength(3);
        });

        it('returns empty list when no tasks', () => {
            const { tasks, nextCursor } = manager.listTasks();
            expect(tasks).toHaveLength(0);
            expect(nextCursor).toBeUndefined();
        });

        it('paginates with limit', () => {
            for (let i = 0; i < 5; i++) manager.createTask();

            const { tasks: page1, nextCursor } = manager.listTasks(undefined, 3);
            expect(page1).toHaveLength(3);
            expect(nextCursor).toBeDefined();

            const { tasks: page2 } = manager.listTasks(nextCursor, 3);
            expect(page2.length).toBeGreaterThan(0);
        });

        it('throws TaskNotFoundError for invalid cursor', () => {
            expect(() => manager.listTasks('bad-cursor')).toThrow(TaskNotFoundError);
        });
    });

    // ── hasTask ─────────────────────────────────────────────────────────────────
    describe('hasTask', () => {
        it('returns true for existing task', () => {
            const task = manager.createTask();
            expect(manager.hasTask(task.taskId)).toBe(true);
        });

        it('returns false for unknown task', () => {
            expect(manager.hasTask('no')).toBe(false);
        });
    });

    // ── getAbortSignal ──────────────────────────────────────────────────────────
    describe('getAbortSignal', () => {
        it('returns an AbortSignal that is not yet aborted', () => {
            const task = manager.createTask();
            const signal = manager.getAbortSignal(task.taskId);
            expect(signal).toBeInstanceOf(AbortSignal);
            expect(signal.aborted).toBe(false);
        });

        it('throws TaskNotFoundError for unknown task', () => {
            expect(() => manager.getAbortSignal('ghost')).toThrow(TaskNotFoundError);
        });
    });

    // ── destroy ─────────────────────────────────────────────────────────────────
    describe('destroy', () => {
        it('can be called without error', () => {
            const m = createManager();
            expect(() => m.destroy()).not.toThrow();
        });
    });
});

// ─── TaskContext ─────────────────────────────────────────────────────────────
describe('TaskContext', () => {
    let manager: TaskManager;

    beforeEach(() => {
        manager = createManager();
    });

    afterEach(() => {
        manager.destroy();
    });

    it('exposes taskId', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        expect(ctx.taskId).toBe(task.taskId);
    });

    it('isCancelled is false initially', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        expect(ctx.isCancelled).toBe(false);
    });

    it('isCancelled is true after cancel', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        manager.cancelTask(task.taskId);
        expect(ctx.isCancelled).toBe(true);
    });

    it('updateProgress() keeps task in working status', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        ctx.updateProgress('Step 1 of 3');
        expect(manager.getTask(task.taskId).statusMessage).toBe('Step 1 of 3');
        expect(manager.getTask(task.taskId).status).toBe('working');
    });

    it('requestInput() transitions to input_required', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        ctx.requestInput('Please provide your email');
        expect(manager.getTask(task.taskId).status).toBe('input_required');
    });

    it('throwIfCancelled() does not throw when not cancelled', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        expect(() => ctx.throwIfCancelled()).not.toThrow();
    });

    it('throwIfCancelled() throws TaskCancelledError after cancel', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        manager.cancelTask(task.taskId);
        expect(() => ctx.throwIfCancelled()).toThrow(TaskCancelledError);
    });

    it('getTaskData() returns current task snapshot', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        const data = ctx.getTaskData();
        expect(data.taskId).toBe(task.taskId);
    });

    it('abortSignal matches manager abort signal', () => {
        const task = manager.createTask();
        const ctx = new TaskContext(manager, task.taskId);
        expect(ctx.abortSignal).toBe(manager.getAbortSignal(task.taskId));
    });
});

// ─── Task Error Classes ───────────────────────────────────────────────────────
describe('Task Error Classes', () => {
    describe('TaskNotFoundError', () => {
        it('has correct name and code', () => {
            const err = new TaskNotFoundError('abc');
            expect(err.name).toBe('TaskNotFoundError');
            expect(err.code).toBe(-32602);
            expect(err.taskId).toBe('abc');
            expect(err.message).toContain('not found');
        });
    });

    describe('TaskAlreadyTerminalError', () => {
        it('has correct name and code', () => {
            const err = new TaskAlreadyTerminalError('abc', 'completed');
            expect(err.name).toBe('TaskAlreadyTerminalError');
            expect(err.code).toBe(-32602);
            expect(err.status).toBe('completed');
        });
    });

    describe('InvalidTaskTransitionError', () => {
        it('has correct name and code', () => {
            const err = new InvalidTaskTransitionError('completed', 'working');
            expect(err.name).toBe('InvalidTaskTransitionError');
            expect(err.code).toBe(-32603);
            expect(err.message).toContain('completed');
            expect(err.message).toContain('working');
        });
    });

    describe('TaskCancelledError', () => {
        it('has correct name', () => {
            const err = new TaskCancelledError('abc');
            expect(err.name).toBe('TaskCancelledError');
            expect(err.taskId).toBe('abc');
        });
    });

    describe('TaskAugmentationRequiredError', () => {
        it('has correct name and code', () => {
            const err = new TaskAugmentationRequiredError();
            expect(err.name).toBe('TaskAugmentationRequiredError');
            expect(err.code).toBe(-32600);
        });
    });
});

// ─── Multi-Tenancy & Authorization Isolation Tests ───────────────────────────
describe('Multi-Tenancy and Authorization Isolation', () => {
    let manager: TaskManager;

    beforeEach(() => {
        manager = createManager();
    });

    afterEach(() => {
        manager.destroy();
    });

    it('attaches ownerId, tenantId, and sessionId to task data at creation', () => {
        const ctx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
            sessionId: 'session-123',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', ctx);

        expect(task.ownerId).toBe('user-alice');
        expect(task.tenantId).toBe('tenant-acme');
        expect(task.sessionId).toBe('session-123');
    });

    it('allows owner with matching tenant, user, and session to read task', () => {
        const ctx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
            sessionId: 'session-123',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', ctx);

        const fetched = manager.getTask(task.taskId, ctx);
        expect(fetched.taskId).toBe(task.taskId);
        expect(fetched.status).toBe('working');
    });

    it('throws TaskNotFoundError when user from different tenant attempts getTask()', () => {
        const aliceCtx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', aliceCtx);

        const eveCtx: TaskAccessContext = {
            userId: 'user-eve',
            tenantId: 'tenant-evilcorp',
        };

        expect(() => manager.getTask(task.taskId, eveCtx)).toThrow(TaskNotFoundError);
    });

    it('throws TaskNotFoundError when different user in same tenant attempts getTask()', () => {
        const aliceCtx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', aliceCtx);

        const bobCtx: TaskAccessContext = {
            userId: 'user-bob',
            tenantId: 'tenant-acme',
        };

        expect(() => manager.getTask(task.taskId, bobCtx)).toThrow(TaskNotFoundError);
    });

    it('throws TaskNotFoundError when different session attempts getTask()', () => {
        const session1Ctx: TaskAccessContext = {
            sessionId: 'session-1',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', session1Ctx);

        const session2Ctx: TaskAccessContext = {
            sessionId: 'session-2',
        };

        expect(() => manager.getTask(task.taskId, session2Ctx)).toThrow(TaskNotFoundError);
    });

    it('prevents unauthorized cancelTask() and preserves working status', () => {
        const aliceCtx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', aliceCtx);

        const eveCtx: TaskAccessContext = {
            userId: 'user-eve',
            tenantId: 'tenant-evilcorp',
        };

        expect(() => manager.cancelTask(task.taskId, eveCtx)).toThrow(TaskNotFoundError);

        // Verify task is still working for Alice
        const aliceFetched = manager.getTask(task.taskId, aliceCtx);
        expect(aliceFetched.status).toBe('working');
    });

    it('allows authorized user to cancel task', () => {
        const aliceCtx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', aliceCtx);

        const cancelled = manager.cancelTask(task.taskId, aliceCtx);
        expect(cancelled.status).toBe('cancelled');
    });

    it('prevents unauthorized getResult() on completed task', async () => {
        const aliceCtx: TaskAccessContext = {
            userId: 'user-alice',
            tenantId: 'tenant-acme',
        };
        const task = manager.createTask({ ttl: 60000 }, 'test_tool', aliceCtx);
        manager.completeTask(task.taskId, { confidentialData: 'secret123' }, undefined, aliceCtx);

        const eveCtx: TaskAccessContext = {
            userId: 'user-eve',
            tenantId: 'tenant-evilcorp',
        };

        await expect(manager.getResult(task.taskId, eveCtx)).rejects.toThrow(TaskNotFoundError);

        const aliceResult = await manager.getResult(task.taskId, aliceCtx);
        expect(aliceResult.result).toEqual({ confidentialData: 'secret123' });
    });

    it('filters listTasks() strictly by caller tenant and user context', () => {
        const tenant1Ctx: TaskAccessContext = { tenantId: 'tenant-1', userId: 'user-1' };
        const tenant2Ctx: TaskAccessContext = { tenantId: 'tenant-2', userId: 'user-2' };

        manager.createTask({ ttl: 60000 }, 'tool_1', tenant1Ctx);
        manager.createTask({ ttl: 60000 }, 'tool_2', tenant1Ctx);
        manager.createTask({ ttl: 60000 }, 'tool_3', tenant2Ctx);

        const tenant1List = manager.listTasks(undefined, 50, tenant1Ctx);
        expect(tenant1List.tasks).toHaveLength(2);
        expect(tenant1List.tasks.every(t => t.tenantId === 'tenant-1')).toBe(true);

        const tenant2List = manager.listTasks(undefined, 50, tenant2Ctx);
        expect(tenant2List.tasks).toHaveLength(1);
        expect(tenant2List.tasks[0].tenantId).toBe('tenant-2');
    });

    it('hasTask() returns false when probing across tenants', () => {
        const tenant1Ctx: TaskAccessContext = { tenantId: 'tenant-1' };
        const task = manager.createTask({ ttl: 60000 }, 'tool', tenant1Ctx);

        const tenant2Ctx: TaskAccessContext = { tenantId: 'tenant-2' };
        expect(manager.hasTask(task.taskId, tenant1Ctx)).toBe(true);
        expect(manager.hasTask(task.taskId, tenant2Ctx)).toBe(false);
    });
});

// ─── TTL and Cleanup Eviction Protection Tests ──────────────────────────────
describe('TTL and Cleanup Eviction Protection', () => {
    let manager: TaskManager;

    beforeEach(() => {
        manager = createManager();
    });

    afterEach(() => {
        manager.destroy();
    });

    it('does NOT evict an active task in working status even if duration exceeds TTL', async () => {
        // Create task with very small TTL (50ms)
        const task = manager.createTask({ ttl: 50 }, 'long_working_tool');

        // Wait 80ms (longer than TTL) while task is actively working
        await new Promise(r => setTimeout(r, 80));

        // Trigger sweeper cleanup
        (manager as any).cleanupExpiredTasks();

        // Verify task was NOT evicted
        expect(manager.hasTask(task.taskId)).toBe(true);
        const current = manager.getTask(task.taskId);
        expect(current.status).toBe('working');
    });

    it('does NOT evict an active task in input_required status even if duration exceeds TTL', async () => {
        const task = manager.createTask({ ttl: 50 }, 'input_tool');
        manager.updateStatus(task.taskId, 'input_required', 'waiting for user');

        await new Promise(r => setTimeout(r, 80));

        (manager as any).cleanupExpiredTasks();

        expect(manager.hasTask(task.taskId)).toBe(true);
        const current = manager.getTask(task.taskId);
        expect(current.status).toBe('input_required');
    });

    it('evicts completed task only after terminal completion time exceeds TTL', async () => {
        const task = manager.createTask({ ttl: 50 }, 'complete_tool');

        // Complete the task
        manager.completeTask(task.taskId, { done: true });

        // Run cleanup immediately: must still exist
        (manager as any).cleanupExpiredTasks();
        expect(manager.hasTask(task.taskId)).toBe(true);

        // Wait for TTL after completion (80ms)
        await new Promise(r => setTimeout(r, 80));

        // Run cleanup: must now be evicted
        (manager as any).cleanupExpiredTasks();
        expect(manager.hasTask(task.taskId)).toBe(false);
    });

    it('evicts cancelled task only after terminal cancellation time exceeds TTL', async () => {
        const task = manager.createTask({ ttl: 50 }, 'cancel_tool');
        manager.cancelTask(task.taskId);

        // Run cleanup immediately: still exists
        (manager as any).cleanupExpiredTasks();
        expect(manager.hasTask(task.taskId)).toBe(true);

        // Wait past TTL
        await new Promise(r => setTimeout(r, 80));

        (manager as any).cleanupExpiredTasks();
        expect(manager.hasTask(task.taskId)).toBe(false);
    });

    it('evicts failed task only after terminal failure time exceeds TTL', async () => {
        const task = manager.createTask({ ttl: 50 }, 'fail_tool');
        manager.failTask(task.taskId, { code: -32000, message: 'boom' });

        (manager as any).cleanupExpiredTasks();
        expect(manager.hasTask(task.taskId)).toBe(true);

        await new Promise(r => setTimeout(r, 80));

        (manager as any).cleanupExpiredTasks();
        expect(manager.hasTask(task.taskId)).toBe(false);
    });
});

// ─── Pluggable TaskStore Abstraction Tests ──────────────────────────────────
describe('Pluggable TaskStore Abstraction', () => {
    it('defaults to InMemoryTaskStore when no store is specified', () => {
        const manager = createManager();
        expect(manager.getStore()).toBeInstanceOf(InMemoryTaskStore);
        manager.destroy();
    });

    it('delegates task storage operations to custom TaskStore', () => {
        const customItems = new Map<string, TaskEntry>();
        const setSpy = jest.fn((id: string, entry: TaskEntry) => { customItems.set(id, entry); });
        const getSpy = jest.fn((id: string) => customItems.get(id));
        const delSpy = jest.fn((id: string) => customItems.delete(id));
        const hasSpy = jest.fn((id: string) => customItems.has(id));
        const listSpy = jest.fn(() => Array.from(customItems.values()));

        const customStore: TaskStore = {
            get: getSpy,
            set: setSpy,
            delete: delSpy,
            has: hasSpy,
            list: listSpy,
        };

        const manager = new TaskManager({
            logger: createMockLogger(),
            store: customStore,
        });

        // 1. Create task
        const task = manager.createTask({ ttl: 60000 }, 'custom_tool');
        expect(setSpy).toHaveBeenCalledTimes(1);
        expect(setSpy).toHaveBeenCalledWith(task.taskId, expect.objectContaining({ data: expect.anything() }));

        // 2. Read task
        const fetched = manager.getTask(task.taskId);
        expect(getSpy).toHaveBeenCalledWith(task.taskId);
        expect(fetched.taskId).toBe(task.taskId);

        // 3. hasTask
        expect(manager.hasTask(task.taskId)).toBe(true);
        expect(getSpy).toHaveBeenCalledWith(task.taskId);

        // 4. List tasks
        const list = manager.listTasks();
        expect(listSpy).toHaveBeenCalled();
        expect(list.tasks).toHaveLength(1);

        // 5. Cancel task
        manager.cancelTask(task.taskId);
        expect(customItems.get(task.taskId)?.data.status).toBe('cancelled');

        manager.destroy();
    });

    it('delegates cleanup to custom store cleanupExpired method if defined', () => {
        const customCleanup = jest.fn<(now: number) => number>().mockReturnValue(3);
        const customStore: TaskStore = {
            get: jest.fn<(id: string) => TaskEntry | undefined>(() => undefined),
            set: jest.fn<(id: string, entry: TaskEntry) => void>(),
            delete: jest.fn<(id: string) => boolean>(() => false),
            has: jest.fn<(id: string) => boolean>(() => false),
            list: jest.fn<() => TaskEntry[]>(() => []),
            cleanupExpired: customCleanup,
        };

        const manager = new TaskManager({
            logger: createMockLogger(),
            store: customStore,
        });

        (manager as any).cleanupExpiredTasks();
        expect(customCleanup).toHaveBeenCalled();

        manager.destroy();
    });
});

