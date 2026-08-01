import { Injectable, ToolDecorator as Tool, UseFilters, Widget, Cache, emitEvent, z } from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { TransactionService } from '../services/transaction.service.js';
import { JournalService } from '../services/journal.service.js';
import { RollbackOrchestrator } from '../services/rollback.service.js';
import { PreflightPlanner } from '../services/preflight.service.js';
import { CompensatorRegistry } from '../services/registry.service.js';
import { TransactionContext } from '../services/transaction-context.service.js';
import { TxnExceptionFilter } from '../filters/txn-exception.filter.js';

/**
 * ApiKeyGuard/RollbackGuard are deliberately NOT wired here with @UseGuards.
 *
 * Both require data no real MCP client has a way to attach: ApiKeyGuard needs
 * ctx.metadata.apiKey and RollbackGuard needs ctx.metadata.transactionId, both
 * sourced from MCP request `_meta` — but `_meta` is protocol-level metadata a
 * client library populates, not something a calling agent (or NitroStudio,
 * Claude Desktop, etc.) can set per tool call. Wiring them as guards made
 * every one of these tools permanently fail with UNAUTHENTICATED for every
 * real client, confirmed by testing against a live NitroStudio connection.
 *
 * ExecutionContext.auth is never populated by this SDK for any transport
 * either (confirmed: zero references to `.auth` in server.js) — even
 * OAuthModule's real auth middleware only gates the HTTP request before it
 * reaches the MCP layer (req.auth), it never bridges into a tool's
 * ExecutionContext. So there is no per-call caller identity available to any
 * tool handler without building a full OAuth flow, which is out of scope here.
 *
 * The actual, working security boundary is at the HTTP transport level (see
 * attachApiKeyMiddleware in src/index.ts) — it protects the deployed server
 * from the public internet without blocking any real client's normal tool
 * calls, matching how OAuthModule itself works.
 */

const BeginTransactionSchema = z.object({
  label: z.string().min(3).describe('Human-readable intent, e.g. "onboard acme-corp". Appears in the audit trail.'),
  scope: z
    .array(z.enum(['crm', 'messaging', 'billing']))
    .min(1)
    .describe('Systems this transaction may touch. Tool calls outside this list are blocked.'),
  ttlSeconds: z
    .number()
    .int()
    .positive()
    .max(86400)
    .default(3600)
    .describe('Auto-commit after this long. Prevents orphaned journals.'),
});

const PreflightPlanSchema = z.object({
  steps: z
    .array(z.object({ toolName: z.string(), input: z.record(z.unknown()).optional() }))
    .min(1)
    .max(50),
});

const GetTransactionSchema = z.object({
  transactionId: z.string(),
  includeJournal: z.boolean().default(true),
});

const RollbackTransactionSchema = z.object({
  transactionId: z.string(),
  reason: z.string().min(3).describe('Why this is being reversed. Recorded in the audit trail.'),
  conflictPolicy: z
    .enum(['abort', 'skip', 'force'])
    .default('abort')
    .describe(
      'abort: stop if a resource changed since capture (DEFAULT, SAFEST). skip: leave changed resources. force: overwrite — MAY PERMANENTLY DESTROY CONCURRENT HUMAN EDITS.'
    ),
  dryRun: z.boolean().default(false).describe('Report what would happen without calling any compensator.'),
});

const CommitTransactionSchema = z.object({ transactionId: z.string() });

/** Five thin MCP tool wrappers over the transaction/journal/rollback/preflight services. */
@Injectable({
  deps: [TransactionService, JournalService, RollbackOrchestrator, PreflightPlanner, CompensatorRegistry, TransactionContext],
})
export class TransactionTools {
  constructor(
    private readonly txns: TransactionService,
    private readonly journal: JournalService,
    private readonly rollbacks: RollbackOrchestrator,
    private readonly planner: PreflightPlanner,
    private readonly registry: CompensatorRegistry,
    private readonly txnCtx: TransactionContext
  ) {}

