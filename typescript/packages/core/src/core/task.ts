import { v4 as uuidv4 } from 'uuid';
import { Logger, ExecutionContext, JsonValue } from './types.js';

// ============================================================================
// Task Status
// ============================================================================

/**
 * Task status values as per MCP spec
 * 
 * Lifecycle:
 * - `working` → `input_required` | `completed` | `failed` | `cancelled`
 * - `input_required` → `working` | `completed` | `failed` | `cancelled`
 * - `completed`, `failed`, `cancelled` are terminal — no further transitions
 */
export type TaskStatus = 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled';

/**
 * Terminal statuses — tasks in these states cannot transition further
 */
export const TERMINAL_STATUSES: TaskStatus[] = ['completed', 'failed', 'cancelled'];

/**
 * Check if a status is terminal
 */
export function isTerminalStatus(status: TaskStatus): boolean {
    return TERMINAL_STATUSES.includes(status);
}

// ============================================================================
// Task Data Types
// ============================================================================

/**
 * Caller access context for task authorization and tenant isolation
 */
export interface TaskAccessContext {
    /** User/Subject ID of the caller */
    userId?: string;
    /** Tenant ID of the caller */
    tenantId?: string;
    /** MCP Session ID of the caller */
    sessionId?: string;
}

/**
 * Task data structure as per MCP spec
 */
export interface TaskData {
    /** Unique identifier for the task */
    taskId: string;
    /** Current state of the task execution */
    status: TaskStatus;
    /** Optional human-readable message describing the current state */
    statusMessage?: string;
    /** ISO 8601 timestamp when the task was created */
    createdAt: string;
    /** ISO 8601 timestamp when the task status was last updated */
    lastUpdatedAt: string;
    /** Time in milliseconds from creation before task may be deleted */
    ttl: number | null;
    /** Suggested time in milliseconds between status checks */
    pollInterval?: number;
    /** User/Subject ID of the task creator */
    ownerId?: string;
    /** Tenant ID of the task creator */
    tenantId?: string;
    /** MCP Session ID of the task creator (in stateful mode) */
    sessionId?: string;
}

/**
 * Task parameters that can be sent with a task-augmented request
 */
export interface TaskParams {
    /** Requested TTL in milliseconds */
    ttl?: number;
    /** User ID */
    ownerId?: string;
    /** Tenant ID */
    tenantId?: string;
    /** Session ID */
    sessionId?: string;
}

/**
 * Related task metadata for associating messages with tasks
 */
export interface RelatedTaskMeta {
    taskId: string;
}

/**
 * CreateTaskResult — returned when a task-augmented request is accepted
 */
export interface CreateTaskResult {
    task: TaskData;
}

/**
 * Task execution support level for tools
 */
export type TaskSupportLevel = 'required' | 'optional' | 'forbidden';

// ============================================================================
// Internal Task Store Entry
// ============================================================================

/**
 * Internal task entry with execution details
 */
export interface TaskEntry {
    /** Task data (protocol-visible) */
    data: TaskData;
    /** The pending result (resolved when task completes) */
    result?: unknown;
    /** Error if the task failed */
    error?: { code: number; message: string; data?: unknown };
    /** Abort controller for cancellation */
    abortController: AbortController;
    /** Promise that resolves when the task reaches a terminal state */
    completionPromise: Promise<void>;
    /** Resolver for the completion promise */
    resolveCompletion: () => void;
    /** Associated tool name */
    toolName?: string;
    /** User/Subject ID */
    ownerId?: string;
    /** Tenant ID */
    tenantId?: string;
    /** Session ID */
    sessionId?: string;
}

// ============================================================================
// Task Manager
// ============================================================================

