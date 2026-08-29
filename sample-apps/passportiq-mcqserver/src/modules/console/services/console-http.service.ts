/**
 * ConsoleHttpService — the human-facing surface bolted onto the MCP transport.
 *
 * WHY AN HTTP CONSOLE AT ALL, ON AN MCP SERVER
 * -------------------------------------------
 * MCP widgets render inside an MCP client. That is the right home for them, and
 * PassportIQ ships four. But a deployed URL that shows only a JSON-RPC endpoint
 * is unusable to anyone without an MCP client — including a judge with a browser
 * and ninety seconds. This service serves the same read models and the same
 * guarded tools over plain HTTP so the product is demonstrable from a URL.
 *
 * IT IS ADDITIVE, NOT A SECOND BACKEND
 * -----------------------------------
 * Every mutating route goes through ToolExecutorService — i.e. through the real
 * registered tool, its schema validation, its guards, its audit logging and its
 * events. `POST /api/applications/:id/decision` is literally `officer_decide`,
 * so PipelineCompleteGuard blocks a premature decision from the browser exactly
 * as it blocks one from an LLM. There is no code path here that can write an
 * outcome the MCP surface could not.
 *
 * HOW IT ATTACHES (the part that is easy to get wrong)
 * --------------------------------------------------
 * NitroStackServer only creates an HTTP transport when it is NOT in stdio-only
 * mode — NODE_ENV development/dev/unset gives stdio only, and getHttpTransport()
 * returns undefined. So:
 *
 *   - attach() is called AFTER app.start(), because the transport (and its
 *     Express app) does not exist until start() builds it;
 *   - Express happily accepts routes registered after listen(), so late
 *     registration works;
 *   - when there is no HTTP transport, attach() logs once and returns false. It
 *     must not throw: stdio mode is the normal local development mode, and the
 *     MCP server itself is perfectly functional without a console.
 *
 * ROUTE NAMESPACING
 * ----------------
 * Core already owns `/mcp`, `/health` and `/` on that Express app. Everything
 * here lives under `/console` and `/api/*` to avoid colliding with them.
 */
import { Injectable, defaultLogger } from '@nitrostack/core';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AgentMemoryService } from '../../agent/services/agent-memory.service.js';
import { CaseOrchestratorService } from '../../caseflow/services/case-orchestrator.service.js';
import { CaseflowService } from '../../caseflow/services/caseflow.service.js';
import { LANDING_HTML } from '../landing.page.js';
import { LOGIN_HTML } from '../login.page.js';
import { ToolExecutorService } from '../../pipeline/services/tool-executor.service.js';
import { AutopilotService } from './autopilot.service.js';
import { ConsoleEventHubService } from './console-event-hub.service.js';
import { ConsoleStateService } from './console-state.service.js';
import { CopilotChatService } from './copilot-chat.service.js';
import { randomBytes } from 'node:crypto';

/**
 * Minimal structural types for the Express objects we touch.
 *
 * Deliberately hand-written instead of depending on @types/express: express
 * arrives here transitively through @nitrostack/core, so it is not a declared
 * dependency of this project, and adding a types-only dependency for six method
 * signatures would make the build fail in exactly the environment (offline CI)
 * where it is least recoverable. These four interfaces are the whole contract.
 */
interface HttpRequest {
  params: Record<string, string>;
  query: Record<string, unknown>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
  on(event: string, listener: () => void): void;
}

interface HttpResponse {
  status(code: number): HttpResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
  write(chunk: string): boolean;
  end(body?: string): void;
  flushHeaders?(): void;
}

type Handler = (req: HttpRequest, res: HttpResponse) => void | Promise<void>;

interface ExpressLike {
  get(path: string, handler: Handler): void;
  post(path: string, handler: Handler): void;
}

/**
 * The bits of Express's internal router stack we reach into, in order to put
 * PassportIQ's landing page at `/` ahead of core's tool catalogue.
 *
 * Express resolves routes in registration order, and core registers `/` while
 * building the transport — long before attach() runs. Registering another `/`
 * afterwards therefore does nothing: core's layer always matches first. The
 * only way to win without forking core is to move our layer ahead of theirs in
 * the stack, which is what takeOverRoot() does. It is guarded on every access
 * and degrades to "landing available at /app" if the internals ever change
 * shape, so a future Express refactor cannot take the server down with it.
 */