  @Tool({
    name: 'begin_transaction',
    description:
      'Open a reversible transaction boundary. Every tool call while this transaction is open is journalled and can be compensated by rollback_transaction. Call this before starting any multi-step plan that writes to external systems.',
    inputSchema: BeginTransactionSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  })
  @UseFilters(TxnExceptionFilter)
  async begin(input: z.infer<typeof BeginTransactionSchema>, ctx: ExecutionContext) {
    const txn = this.txns.open({
      label: input.label,
      scope: input.scope,
      ttlSeconds: input.ttlSeconds,
      actor: ctx.auth?.subject ?? 'anonymous',
    });
    this.txnCtx.setActive(txn.id, txn.scope);
    emitEvent('txn.opened', { txnId: txn.id, label: txn.label, scope: txn.scope });
    return {
      transactionId: txn.id,
      status: txn.status,
      scope: txn.scope,
      message: `Transaction open. Journal ID: ${txn.id}`,
    };
  }

  @Tool({
    name: 'preflight_plan',
    description:
      'Classify a proposed plan for reversibility WITHOUT executing anything. Returns per-step class, the pivot index (first irreversible step), and a suggested reordering that places irreversible steps last. ADVISORY ONLY — suggested order ignores data dependencies.',
    inputSchema: PreflightPlanSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  })
  @Widget('txn-timeline')
  @Cache({ ttl: 60 })
  async preflight(input: z.infer<typeof PreflightPlanSchema>) {
    return this.planner.analyse(input.steps);
  }

  @Tool({
    name: 'get_transaction',
    description:
      'Inspect a transaction: its journal, current status, and reversibility profile. Use this to check what a transaction has done before rolling it back.',
    inputSchema: GetTransactionSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  })
  @Widget('txn-timeline')
  @UseFilters(TxnExceptionFilter)
  async get(input: z.infer<typeof GetTransactionSchema>) {
    const txn = this.txns.get(input.transactionId);
    const steps = input.includeJournal ? this.journal.steps(input.transactionId) : [];
    const profile = this.txns.reversibilityProfile(input.transactionId);
    return { transaction: txn, steps, profile };
  }

  @Tool({
    name: 'rollback_transaction',
    description:
      'Compensate every reversible step of a transaction in strict reverse order. Irreversible steps are skipped and reported for manual handling. Returns a per-step report. A PARTIAL result means some actions require human attention.',
    inputSchema: RollbackTransactionSchema,
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    // @nitrostack/core has no @Task decorator — long-running/progress-reporting tools
    // opt in via taskSupport on @Tool instead.
    taskSupport: 'optional',
  })
  @Widget('txn-timeline')
  @UseFilters(TxnExceptionFilter)
  async rollback(input: z.infer<typeof RollbackTransactionSchema>, ctx: ExecutionContext) {
    return this.rollbacks.run(input.transactionId, {
      conflictPolicy: input.conflictPolicy,
      reason: input.reason,
      dryRun: input.dryRun,
      // ExecutionContext.task only exposes updateProgress(message); there is no
      // numeric (done, total) progress API, so we fold them into the message.
      onProgress: (done, total, message) => ctx.task?.updateProgress(`${message} (${done}/${total})`),
    });
  }

  @Tool({
    name: 'commit_transaction',
    description:
      'Close the transaction boundary. Committed transactions cannot be reversed. Call this when all steps succeeded and you want to discard the compensation data.',
    inputSchema: CommitTransactionSchema,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  })
  @UseFilters(TxnExceptionFilter)
  async commit(input: z.infer<typeof CommitTransactionSchema>, ctx: ExecutionContext) {
    const txn = this.txns.commit(input.transactionId);
    emitEvent('txn.committed', { txnId: input.transactionId });
    return {
      transactionId: txn.id,
      status: txn.status,
      message: 'Transaction committed. Compensation data discarded.',
    };
  }
}