/**
 * TaskManager handles the full lifecycle of MCP tasks.
 * 
 * It provides:
 * - In-memory task storage with TTL-based cleanup
 * - Task creation, status updates, and result retrieval
 * - Cancellation support
 * - Status change notifications via callbacks
 * 
 * @example
 * ```typescript
 * const taskManager = new TaskManager({ logger, defaultTtl: 60000 });
 * 
 * // Create a task for a long-running operation
 * const task = taskManager.createTask({ ttl: 120000 });
 * 
 * // Update status as work progresses
 * taskManager.updateStatus(task.taskId, 'working', 'Processing step 2 of 5');
 * 
 * // Complete with result
 * taskManager.completeTask(task.taskId, { data: 'result' });
 * ```
 */
export class TaskManager {
    private tasks: Map<string, TaskEntry> = new Map();
    private logger: Logger;
    private defaultTtl: number;
    private defaultPollInterval: number;
    private cleanupInterval?: ReturnType<typeof setInterval>;
    private onStatusChange?: (taskData: TaskData) => void;

    constructor(options: {
        logger: Logger;
        /** Default TTL in ms (default: 300000 = 5 minutes) */
        defaultTtl?: number;
        /** Default poll interval in ms (default: 2000 = 2 seconds) */
        defaultPollInterval?: number;
        /** Callback fired on every status change (for notifications) */
        onStatusChange?: (taskData: TaskData) => void;
    }) {
        this.logger = options.logger;
        this.defaultTtl = options.defaultTtl ?? 300000; // 5 minutes
        this.defaultPollInterval = options.defaultPollInterval ?? 2000;
        this.onStatusChange = options.onStatusChange;

        // Start periodic cleanup of expired tasks
        this.cleanupInterval = setInterval(() => this.cleanupExpiredTasks(), 30000);
    }

    /**
     * Create a new task
     */
    createTask(params?: TaskParams, toolName?: string, accessContext?: TaskAccessContext): TaskData {
        const taskId = uuidv4();
        const now = new Date().toISOString();
        const ttl = params?.ttl ?? this.defaultTtl;

        const ownerId = accessContext?.userId || params?.ownerId;
        const tenantId = accessContext?.tenantId || params?.tenantId;
        const sessionId = accessContext?.sessionId || params?.sessionId;

        let resolveCompletion: () => void;
        const completionPromise = new Promise<void>((resolve) => {
            resolveCompletion = resolve;
        });

        const data: TaskData = {
            taskId,
            status: 'working',
            createdAt: now,
            lastUpdatedAt: now,
            ttl,
            pollInterval: this.defaultPollInterval,
            ...(ownerId ? { ownerId } : {}),
            ...(tenantId ? { tenantId } : {}),
            ...(sessionId ? { sessionId } : {}),
        };

        const entry: TaskEntry = {
            data,
            abortController: new AbortController(),
            completionPromise,
            resolveCompletion: resolveCompletion!,
            toolName,
            ownerId,
            tenantId,
            sessionId,
        };

        this.tasks.set(taskId, entry);
        this.logger.info(`Task created: ${taskId}`, { toolName, ownerId, tenantId, sessionId });

        return { ...data };
    }

    /**
     * Verify caller authorization against task owner/tenant/session metadata
     * @throws TaskNotFoundError if access is denied (to avoid disclosing task existence across tenants)
     */
    checkTaskAccess(entry: TaskEntry, context?: TaskAccessContext): void {
        if (!context) return; // Unrestricted internal context

        // Tenant isolation: if task has a tenantId and context has a tenantId, they must match
        if (entry.tenantId && context.tenantId && entry.tenantId !== context.tenantId) {
            throw new TaskNotFoundError(entry.data.taskId);
        }

        // Owner/User isolation: if task has an ownerId and context has a userId, they must match
        if (entry.ownerId && context.userId && entry.ownerId !== context.userId) {
            throw new TaskNotFoundError(entry.data.taskId);
        }

        // Session isolation: if task has a sessionId and context has a sessionId, they must match
        if (entry.sessionId && context.sessionId && entry.sessionId !== context.sessionId) {
            throw new TaskNotFoundError(entry.data.taskId);
        }
    }

    /**
     * Get task data by ID
     * @throws Error if task not found or access denied
     */
    getTask(taskId: string, context?: TaskAccessContext): TaskData {
        const entry = this.getEntry(taskId, context);
        return { ...entry.data };
    }

