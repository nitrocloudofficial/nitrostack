/**
 * PassportIQ MCP server — bootstrap.
 *
 * The wiring order below is not stylistic; three things must happen strictly
 * between McpApplicationFactory.create() and app.start(), and each one breaks a
 * different feature if moved:
 *
 *   1. triggerLifecycleHook(..., 'onModuleInit')
 *        create() does NOT fire lifecycle hooks itself. Anything relying on
 *        onModuleInit stays uninitialised without this.
 *
 *   2. installExecutionContextBridge(app)
 *        Attaches ctx.emit + ctx.input to every registered tool's context. Must
 *        run after create() (tools do not exist before it) and before start()
 *        (no request may be served un-bridged). Without it: zero dashboard
 *        events, and PipelineCompleteGuard fails closed on every decision.
 *
 *   3. ToolExecutorService.setServer(app)
 *        Both the orchestrator AND the autonomous agent call other tools by name
 *        through the server's registry. The server object does not exist until
 *        create() returns, so a @Tool method has no other way to reach it. If
 *        this line is missing the agent cannot act at all — every turn fails with
 *        "ToolExecutorService has no server reference".
 *
 * Two more things happen strictly AFTER app.start(), and the order is equally
 * forced:
 *
 *   4. ConsoleHttpService.attach(app)
 *        The Express app that serves /console and /api/* does not exist until
 *        start() builds the HTTP transport, so this cannot run earlier. Express
 *        accepts routes registered after listen(), which is what makes late
 *        attachment work. In stdio-only mode attach() logs and returns false —
 *        it must not throw, because stdio is the normal local dev mode.
 *
 *   5. AutopilotService.start()
 *        The autopilot drives real tools through ToolExecutorService, so arming it
 *        before the registry has a server reference would fail every sweep with
 *        "no server reference". It is also env-gated (PASSPORTIQ_AUTOPILOT), so
 *        tests and stdio dev are never mutated by a background timer.
 *
 *   6. CaseOrchestratorService.start()
 *        The lifecycle loop. Same constraint as (5) and for the same reason: it
 *        moves cases by calling the real lifecycle tools through the executor, so
 *        it cannot be armed before setServer(). Separately env-gated
 *        (PASSPORTIQ_CASEFLOW) because it MUTATES the case register, and the
 *        acceptance suite asserts exact stage counts.
 *
 * Transport is NOT configured here. NitroStackServer.start() picks it from the
 * environment: NODE_ENV development/dev/unset -> stdio only; anything else ->
 * dual stdio+HTTP bound to PORT/HOST (default host `localhost`, so HOST=0.0.0.0
 * is required to be reachable from outside a container — see the Dockerfile).
 * MCP_TRANSPORT_TYPE can force a mode. None of it comes from nitrostack.config.ts,
 * which only carries CLI/widget metadata.
 */
import 'dotenv/config';
import {
  McpApp,
  McpApplicationFactory,
  DIContainer,
  defaultLogger,
  triggerLifecycleHook,
} from '@nitrostack/core';
import { AppModule } from './app.module.js';
import { installExecutionContextBridge } from './bootstrap/execution-context.bridge.js';
import { silenceUnusedOAuthProvider } from './bootstrap/silence-unused-oauth.js';
import { CaseOrchestratorService } from './modules/caseflow/services/case-orchestrator.service.js';
import { CaseflowService } from './modules/caseflow/services/caseflow.service.js';
import { AutopilotService } from './modules/console/services/autopilot.service.js';
import { ConsoleHttpService } from './modules/console/services/console-http.service.js';
import { ApplicationService } from './modules/pipeline/services/application.service.js';
import { ToolExecutorService } from './modules/pipeline/services/tool-executor.service.js';
import { GraphService } from './modules/pipeline/services/graph.service.js';
import { LlmService } from './modules/verification/services/llm.service.js';
import { RuleService } from './modules/verification/services/rule.service.js';

// McpApplicationFactory reads @Module metadata from whatever class `module`
// points at — the class @McpApp decorates needs no @Module of its own.
@McpApp({
  module: AppModule,
  server: { name: 'passportiq', version: '1.0.0' },
})
export class Application {}

