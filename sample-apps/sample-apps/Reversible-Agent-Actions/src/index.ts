import 'dotenv/config';
import { McpApp, McpApplicationFactory, DIContainer, defaultLogger, triggerLifecycleHook } from '@nitrostack/core';
import type { NitroStackServer } from '@nitrostack/core';
import type { Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { RollbackOrchestrator } from './txn/services/rollback.service.js';
import type { ToolExecutor } from './txn/services/rollback.service.js';
import { JournalInterceptor } from './txn/interceptors/journal.interceptor.js';
import { JournalCapturePipe } from './txn/pipes/journal-capture.pipe.js';
import { TransactionContext } from './txn/services/transaction-context.service.js';
import { ServerInfo } from './txn/services/server-info.service.js';
import { ApiKeyGateService } from './txn/services/api-key-gate.service.js';

// McpApplicationFactory reads @Module metadata from whatever class `module`
// points to (AppModule) — the class @McpApp itself decorates doesn't need its
// own @Module metadata.
//
// Dual HTTP+stdio transport is NOT configured here — @nitrostack/core's
// NitroStackServer.start() (server.js) picks it automatically: NODE_ENV
// 'development'/'dev'/unset -> stdio only, anything else (e.g. 'production')
// -> dual, binding HTTP to process.env.PORT/HOST (default host: 'localhost',
// which nitrostack-cli's `start` script does NOT override — see .env.example,
// HOST=0.0.0.0 is required for the server to be reachable from outside a
// container). MCP_TRANSPORT_TYPE can force a specific mode. None of this is
// read from nitrostack.config.ts, which only carries CLI/widget metadata.
@McpApp({
  module: AppModule,
  server: { name: 'reversible-actions', version: '1.0.0' },
})
export class Application {}

/**
 * Builds the ToolExecutor shared by RollbackOrchestrator (compensator calls),
 * JournalCapturePipe (pre-reads), and JournalInterceptor (post-execution
 * version re-reads) — the bridge from "call this tool by name" back into the
 * same running server's tool registry.
 *
 * Compensator/pre-read/post-read calls made through here must NOT themselves
 * be journaled as new forward steps: the inverse tools (delete_account, etc.)
 * carry the same @UseInterceptors(JournalInterceptor) as their forward
 * counterparts, so without this guard, compensating a step during rollback
 * would append another step to the same transaction's journal. Clearing the
 * shared TransactionContext for the duration of the call makes
 * JournalInterceptor take its "not in a transaction" pass-through path.
 */
function createToolExecutor(server: NitroStackServer, txnCtx: TransactionContext): ToolExecutor {
  return async (toolName, args) => {
    // `tools` is typed private on NitroStackServer (no public lookup-by-name
    // API exists), but is a plain enumerable property at runtime.
    const tool = (
      server as unknown as { tools: Map<string, { execute: (input: unknown, context: unknown) => Promise<unknown> }> }
    ).tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const savedActiveId = txnCtx.activeId;
    const savedActiveScope = txnCtx.activeScope;
    txnCtx.clear();
    try {
      return await tool.execute(args, {
        requestId: `internal-${toolName}`,
        toolName,
        logger: defaultLogger,
        metadata: {},
      });
    } finally {
      if (savedActiveId) txnCtx.setActive(savedActiveId, savedActiveScope);
    }
  };
}

/**
 * Cold-start mitigation: NitroCloud scales to zero, so the first request after
 * idle pays full boot cost. GET /warm lets the demo run sheet ping the server
 * ~90s before presenting, without going through the MCP protocol at all.
 * Requires HTTP transport to be active (see the @McpApp comment above) —
 * getHttpTransport() returns undefined under plain stdio (local dev).
 */
function attachWarmupRoute(server: NitroStackServer): void {
  const httpTransport = server.getHttpTransport();
  const app = httpTransport?.getApp?.();
  if (!app) return;
  app.get('/warm', (_req: Request, res: Response) => {
    res.status(200).json({ warmed: true });
  });
}

async function bootstrap() {
  // There is no exported bootstrap() helper in @nitrostack/core — the real
  // entry point is McpApplicationFactory.create(...).start().
  const app = await McpApplicationFactory.create(Application);

  // McpApplicationFactory.create() never calls triggerLifecycleHook itself, so
  // OnModuleInit hooks (CrmTools/MessagingTools/BillingTools registering
  // themselves with CompensatorRegistry) must be fired explicitly, after all
  // controllers have been resolved into the DI container but before the
  // server starts accepting calls.
  await triggerLifecycleHook(DIContainer.getInstance().getInstances(), 'onModuleInit');

  const container = DIContainer.getInstance();
  const txnCtx = container.resolve(TransactionContext);
  const toolExecutor = createToolExecutor(app, txnCtx);
  container.resolve(RollbackOrchestrator).setToolExecutor(toolExecutor);
  container.resolve(JournalInterceptor).setToolExecutor(toolExecutor);
  container.resolve(JournalCapturePipe).setToolExecutor(toolExecutor);

  // Gives the ping tool a way to report a live tool count (see
  // server-info.service.ts) — the server object itself only exists once
  // create() returns, so a Tool method can't reach it any other way.
  container.resolve(ServerInfo).setServer(app);

  // ApiKeyGateService mounts its Express middleware from an
  // onApplicationBootstrap hook fired *inside* app.start() — before the HTTP
  // transport registers its /mcp routes — so setServer() must run before
  // app.start(), same as ServerInfo above.
  container.resolve(ApiKeyGateService).setServer(app);

  await app.start();

  attachWarmupRoute(app);
}

bootstrap();