interface RouteLayerLike {
  route?: {
    path?: unknown;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle?: unknown }>;
  };
}

interface RouterHostLike {
  router?: { stack?: RouteLayerLike[] };
  _router?: { stack?: RouteLayerLike[] };
}

interface HttpTransportLike {
  getApp?(): ExpressLike;
}

interface ServerLike {
  getHttpTransport?(): HttpTransportLike | undefined;
}

/** Where `nitrostack-cli build` emits the bundled console page. */
const CONSOLE_BUNDLE = join(process.cwd(), 'src', 'widgets', 'out', 'console.html');

/**
 * Lifecycle steps the board's per-card button may invoke.
 *
 * `officer_decide` is deliberately ABSENT: it has its own route
 * (`POST /api/applications/:id/decision`) which is keyed by applicationId and
 * carries the decision + note the guard and the audit log require. Routing it
 * through here as if it were an ordinary step would let the UI move a case out
 * of officer_review with no recorded officer, no note and no DecisionRecord —
 * which is precisely the gate this project is about.
 */
const LIFECYCLE_STEP_TOOLS = new Set([
  'pay_application_fee',
  'book_psk_appointment',
  'complete_psk_visit',
  'run_case_verification',
  'initiate_police_verification',
  'record_police_verification',
  'print_passport_booklet',
  'dispatch_passport',
  'confirm_delivery',
  'submit_clarification_response',
  'withdraw_passport_application',
]);

/** Indigo shield with a check — matches the console's own emblem. */
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#4F46E5"/><path d="M16 6l7 3v7c0 4.6-3 8.3-7 10-4-1.7-7-5.4-7-10V9l7-3z" fill="#fff" fill-opacity=".18" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M12.4 16.2l2.6 2.6 4.8-5" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

@Injectable({
  deps: [
    ConsoleStateService,
    ConsoleEventHubService,
    AutopilotService,
    ToolExecutorService,
    AgentMemoryService,
    CaseflowService,
    CaseOrchestratorService,
    CopilotChatService,
  ],
})
export class ConsoleHttpService {
  private attached = false;

  /**
   * Demo sessions: token -> officer. Identity-for-accountability, not auth —
   * see login.page.ts for why that is deliberate and stated out loud.
   */
  private readonly officerSessions = new Map<
    string,
    { name: string; badgeId: string; role: string; signedInAt: string }
  >();

  constructor(
    private readonly state: ConsoleStateService,
    private readonly hub: ConsoleEventHubService,
    private readonly autopilot: AutopilotService,
    private readonly executor: ToolExecutorService,
    private readonly agentMemory: AgentMemoryService,
    private readonly caseflow: CaseflowService,
    private readonly orchestrator: CaseOrchestratorService,
    private readonly copilot: CopilotChatService
  ) {}

  /**
   * Mount the console.
   *
   * @returns true when routes were registered, false in stdio-only mode.
   */
  attach(server: unknown): boolean {
    if (this.attached) return true;

    const transport = (server as ServerLike)?.getHttpTransport?.();
    const app = transport?.getApp?.();

    if (!app) {
      defaultLogger.info(
        'ℹ️  No HTTP transport — officer console not mounted. This is expected in stdio mode ' +
          '(NODE_ENV unset/development). Set NODE_ENV=production and HOST=0.0.0.0 to serve it.'
      );
      return false;
    }

    this.registerRoutes(app);
    this.attached = true;

    defaultLogger.info(
      '✓ Officer console mounted — GET /console (UI), /login (sign-in), /api/chat (copilot), ' +
        '/api/overview, /api/events (SSE), /api/autopilot. Every write goes through the ' +
        'guarded MCP tools.'
    );
    return true;
  }

  isAttached(): boolean {
    return this.attached;
  }

  // ---------------------------------------------------------------------------
  // Routes
  // ---------------------------------------------------------------------------