/**
 * Managed hosts (NitroCloud, Cloud Run, Render, Fly, Railway…) all follow the
 * same contract: they inject PORT and expect the process to bind 0.0.0.0. Two
 * upstream defaults break that contract, and both fail *silently* as a health
 * check that never turns green:
 *
 *   a) @nitrostack/core server.js does `process.env.HOST || 'localhost'`.
 *      Binding localhost inside a container answers only the loopback adapter,
 *      so the platform's probe — which dials the pod IP — times out forever.
 *
 *   b) NODE_ENV decides the transport inside NitroStackServer.start(): unset
 *      means stdio ONLY, so there is no /mcp to probe and no MCP for judges to
 *      call. A host that forgets to set NODE_ENV yields a "deployed" app with
 *      no HTTP surface at all.
 *
 * We repair (a) unconditionally: 0.0.0.0 is the correct bind whenever HTTP is
 * on, and it is inert while we are stdio-only.
 *
 * We repair (b) only when PORT is present. An injected PORT is the reliable
 * "I am running on a platform" signal — a developer wiring this into Claude
 * Desktop over stdio never sets one, so their stdio-only boot is preserved.
 * Anything explicitly set by the operator always wins.
 */
function applyManagedHostEnvDefaults(): void {
  const onManagedHost = Boolean(process.env['PORT']);

  if (!process.env['HOST']) {
    process.env['HOST'] = '0.0.0.0';
  }

  if (onManagedHost && !process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'production';
  }
}

