/**
 * Shared test harness — boots the real server without starting a transport.
 *
 * The point is to exercise the PRODUCTION path, not a hand-assembled one:
 * McpApplicationFactory.create() registers the real modules, the real DI
 * singletons, the real @OnEvent subscriptions and the real guard, and
 * installExecutionContextBridge() wraps the real tools. The only thing skipped is
 * `app.start()`, which would block on stdio and serve nothing useful to a test.
 *
 * Consequently a test that passes here is testing the same wiring the demo runs.
 */
import {
  McpApp,
  McpApplicationFactory,
  DIContainer,
  defaultLogger,
  triggerLifecycleHook,
} from '@nitrostack/core';
import type { ExecutionContext } from '@nitrostack/core';
import { AppModule } from '../src/app.module.js';
import { installExecutionContextBridge } from '../src/bootstrap/execution-context.bridge.js';
import { ToolExecutorService } from '../src/modules/pipeline/services/tool-executor.service.js';

@McpApp({
  module: AppModule,
  server: { name: 'passportiq-test', version: '1.0.0' },
})
class TestApplication {}

export interface Harness {
  /** Invoke a registered tool by name, through the bridged execute path. */
  call<T = unknown>(toolName: string, input?: unknown): Promise<T>;
  /** Resolve a DI singleton — the same instance the tools use. */
  resolve<T>(token: new (...args: never[]) => T): T;
  toolNames(): string[];
}

let cached: Harness | undefined;

export async function bootHarness(): Promise<Harness> {
  if (cached) return cached;

  const app = await McpApplicationFactory.create(TestApplication);
  const container = DIContainer.getInstance();

  await triggerLifecycleHook(container.getInstances(), 'onModuleInit');
  installExecutionContextBridge(app, defaultLogger);
  container.resolve(ToolExecutorService).setServer(app);

  const executor = container.resolve(ToolExecutorService);

  cached = {
    async call<T>(toolName: string, input: unknown = {}): Promise<T> {
      return (await executor.call(toolName, input)) as T;
    },
    resolve<T>(token: new (...args: never[]) => T): T {
      return container.resolve(token as never) as T;
    },
    toolNames: () => executor.listToolNames(),
  };

  return cached;
}

/** A bare context for exercising a guard directly, without a tool call. */
export function fakeContext(input: Record<string, unknown>): ExecutionContext {
  return {
    requestId: 'test',
    toolName: 'test',
    logger: defaultLogger,
    metadata: {},
    input,
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Minimal assertion helpers — no test framework, so `npm test` needs no runner
// and cannot fail because of a runner/ESM interaction at hour 11.
// ---------------------------------------------------------------------------
let passed = 0;
const failures: string[] = [];

export function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label + (detail ? ` — ${detail}` : ''));
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

export function equal(label: string, actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  check(label, a === e, a === e ? undefined : `expected ${e}, got ${a}`);
}

export function section(title: string): void {
  console.log(`\n${title}`);
}

/**
 * Print the summary and exit with 0 (all passed) or 1 (anything failed).
 *
 * The explicit process.exit on SUCCESS is required, not tidiness: importing the
 * app registers @McpApp/@Injectable metadata and core's singletons, which leave
 * handles on the event loop. Node then keeps the process alive after the last
 * assertion, so `npm test` hangs forever instead of passing. Exiting here makes
 * the suite's exit code the only thing a caller has to look at.
 */
export function report(suite: string): void {
  console.log(`\n${'─'.repeat(70)}`);

  if (failures.length === 0) {
    console.log(`✅ ${suite}: ${passed} checks passed`);
    process.exit(0);
  }

  console.error(`❌ ${suite}: ${failures.length} failed, ${passed} passed`);
  for (const failure of failures) console.error(`   • ${failure}`);
  process.exit(1);
}

/** Assert that `fn` throws, and optionally that the message matches. */
export async function throws(
  label: string,
  fn: () => unknown | Promise<unknown>,
  messageIncludes?: string
): Promise<void> {
  try {
    await fn();
    check(label, false, 'expected a throw, but it resolved');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (messageIncludes && !message.includes(messageIncludes)) {
      check(label, false, `threw, but message lacked "${messageIncludes}": ${message}`);
      return;
    }
    check(label, true);
  }
}