    /**
     * Update task status
     * @throws Error if transition is invalid or access denied
     */
    updateStatus(taskId: string, status: TaskStatus, statusMessage?: string, context?: TaskAccessContext): TaskData {
        const entry = this.getEntry(taskId, context);

        // Validate transition
        this.validateTransition(entry.data.status, status);

        entry.data.status = status;
        entry.data.lastUpdatedAt = new Date().toISOString();
        if (statusMessage !== undefined) {
            entry.data.statusMessage = statusMessage;
        }

        // If terminal, resolve the completion promise
        if (isTerminalStatus(status)) {
            entry.resolveCompletion();
        }

        this.logger.info(`Task ${taskId} status: ${status}`, { statusMessage });

        // Fire notification callback
        if (this.onStatusChange) {
            this.onStatusChange({ ...entry.data });
        }

        return { ...entry.data };
    }

    /**
     * Complete a task with a successful result
     */
    completeTask(taskId: string, result: unknown, statusMessage?: string, context?: TaskAccessContext): TaskData {
        const entry = this.getEntry(taskId, context);
        entry.result = result;
        return this.updateStatus(taskId, 'completed', statusMessage ?? 'Task completed successfully', context);
    }

    /**
     * Fail a task with an error
     */
    failTask(taskId: string, error: { code: number; message: string; data?: unknown }, statusMessage?: string, context?: TaskAccessContext): TaskData {
        const entry = this.getEntry(taskId, context);
        entry.error = error;
        return this.updateStatus(taskId, 'failed', statusMessage ?? `Task failed: ${error.message}`, context);
    }

    /**
     * Cancel a task
     * @throws Error if task is already in a terminal state or access denied
     */
    cancelTask(taskId: string, context?: TaskAccessContext): TaskData {
        const entry = this.getEntry(taskId, context);

        if (isTerminalStatus(entry.data.status)) {
            throw new TaskAlreadyTerminalError(taskId, entry.data.status);
        }

        // Signal cancellation
        entry.abortController.abort();

        return this.updateStatus(taskId, 'cancelled', 'The task was cancelled by request.', context);
    }

    /**
     * Get the result of a completed task.
     * If the task is still working, this blocks until it reaches a terminal state.
     */
    async getResult(taskId: string, context?: TaskAccessContext): Promise<{ result?: unknown; error?: { code: number; message: string; data?: unknown } }> {
        const entry = this.getEntry(taskId, context);

        // If not terminal, wait for completion
        if (!isTerminalStatus(entry.data.status)) {
            await entry.completionPromise;
        }

        // Re-fetch after awaiting (status may have changed)
        const current = this.getEntry(taskId, context);

        if (current.error) {
            return { error: current.error };
        }

        return { result: current.result };
    }

    /**
     * Get the AbortSignal for a task (useful for cancellation-aware handlers)
     */
    getAbortSignal(taskId: string, context?: TaskAccessContext): AbortSignal {
        const entry = this.getEntry(taskId, context);
        return entry.abortController.signal;
    }