async function bootstrap(): Promise<void> {
  // Must precede create()/start(): core reads HOST and NODE_ENV while building
  // the transport, so mutating them afterwards would have no effect.
  applyManagedHostEnvDefaults();

  const app = await McpApplicationFactory.create(Application);
  const container = DIContainer.getInstance();

  // (1) Lifecycle hooks — create() never fires these.
  await triggerLifecycleHook(container.getInstances(), 'onModuleInit');

  // (2) ctx.emit + ctx.input. Throws loudly if core's internals moved, rather
  //     than silently disabling the event stream and the decision guard.
  installExecutionContextBridge(app, defaultLogger);

  // (3) Give the orchestrator AND the agent a handle on the tool registry.
  container.resolve(ToolExecutorService).setServer(app);

  // Cosmetic only: stops core's unused OAuthModule from dumping a class-source
  // error over our boot banner during start(). See the module's header for why
  // this is safe and why it is not a PassportIQ bug.
  silenceUnusedOAuthProvider(container, defaultLogger);

  logBootSummary(container);

  await app.start();

  // (4) Mount the browser console on the transport start() just built. Returns
  //     false (not throws) when there is no HTTP transport — see the header.
  const consoleHttp = container.resolve(ConsoleHttpService);
  const consoleMounted = consoleHttp.attach(app);

  // (5) Arm the autonomous sweep. Self-disables unless PASSPORTIQ_AUTOPILOT=true
  //     or NODE_ENV=production, so `npm test` is never racing a background timer.
  const autopilot = container.resolve(AutopilotService);
  const autopilotStatus = autopilot.start();

  // (6) Arm the lifecycle loop that walks the case register: fee, appointment,
  //     counters, verification, PV, printing, dispatch, delivery. It stops of its
  //     own accord at officer_review on every case — that is enforced by the
  //     `autonomous: false` rows in CASE_TRANSITIONS, not by this call site.
  const caseflowOrchestrator = container.resolve(CaseOrchestratorService);
  const caseflowStatus = caseflowOrchestrator.start();

  if (consoleMounted) {
    const host = process.env['HOST'] ?? 'localhost';
    const port = process.env['PORT'] ?? '3000';
    defaultLogger.info(`✓ Officer console: http://${host}:${port}/console`);
  }

  if (!autopilotStatus.enabled) {
    defaultLogger.info(
      'ℹ️  Autopilot idle by configuration — the agent still runs on demand via ' +
        'agent_investigate, agent_triage_queue, or autopilot_control(action="sweep").'
    );
  }

  if (caseflowStatus.enabled) {
    defaultLogger.info(
      `✓ Lifecycle orchestrator armed — walking the case register every ` +
        `${caseflowStatus.intervalSeconds}s, stopping at every officer_review.`
    );
  } else {
    defaultLogger.info(
      'ℹ️  Lifecycle orchestrator idle by configuration — cases still advance on demand via ' +
        'advance_case or caseflow_autopilot(action="tick"). Set PASSPORTIQ_CASEFLOW=true to arm it.'
    );
  }

  // Stop the timer on shutdown so the process exits promptly instead of waiting
  // out an interval, and so an in-flight sweep is not killed mid-tool-call on a
  // second signal.
  const shutdown = (signal: string): void => {
    defaultLogger.info(`Received ${signal} — disarming autopilot and shutting down.`);
    autopilot.stop(`Process received ${signal}.`);
    caseflowOrchestrator.stop(`Process received ${signal}.`);
    process.exit(0);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Boot banner.
 *
 * Prints the things whose absence would otherwise be discovered mid-demo: the
 * seeded pool size, whether the fraud cluster survived the deploy, how many rules
 * loaded, and whether an LLM is actually in play. Every line here exists because
 * the corresponding failure is silent at runtime.
 */
function logBootSummary(container: DIContainer): void {
  const applications = container.resolve(ApplicationService);
  const graph = container.resolve(GraphService);
  const rules = container.resolve(RuleService);
  const llm = container.resolve(LlmService);
  const caseflow = container.resolve(CaseflowService);

  const ids = applications.getIds();
  const clusterSizes = graph
    .getAllClusters()
    .map((cluster) => cluster.length)
    .sort((a, b) => b - a);
  const largestCluster = clusterSizes[0] ?? 0;

  defaultLogger.info(
    `✓ PassportIQ ready — ${ids.length} seeded applications, ${rules.listRules().length} cited ` +
      `rules, largest applicant cluster ${largestCluster}`
  );

  // The lifecycle half. An empty register means seedFromApplicationPool() did not
  // run, which renders a blank board while every tool still answers 200 — exactly
  // the kind of silent failure this banner exists to catch.
  const cases = caseflow.getAll();
  const awaitingOfficer = cases.filter((k) => k.stage === 'officer_review').length;
  defaultLogger.info(
    `✓ Case register — ${cases.length} passport case(s) across ` +
      `${new Set(cases.map((k) => k.stage)).size} lifecycle stage(s), ` +
      `${awaitingOfficer} awaiting a human officer`
  );
  if (cases.length === 0) {
    defaultLogger.error(
      '⚠️  CASE REGISTER EMPTY. The lifecycle board will render blank and no case tool can ' +
        'resolve an ARN. CaseflowModule may be missing from app.module.ts imports.'
    );
  }

  // The single most important invariant of the demo. If the seed fixture ships
  // truncated the server still boots and every tool still answers — it just
  // stops finding fraud, which is the whole product.
  if (largestCluster < 2) {
    defaultLogger.error(
      '⚠️  NO MULTI-APPLICATION CLUSTER FOUND. Cross-application fraud detection has nothing ' +
        'to find — src/data/seed-applications.json is truncated or its shared identifiers were ' +
        'edited away. The server will run and report every applicant as isolated.'
    );
  }

  if (llm.isEnabled()) {
    defaultLogger.info(
      `✓ LLM enabled: ${llm.getProvider()} (${llm.getModel()}) — agent turns may be ` +
        `model-planned; narration is model-written. All verdicts remain deterministic.`
    );
  } else {
    defaultLogger.info(
      'ℹ️  No LLM configured — running fully deterministic. Every stage, the rulebook, the ' +
        'score and the agent loop work without a model; set GEMINI_API_KEY or OPENAI_API_KEY ' +
        'to enable LLM planning and narration.'
    );
  }

  if (process.env['PASSPORTIQ_ALLOW_UNGUARDED_DECISION'] === 'true') {
    defaultLogger.warn(
      '⚠️  PASSPORTIQ_ALLOW_UNGUARDED_DECISION=true — PipelineCompleteGuard is BYPASSED. ' +
        'Never present the demo in this mode: the human-in-the-loop gate is the pitch.'
    );
  }
}

bootstrap().catch((error: unknown) => {
  // A boot failure that only prints "[object Object]" costs 20 minutes of a
  // 12-hour hackathon. Print the stack, then exit non-zero so process managers
  // and CI both notice.
  defaultLogger.error('PassportIQ failed to start', error as Error);
  console.error(error);
  process.exit(1);
});
