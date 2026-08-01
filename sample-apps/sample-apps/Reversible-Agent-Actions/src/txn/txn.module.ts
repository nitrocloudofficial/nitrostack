import { Module } from '@nitrostack/core';
import { TransactionTools } from './tools/transaction.tools.js';
import { HealthTools } from './tools/health.tools.js';
import { RegistryResources } from './resources/registry.resources.js';
import { PlanningPrompts } from './prompts/planning.prompts.js';
import { JournalService } from './services/journal.service.js';
import { TransactionService } from './services/transaction.service.js';
import { CompensatorRegistry } from './services/registry.service.js';
import { ReversibilityClassifier } from './services/classifier.service.js';
import { RollbackOrchestrator } from './services/rollback.service.js';
import { PreflightPlanner } from './services/preflight.service.js';
import { TxnAuditListener } from './services/audit.service.js';
import { TransactionContext } from './services/transaction-context.service.js';
import { ServerInfo } from './services/server-info.service.js';
import { ApiKeyGateService } from './services/api-key-gate.service.js';

/**
 * @nitrostack/core's ModuleMetadata has no `interceptors`/`filters` keys — those
 * are applied per-tool-method via @UseInterceptors/@UseFilters, not at module
 * scope. JournalInterceptor is already wired that way on every mutating target
 * tool (src/targets/*). TxnExceptionFilter is wired the same way on
 * TransactionTools' methods (see transaction.tools.ts).
 *
 * Its Provider type also has no `scope` field — there is no per-request DI
 * scoping in this container, so TransactionContext is a plain singleton (see
 * transaction-context.service.ts for the operational implication).
 */
@Module({
  name: 'txn',
  description: 'Reversible transaction boundary for MCP agent tool calls',
  controllers: [TransactionTools, HealthTools, RegistryResources, PlanningPrompts],
  providers: [
    JournalService,
    TransactionService,
    CompensatorRegistry,
    ReversibilityClassifier,
    RollbackOrchestrator,
    PreflightPlanner,
    TxnAuditListener,
    TransactionContext,
    ServerInfo,
    ApiKeyGateService,
  ],
  exports: [CompensatorRegistry, JournalService],
})
export class TxnModule {}