    /**
     * List all tasks with optional cursor-based pagination and tenant/user filtering
     */
    listTasks(cursor?: string, limit: number = 50, context?: TaskAccessContext): { tasks: TaskData[]; nextCursor?: string } {
        const allTasks = Array.from(this.tasks.values())
            .filter(entry => {
                if (!context) return true;
                if (entry.tenantId && context.tenantId && entry.tenantId !== context.tenantId) return false;
                if (entry.ownerId && context.userId && entry.ownerId !== context.userId) return false;
                if (entry.sessionId && context.sessionId && entry.sessionId !== context.sessionId) return false;
                return true;
            })
            .map(e => ({ ...e.data }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        let startIndex = 0;
        if (cursor) {
            const cursorIndex = allTasks.findIndex(t => t.taskId === cursor);
            if (cursorIndex === -1) {
                throw new TaskNotFoundError(cursor);
            }
            startIndex = cursorIndex + 1;
        }

        const page = allTasks.slice(startIndex, startIndex + limit);
        const nextCursor = startIndex + limit < allTasks.length
            ? allTasks[startIndex + limit - 1]?.taskId
            : undefined;

        return { tasks: page, nextCursor };
    }

    /**
     * Check if a task exists
     */
    hasTask(taskId: string, context?: TaskAccessContext): boolean {
        const entry = this.tasks.get(taskId);
        if (!entry) return false;
        if (!context) return true;
        if (entry.tenantId && context.tenantId && entry.tenantId !== context.tenantId) return false;
        if (entry.ownerId && context.userId && entry.ownerId !== context.userId) return false;
        if (entry.sessionId && context.sessionId && entry.sessionId !== context.sessionId) return false;
        return true;
    }

    /**
     * Cleanup expired tasks
     * Only terminal tasks (completed, failed, cancelled) are evicted after their TTL expires.
     * Active tasks (working, input_required) are never evicted while execution is ongoing.
     */
    private cleanupExpiredTasks(): void {
        const now = Date.now();
        for (const [taskId, entry] of this.tasks.entries()) {
            if (entry.data.ttl === null) continue; // Unlimited TTL

            // Active tasks in working or input_required status must not be evicted
            if (!isTerminalStatus(entry.data.status)) {
                continue;
            }

            // Measure TTL from the terminal completion time (lastUpdatedAt), not createdAt
            const terminalTime = new Date(entry.data.lastUpdatedAt).getTime();
            if (now - terminalTime > entry.data.ttl) {
                this.tasks.delete(taskId);
                this.logger.debug(`Expired terminal task cleaned up: ${taskId}`);
            }
        }
    }

    /**
     * Get internal entry or throw
     */
    getEntry(taskId: string, context?: TaskAccessContext): TaskEntry {
        const entry = this.tasks.get(taskId);
        if (!entry) {
            throw new TaskNotFoundError(taskId);
        }
        this.checkTaskAccess(entry, context);
        return entry;
    }

    /**
     * Validate a status transition
     */
    private validateTransition(from: TaskStatus, to: TaskStatus): void {
        if (isTerminalStatus(from)) {
            throw new InvalidTaskTransitionError(from, to);
        }

        // Same-status self-transitions are allowed for progress message updates
        // (e.g., working → working just to update statusMessage)
        if (from === to) return;

        // Valid transitions:
        // working → input_required | completed | failed | cancelled
        // input_required → working | completed | failed | cancelled
        const validTransitions: Record<string, TaskStatus[]> = {
            working: ['input_required', 'completed', 'failed', 'cancelled'],
            input_required: ['working', 'completed', 'failed', 'cancelled'],
        };

        const allowed = validTransitions[from];
        if (!allowed || !allowed.includes(to)) {
            throw new InvalidTaskTransitionError(from, to);
        }
    }

    /**
     * Stop the cleanup interval (call on server shutdown)
     */
    destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }
}

// ============================================================================
// Task Context Helper
// ============================================================================

/**
 * TaskContext provides a developer-friendly interface for working with tasks
 * inside tool handlers. It wraps the TaskManager and provides simple methods
 * to update progress and check for cancellation.
 * 
 * @example
 * ```typescript
 * const tool = new Tool({
 *   name: 'process_data',
 *   taskSupport: 'optional',
 *   handler: async (input, context) => {
 *     const task = context.task; // TaskContext if task-augmented
 *     
 *     if (task) {
 *       task.updateProgress('Starting data processing...');
 *       
 *       for (let i = 0; i < items.length; i++) {
 *         task.throwIfCancelled(); // Throws if client cancelled
 *         await processItem(items[i]);
 *         task.updateProgress(`Processed ${i + 1}/${items.length} items`);
 *       }
 *     }
 *     
 *     return { processed: items.length };
 *   }
 * });
 * ```
 */
export class TaskContext {
    private taskManager: TaskManager;
    private _taskId: string;
    private _abortSignal: AbortSignal;