  private registerRoutes(app: ExpressLike): void {
    // ---- Landing ------------------------------------------------------------
    // The product, not the endpoint list. Several aliases because a demo URL
    // gets typed from memory and every one of these is a plausible guess.
    const landing: Handler = (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(LANDING_HTML);
    };
    for (const path of ['/app', '/start', '/home', '/passportiq', '/workflow', '/overview']) {
      app.get(path, landing);
    }
    try {
      this.takeOverRoot(app, landing);
    } catch (error) {
      // Reordering the router is a presentation nicety. If a future Express
      // changes shape underneath it, the server must still come up with a
      // working console and a working MCP endpoint.
      defaultLogger.info(
        `ℹ️  Landing page left at /app (could not claim /): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // ---- UI -----------------------------------------------------------------
    app.get('/console', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      // no-store: the console is a live operations view; a cached copy showing a
      // stale queue is worse than a slower load.
      res.setHeader('Cache-Control', 'no-store');
      res.end(this.readConsoleHtml());
    });

    // A browser asks for /favicon.ico unprompted, and a 404 in the devtools
    // console during a demo reads as a broken app. Serve the state emblem inline.
    app.get('/favicon.svg', (_req, res) => {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(FAVICON_SVG);
    });
    app.get('/favicon.ico', (_req, res) => {
      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(FAVICON_SVG);
    });

    // ---- Officer sign-in ------------------------------------------------------
    app.get('/login', (_req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(LOGIN_HTML);
    });

    app.post('/api/auth/login', (req, res) => {
      const body = asObject(req.body);
      const name = String(body['name'] ?? '').trim().slice(0, 60);
      const badgeId = String(body['badgeId'] ?? '').trim().slice(0, 24);
      const role =
        String(body['role'] ?? 'Passport Verification Officer').trim().slice(0, 60) ||
        'Passport Verification Officer';
      if (!name || !badgeId) {
        this.send(res, 400, { error: 'Both name and badge/employee ID are required.' });
        return;
      }
      const token = randomBytes(24).toString('hex');
      const officer = { name, badgeId, role, signedInAt: new Date().toISOString() };
      // Cap the map so a curl loop cannot grow it without bound.
      if (this.officerSessions.size >= 1000) {
        const oldest = this.officerSessions.keys().next().value;
        if (oldest !== undefined) this.officerSessions.delete(oldest);
      }
      this.officerSessions.set(token, officer);
      this.send(res, 200, { token, officer });
    });

    app.get('/api/auth/session', (req, res) => {
      const token = readString(req.query['token']) ?? readBearer(req.headers['authorization']);
      const officer = token ? this.officerSessions.get(token) : undefined;
      if (!officer) {
        this.send(res, 401, { error: 'No active officer session. Sign in at /login.' });
        return;
      }
      this.send(res, 200, { officer });
    });

    app.post('/api/auth/logout', (req, res) => {
      const body = asObject(req.body);
      const token = typeof body['token'] === 'string' ? body['token'] : undefined;
      if (token) this.officerSessions.delete(token);
      this.send(res, 200, { ok: true });
    });

    // ---- Copilot chat ---------------------------------------------------------
    // The same CopilotChatService the `copilot_chat` MCP tool wraps; the browser
    // panel and an MCP client share one transcript store and one router.
    app.post('/api/chat', async (req, res) => {
      const body = asObject(req.body);
      const message = String(body['message'] ?? '').trim();
      if (!message) {
        this.send(res, 400, { error: 'message is required.' });
        return;
      }
      const sessionId =
        (typeof body['sessionId'] === 'string' && body['sessionId'].slice(0, 80)) ||
        `web-${Date.now().toString(36)}`;
      const officer = typeof body['officer'] === 'string' ? body['officer'] : undefined;
      await this.guardAsync(res, () => this.copilot.handle(sessionId, message, officer));
    });

    app.get('/api/chat/history', (req, res) => {
      const sessionId = readString(req.query['sessionId']);
      this.guard(res, () => ({
        sessionId: sessionId ?? null,
        turns: sessionId ? this.copilot.getHistory(sessionId) : [],
      }));
    });

    // ---- Reads --------------------------------------------------------------
    app.get('/api/console/health', (_req, res) => {
      this.send(res, 200, {
        ok: true,
        service: 'passportiq-console',
        toolsRegistered: this.executor.listToolNames().length,
        executorReady: this.executor.isReady(),
        autopilot: this.autopilot.getStatus(),
        sseSubscribers: this.hub.subscriberCount(),
        latestEventId: this.hub.getLatestId(),
      });
    });

    app.get('/api/overview', (_req, res) => {
      this.guard(res, () => this.state.getOverview());
    });

    app.get('/api/tools', (_req, res) => {
      this.send(res, 200, {
        tools: this.executor.listToolNames(),
        ready: this.executor.isReady(),
      });
    });

    app.get('/api/applications/:id', (req, res) => {
      this.guard(res, () => this.state.getApplicationView(req.params['id'] ?? ''));
    });

    app.get('/api/audit', (req, res) => {
      const applicationId = readString(req.query['applicationId']);
      this.guard(res, () =>
        applicationId ? this.state.getAuditTrail(applicationId) : this.state.getAuditTrail()
      );
    });

    app.get('/api/agent/runs', (req, res) => {
      const applicationId = readString(req.query['applicationId']);
      this.guard(res, () =>
        applicationId
          ? { runs: this.agentMemory.getRunsFor(applicationId) }
          : { runs: this.state.getAgentRuns(readNumber(req.query['limit']) ?? 40) }
      );
    });

    app.get('/api/agent/stats', (_req, res) => {
      this.guard(res, () => this.agentMemory.getStats());
    });

    app.get('/api/events/history', (req, res) => {
      this.guard(res, () => ({
        latestId: this.hub.getLatestId(),
        events: this.hub.getEvents(
          readNumber(req.query['since']) ?? 0,
          readNumber(req.query['limit']) ?? 200,
          readString(req.query['applicationId'])
        ),
      }));
    });

    // ---- Live stream --------------------------------------------------------
    app.get('/api/events', (req, res) => {
      this.streamEvents(req, res);
    });

    // ---- Autopilot ----------------------------------------------------------
    app.get('/api/autopilot', (_req, res) => {
      this.send(res, 200, {
        status: this.autopilot.getStatus(),
        lastSweep: this.autopilot.getLastSweep(),
      });
    });

    app.post('/api/autopilot/sweep', async (_req, res) => {
      // Awaiting the sweep keeps the response honest — the caller learns what the
      // agent actually concluded rather than "accepted".
      await this.guardAsync(res, async () => {
        const summary = await this.autopilot.sweep();
        return {
          started: summary !== null,
          summary,
          status: this.autopilot.getStatus(),
        };
      });
    });

    app.post('/api/autopilot/start', (_req, res) => {
      this.send(res, 200, { status: this.autopilot.start() });
    });

    app.post('/api/autopilot/stop', (_req, res) => {
      this.send(res, 200, { status: this.autopilot.stop('Stopped from the officer console.') });
    });

    // ---- Writes: every one of these IS an MCP tool call ---------------------
    app.post('/api/applications/:id/pipeline', async (req, res) => {
      await this.callTool(res, 'run_verification_pipeline', {
        applicationId: req.params['id'],
        ...asObject(req.body),
      });
    });

    app.post('/api/applications/:id/agent', async (req, res) => {
      await this.callTool(res, 'agent_investigate', {
        applicationId: req.params['id'],
        ...asObject(req.body),
      });
    });

    app.post('/api/applications/:id/decision', async (req, res) => {
      // No pre-check on pipeline completeness here on purpose: PipelineCompleteGuard
      // is the single authority on that, and duplicating the rule in the HTTP layer
      // would let the two drift apart. A premature decision returns the guard's own
      // message, which names the missing stages.
      await this.callTool(res, 'officer_decide', {
        applicationId: req.params['id'],
        ...asObject(req.body),
      });
    });

    app.post('/api/triage', async (req, res) => {
      await this.callTool(res, 'agent_triage_queue', asObject(req.body));
    });

    // ---- Caseflow: the passport lifecycle -----------------------------------
    //
    // Reads project the register directly (fast, and the board is polled). Every
    // WRITE goes through the real MCP tool via callTool, so the browser cannot
    // move a case in a way an LLM could not — the state machine, the SLA clocks
    // and the officer gate are enforced in one place for both callers.

    app.get('/api/caseflow/board', (_req, res) => {
      this.guard(res, () => this.caseflowBoard());
    });

    app.get('/api/caseflow/cases', (req, res) => {
      const stage = readString(req.query['stage']);
      this.guard(res, () => {
        const rows = this.caseflow
          .getAll()
          .filter((k) => (stage ? k.stage === stage : true))
          .map((k) => ({
            arn: k.arn,
            applicationId: k.applicationId,
            applicantName: k.applicantName,
            applicationType: k.applicationType,
            tatkal: k.tatkal,
            stage: k.stage,
            openedAt: k.openedAt,
            stageEnteredAt: k.stageEnteredAt,
            officerDecision: k.officerDecision,
            sla: this.caseflow.sla(k),
          }));
        return { total: rows.length, cases: rows };
      });
    });

    app.get('/api/caseflow/cases/:arn', (req, res) => {
      this.guard(res, () => {
        const kase = this.caseflow.get(req.params['arn'] ?? '');
        return {
          ...kase,
          sla: this.caseflow.sla(kase),
          normalizedAddress: this.caseflow.normalizedAddress(kase),
        };
      });
    });

    app.get('/api/caseflow/orchestrator', (_req, res) => {
      this.guard(res, () => ({
        status: this.orchestrator.status(),
        ticks: this.orchestrator.recentTicks(12),
      }));
    });

    app.post('/api/caseflow/applications', async (req, res) => {
      await this.callTool(res, 'submit_passport_application', asObject(req.body));
    });

    app.post('/api/caseflow/cases/:arn/advance', async (req, res) => {
      await this.callTool(res, 'advance_case', {
        arn: req.params['arn'],
        ...asObject(req.body),
      });
    });

    /**
     * Run one named lifecycle step by hand.
     *
     * This is what makes the board's per-card buttons work without a route per
     * stage: the UI reads `nextStep.tool` off the case file and posts it here.
     * The allowlist is not security theatre — it stops this route becoming a
     * second, unaudited copy of POST /api/tools/:name with a friendlier URL.
     */
    app.post('/api/caseflow/cases/:arn/step/:tool', async (req, res) => {
      const tool = req.params['tool'] ?? '';
      if (!LIFECYCLE_STEP_TOOLS.has(tool)) {
        this.send(res, 400, {
          error:
            `'${tool}' is not a lifecycle step. Allowed: ${[...LIFECYCLE_STEP_TOOLS].join(', ')}. ` +
            `Use POST /api/tools/:name for anything else.`,
        });
        return;
      }
      await this.callTool(res, tool, { arn: req.params['arn'], ...asObject(req.body) });
    });

    for (const action of ['start', 'stop', 'tick'] as const) {
      app.post(`/api/caseflow/orchestrator/${action}`, async (req, res) => {
        await this.callTool(res, 'caseflow_autopilot', {
          action,
          ...asObject(req.body),
        });
      });
    }

    /**
     * Escape hatch: call any registered tool by name.
     *
     * This is the console's "MCP inspector" tab — it lets a judge see that the
     * UI is not a mock by invoking the same tools directly and comparing output.
     * It adds no authority: only registered tools are reachable, and each one
     * still validates its own input and runs its own guards.
     */
    app.post('/api/tools/:name', async (req, res) => {
      const name = req.params['name'] ?? '';
      if (!this.executor.has(name)) {
        this.send(res, 404, {
          error: `Tool '${name}' is not registered.`,
          available: this.executor.listToolNames(),
        });
        return;
      }
      await this.callTool(res, name, asObject(req.body));
    });
  }

  // ---------------------------------------------------------------------------
  // SSE
  // ---------------------------------------------------------------------------

  /**
   * Open a live event stream.
   *
   * Details that matter:
   *   - `X-Accel-Buffering: no` stops a reverse proxy (NitroCloud fronts the
   *     container with one) from buffering the stream into uselessness;
   *   - flushHeaders() sends the response head immediately, so the browser fires
   *     `onopen` instead of waiting for the first event;
   *   - Last-Event-ID is honoured, so a reconnect after a scale-to-zero wake-up
   *     replays what was missed rather than showing a gap;
   *   - a 25s comment heartbeat keeps idle proxies from closing the connection;
   *   - cleanup runs on 'close' — without it, subscribers accumulate on every
   *     page refresh and the hub fans out to dead sockets forever.
   */
  /**
   * Put the PassportIQ landing page at `/`, and move core's tool catalogue to
   * `/mcp-tools` rather than destroying it.
   *
   * Why this is worth reaching into Express for: `/` is the only URL anyone
   * types. Core's default page there shows a connection panel and an
   * alphabetical tool list, which reads as "this is a bag of endpoints" rather
   * than "this is a verification system with a console". The tool catalogue is
   * genuinely useful, so it is preserved verbatim at /mcp-tools and linked from
   * the landing page and the footer.
   *
   * Failure is non-fatal by construction: if the router internals are not the
   * shape we expect, we log where the landing page *is* reachable and leave
   * core's `/` untouched. Nothing here can throw during boot.
   */
  private takeOverRoot(app: ExpressLike, landing: Handler): void {
    const stack = this.readRouterStack(app);

    if (!Array.isArray(stack)) {
      app.get('/mcp-tools', landing);
      defaultLogger.info(
        'ℹ️  Could not reorder the router — PassportIQ landing page is at /app (core keeps /).'
      );
      return;
    }

    // Find core's GET / layer and re-publish its handler at /mcp-tools.
    const coreLayer = stack.find(
      (layer) => layer?.route?.path === '/' && layer.route?.methods?.['get'] === true
    );
    const coreHandle = coreLayer?.route?.stack?.[0]?.handle;

    if (typeof coreHandle === 'function') {
      const forward = coreHandle as (req: unknown, res: unknown, next: () => void) => void;
      app.get('/mcp-tools', (req, res) => {
        forward(req, res, () => {
          /* core's page is terminal; there is nothing to fall through to. */
        });
      });
    } else {
      // Core's page could not be located — still answer /mcp-tools with
      // something useful rather than a 404.
      app.get('/mcp-tools', landing);
    }

    app.get('/', landing);

    // Our `/` layer was just appended. Hoist it above core's so it matches first.
    const mine = stack[stack.length - 1];
    const coreIndex = coreLayer ? stack.indexOf(coreLayer) : -1;
    if (mine && coreIndex >= 0 && coreIndex < stack.length - 1) {
      stack.pop();
      stack.splice(coreIndex, 0, mine);
      defaultLogger.info('✓ PassportIQ landing page serving / — MCP tool catalogue moved to /mcp-tools');
    } else {
      defaultLogger.info('ℹ️  PassportIQ landing page registered at /app, /start and /passportiq.');
    }
  }

  /**
   * Read Express's route stack defensively.
   *
   * `app.router` is a THROWING deprecation getter on Express 4 (which is what
   * arrives transitively through @nitrostack/core), and the private `_router`
   * on Express 5. Probing them in the wrong order takes the boot down, so
   * `_router` is tried first and every access is wrapped: a landing page is
   * never worth failing a start over.
   */
  private readRouterStack(app: ExpressLike): RouteLayerLike[] | undefined {
    const host = app as unknown as RouterHostLike;
    try {
      const priv = host._router?.stack;
      if (Array.isArray(priv)) return priv;
    } catch {
      /* not present on this Express major — fall through */
    }
    try {
      const pub = host.router?.stack;
      if (Array.isArray(pub)) return pub;
    } catch {
      /* Express 4 throws here by design; treat as unavailable */
    }
    return undefined;
  }

  private streamEvents(req: HttpRequest, res: HttpResponse): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sinceId =
      readNumber(req.query['since']) ?? parseInt(String(req.headers['last-event-id'] ?? ''), 10);

    const unsubscribe = this.hub.subscribe(
      {
        send: (chunk) => {
          res.write(chunk);
        },
        close: () => {
          res.end();
        },
      },
      Number.isFinite(sinceId) && sinceId > 0 ? sinceId : 0
    );

    // Tell the client where it stands, so a UI can show "live" immediately even
    // on a quiet queue.
    res.write(
      `event: console.connected\ndata: ${JSON.stringify({
        latestEventId: this.hub.getLatestId(),
        autopilot: this.autopilot.getStatus(),
        at: new Date().toISOString(),
      })}\n\n`
    );

    const heartbeat = setInterval(() => {
      try {
        res.write(': keep-alive\n\n');
      } catch {
        clearInterval(heartbeat);
        unsubscribe();
      }
    }, 25_000);
    heartbeat.unref?.();

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Invoke a real MCP tool and return its output verbatim. */
  private async callTool(res: HttpResponse, toolName: string, input: unknown): Promise<void> {
    if (!this.executor.isReady()) {
      this.send(res, 503, {
        error:
          'Tool registry unavailable — ToolExecutorService.setServer() has not run. The server ' +
          'is still booting.',
      });
      return;
    }

    try {
      const result = await this.executor.call(toolName, input);
      this.send(res, 200, { tool: toolName, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A guard rejection and a bad input are both client errors, and both carry a
      // message the officer should read verbatim — the guard's text names the
      // missing stages, which is the actionable part.
      const status = /not registered/i.test(message) ? 404 : 400;
      this.send(res, status, { tool: toolName, error: message });
    }
  }

  /**
   * The lifecycle board plus the totals the header needs.
   *
   * Assembled here rather than reusing `get_caseflow_board` through the executor
   * because the board is polled every few seconds by every open console tab, and
   * a projection off an in-memory Map is the difference between a free read and a
   * full tool dispatch per poll.
   */
  private caseflowBoard(): unknown {
    const all = this.caseflow.getAll();
    return {
      generatedAt: new Date().toISOString(),
      totals: {
        cases: all.length,
        waitingOnHuman: all.filter((k) => k.stage === 'officer_review' || k.stage === 'clarification')
          .length,
        breached: all.filter((k) => this.caseflow.sla(k).breached).length,
        closed: all.filter(
          (k) => k.stage === 'delivered' || k.stage === 'rejected' || k.stage === 'withdrawn'
        ).length,
      },
      columns: this.caseflow.board(),
      orchestrator: this.orchestrator.status(),
    };
  }

  private guard(res: HttpResponse, read: () => unknown): void {
    try {
      this.send(res, 200, read());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.send(res, /not found|unknown application/i.test(message) ? 404 : 500, {
        error: message,
      });
    }
  }

  private async guardAsync(res: HttpResponse, read: () => Promise<unknown>): Promise<void> {
    try {
      this.send(res, 200, await read());
    } catch (error) {
      this.send(res, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  private send(res: HttpResponse, status: number, body: unknown): void {
    res.status(status);
    res.setHeader('Cache-Control', 'no-store');
    res.json(body);
  }

  /**
   * Read the bundled console page.
   *
   * Read per request rather than cached at boot so `nitrostack-cli build` in a
   * dev loop is picked up without a restart. If the bundle is missing we serve a
   * page that says so and names the command — a blank 404 in a demo reads as "the
   * deploy is broken" rather than "run the build".
   */
  private readConsoleHtml(): string {
    if (existsSync(CONSOLE_BUNDLE)) {
      try {
        return readFileSync(CONSOLE_BUNDLE, 'utf8');
      } catch (error) {
        defaultLogger.warn(
          `[console] could not read ${CONSOLE_BUNDLE}: ` +
            `${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    return missingBundlePage();
  }
}

// -----------------------------------------------------------------------------
// Pure helpers
// -----------------------------------------------------------------------------

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readBearer(header: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(header) ? header[0] : header;
  return raw?.startsWith('Bearer ') ? raw.slice(7) : undefined;
}

function readNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Accept a JSON body, tolerate an absent or non-object one. */
function asObject(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
}

function missingBundlePage(): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PassportIQ — console not built</title>
<style>
  body{margin:0;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;background:#F5F7FA;
       color:#1D2939;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:32px}
  .card{max-width:560px;background:#fff;border:1px solid #E4E7EC;border-radius:12px;padding:32px;
        box-shadow:0 1px 3px rgba(16,24,40,.08)}
  h1{margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5B4DFF}
  h2{margin:0 0 16px;font-size:22px;font-weight:650}
  p{margin:0 0 12px;font-size:14px;line-height:1.65;color:#667085}
  code{background:#F5F7FA;border:1px solid #E4E7EC;border-radius:5px;padding:2px 7px;font-size:13px;color:#1D2939}
  a{color:#5B4DFF}
</style></head>
<body><div class="card">
  <h1>PassportIQ</h1>
  <h2>Officer console bundle not built</h2>
  <p>The MCP server is running — every tool is live. Only the browser UI is missing.</p>
  <p>Build it with <code>npm run build</code>, which compiles
     <code>src/widgets/app/console/page.tsx</code> to
     <code>src/widgets/out/console.html</code>.</p>
  <p>The JSON API is available now: <a href="/api/overview">/api/overview</a>,
     <a href="/api/console/health">/api/console/health</a>, <a href="/api/tools">/api/tools</a>.</p>
</div></body></html>
`;
}