    constructor(taskManager: TaskManager, taskId: string) {
        this.taskManager = taskManager;
        this._taskId = taskId;
        this._abortSignal = taskManager.getAbortSignal(taskId);
    }

    /** The task ID */
    get taskId(): string {
        return this._taskId;
    }

    /** AbortSignal that triggers when the task is cancelled */
    get abortSignal(): AbortSignal {
        return this._abortSignal;
    }

    /** Whether the task has been cancelled */
    get isCancelled(): boolean {
        return this._abortSignal.aborted;
    }

    /**
     * Update the task status message (keeps status as 'working')
     */
    updateProgress(message: string): void {
        try {
            this.taskManager.updateStatus(this._taskId, 'working', message);
        } catch {
            // Task may have been cancelled/cleaned up — ignore
        }
    }

    /**
     * Transition to input_required status
     */
    requestInput(message: string): void {
        this.taskManager.updateStatus(this._taskId, 'input_required', message);
    }

    /**
     * Throw a TaskCancelledError if the task has been cancelled.
     * Call this periodically in long-running handlers to support cancellation.
     */
    throwIfCancelled(): void {
        if (this._abortSignal.aborted) {
            throw new TaskCancelledError(this._taskId);
        }
    }

    /**
     * Push an intermediate task update (MCP 2026-07-28 `tasks/update`).
     *
     * On the modern path this records progress that the client observes via
     * `tasks/get`; the optional `data` is attached to the status message.
     * Behaves like `updateProgress` on the legacy path so handlers are written
     * once.
     */
    update(message: string, data?: unknown): void {
        const suffix = data !== undefined ? ` ${JSON.stringify(data)}` : '';
        try {
            this.taskManager.updateStatus(this._taskId, 'working', `${message}${suffix}`);
        } catch {
            // Task may have been cancelled/cleaned up — ignore
        }
    }

    /**
     * Get the current task data
     */
    getTaskData(): TaskData {
        return this.taskManager.getTask(this._taskId);
    }
}

// ============================================================================
// Task Errors
// ============================================================================

/**
 * Task not found error (maps to JSON-RPC -32602)
 */
export class TaskNotFoundError extends Error {
    public readonly code = -32602;
    constructor(public readonly taskId: string) {
        super(`Failed to retrieve task: Task not found`);
        this.name = 'TaskNotFoundError';
    }
}

/**
 * Task already in terminal state error (maps to JSON-RPC -32602)
 */
export class TaskAlreadyTerminalError extends Error {
    public readonly code = -32602;
    constructor(public readonly taskId: string, public readonly status: TaskStatus) {
        super(`Cannot cancel task: already in terminal status '${status}'`);
        this.name = 'TaskAlreadyTerminalError';
    }
}

/**
 * Invalid task status transition error
 */
export class InvalidTaskTransitionError extends Error {
    public readonly code = -32603;
    constructor(public readonly fromStatus: TaskStatus, public readonly toStatus: TaskStatus) {
        super(`Invalid task status transition: ${fromStatus} → ${toStatus}`);
        this.name = 'InvalidTaskTransitionError';
    }
}

/**
 * Task cancelled error (thrown by throwIfCancelled())
 */
export class TaskCancelledError extends Error {
    constructor(public readonly taskId: string) {
        super(`Task ${taskId} was cancelled`);
        this.name = 'TaskCancelledError';
    }
}

/**
 * Task augmentation required error (maps to JSON-RPC -32600)
 */
export class TaskAugmentationRequiredError extends Error {
    public readonly code = -32600;
    constructor() {
        super('Task augmentation required for tools/call requests');
        this.name = 'TaskAugmentationRequiredError';
    }
}

/**
 * Task expired error (maps to JSON-RPC -32602)
 */
export class TaskExpiredError extends Error {
    public readonly code = -32602;
    constructor(public readonly taskId: string) {
        super(`Failed to retrieve task: Task has expired`);
        this.name = 'TaskExpiredError';
    }
}
