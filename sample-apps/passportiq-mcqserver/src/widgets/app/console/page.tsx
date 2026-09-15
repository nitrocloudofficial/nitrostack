'use client';

/**
 * PassportIQ Officer Console — the live browser surface served at GET /console.
 *
 * The other four bundles are MCP widgets: stateless renderers of one tool result.
 * This page owns its data — it reads the console REST model, subscribes to the
 * server event stream, and issues every write back through a NitroStack MCP tool.
 * There is no second code path; the console drives the tool layer.
 *
 * DATA MAPPING IS THE WHOLE BALLGAME
 * ----------------------------------
 * An earlier revision read field names the server never emits — `progress.isComplete`,
 * `explanation.recommendation`, `decision.officerId`, `rules` as an array, `/api/autopilot`
 * without unwrapping its `{status,lastSweep}` envelope. Every one of those silently
 * produced an empty panel or a permanently-disabled control, which read as "the UI is
 * broken" when the backend was fine. So this file now consumes the *typed* readers in
 * `lib/api.ts` and does no `Record<string, unknown>` spelunking. If a shape changes,
 * the compiler says so here instead of a panel going quietly blank in a demo.
 *
 * LAYOUT
 * ------
 * The review screen is the product: the relationship graph is the centrepiece, the
 * applicant dossier sits beside it, and the three accountability cards (audit trail,
 * cited risk, officer decision) run underneath. An officer should never have to change
 * tabs to answer "what is this, why is it flagged, and what do I do".
 *
 * Panels fail independently: a 500 on one endpoint must not blank the console.
 */

import React from 'react';
import { COLORS, useTheme } from '../../lib/theme.js';
import { asArray, clockTime, dateTime, humanise } from '../../lib/format.js';
import {
  ApiError,
  clearOfficerSession,
  console_ as consoleApi,
  copilot as copilotApi,
  readOfficerSession,
  type ChatTurn,
  events,
  humaniseStage,
  subscribeStream,
  toApplicantRecord,
  toPipelineSteps,
  type AdvanceResult,
  type AgentRunRow,
  type ApplicationView,
  type AuditEntry,
  type AutopilotEnvelope,
  type CaseFile,
  type CaseflowBoard,
  type DecisionVerb,
  type DuplicateSignal,
  type OrchestratorStatus,
  type OrchestratorTick,
  type Overview,
  type PipelineStageOutcome,
  type QueueRow,
  type RingRow,
  type RuleViolation,
  type StageRow,
  type StreamFrame,
  type SubmitApplicationResult,
} from '../../lib/api.js';
import {
  AppShell,
  Button,
  Card,
  Content,
  Empty,
  MainColumn,
  Sidebar,
  Spinner,
  TopBar,
  type NavItem,
  type QuickStat,
} from '../../components/chrome.jsx';
import {
  IconAgent,
  IconAlert,
  IconAudit,
  IconBolt,
  IconChat,
  IconCheck,
  IconLogout,
  IconDashboard,
  IconGraph,
  IconLink,
  IconClock,
  IconDoc,
  IconQueue,
  IconRefresh,
  IconSearch,
  IconShield,
  IconUser,
} from '../../components/icons.jsx';
import { FraudGraph } from '../../components/graph.jsx';
import { CopilotChat } from '../../components/copilot.jsx';
import {
  ApplicantPanel,
  AuditTrail,
  EvidenceModal,
  OfficerDecision,
  RiskSummary,
  type AuditRow,
  type DecisionKind,
  type RiskFlag,
} from '../../components/panels.jsx';
import {
  ActivityStream,
  AgentRunHistory,
  AgentTrace,
  AutopilotPanel,
  EscalationBanner,
  TriageQueue,
} from '../../components/agent.jsx';
import {
  ArnTracker,
  CaseJourney,
  IntakeForm,
  LifecycleBoard,
  OrchestratorPanel,
} from '../../components/caseflow.jsx';
import {
  ApplicantTable,
  NotificationStack,
  PipelineTimeline,
  RiskPanel,
  StatsCard,
  type NotificationProps,
} from '../../components/teamwork.jsx';

type ViewId =
  | 'overview'
  | 'lifecycle'
  | 'case'
  | 'intake'
  | 'track'
  | 'queue'
  | 'application'
  | 'graph'
  | 'chat'
  | 'agent'
  | 'automation'
  | 'audit';

const VIEW_IDS: readonly ViewId[] = [
  'overview',
  'lifecycle',
  'case',
  'intake',
  'track',
  'queue',
  'application',
  'graph',
  'chat',
  'agent',
  'automation',
  'audit',
];

interface Route {
  view: ViewId;
  applicationId: string | null;
}

/**
 * The console is addressable. An officer who finds something in PIQ-2026-2001
 * has to be able to send a colleague the exact screen they are looking at, and
 * the browser Back button has to behave, or the tool is a demo rather than
 * casework software. Routes are hash-based so the single static bundle can be
 * served from any path without server rewrites.
 */
function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '').trim();
  if (!raw) return { view: 'overview', applicationId: null };

  const [head, tail] = raw.split('/');
  const view = VIEW_IDS.find((candidate) => candidate === head);
  if (!view) return { view: 'overview', applicationId: null };

  const applicationId = tail ? decodeURIComponent(tail) : null;
  // A bare #/application with no id has nothing to render; send it to the queue
  // so the officer gets a list to pick from instead of an empty shell.
  if (view === 'application' && !applicationId) return { view: 'queue', applicationId: null };
  return { view, applicationId };
}

function formatRoute(view: ViewId, applicationId: string | null): string {
  if (view === 'application' && applicationId) {
    return `#/application/${encodeURIComponent(applicationId)}`;
  }
  return `#/${view}`;
}

function currentRoute(): Route {
  if (typeof window === 'undefined') return { view: 'overview', applicationId: null };
  return parseRoute(window.location.hash);
}

interface Toast extends NotificationProps {
  id: string;
}

function officerIdentity(): { name: string; role: string } {
  const fallback = { name: 'Officer on duty', role: 'Passport Verification Officer' };
  // The signed-in session (from /login) wins; the injected global is the
  // MCP-host fallback; the constant is the last resort.
  const session = typeof window !== 'undefined' ? readOfficerSession() : null;
  if (session) {
    return { name: session.officer.name, role: session.officer.role };
  }
  if (typeof window !== 'undefined' && window.__PIQ_OFFICER__) {
    return {
      name: window.__PIQ_OFFICER__.name ?? fallback.name,
      role: window.__PIQ_OFFICER__.role ?? fallback.role,
    };
  }
  return fallback;
}

function errText(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unexpected error';
}

/**
 * `/api/audit` returns DecisionRecords. AuditTrail renders generic timeline rows.
 * Bridging here — rather than teaching AuditTrail about passport decisions — keeps
 * the component reusable and, more importantly, is why the trail stopped rendering
 * a column of em-dashes: it was being handed records whose field names it did not
 * know (`officer`/`note`/`decidedAt`, not `actor`/`detail`/`at`).
 */
function auditRowsFrom(entries: AuditEntry[]): AuditRow[] {
  return entries.map((entry) => ({
    at: entry.decidedAt,
    actor: entry.officer,
    title: `${humanise(entry.decision)} — ${entry.applicantName || entry.applicationId}`,
    detail: [
      entry.note,
      typeof entry.riskScoreAtDecision === 'number'
        ? `Risk at decision: ${Math.round(entry.riskScoreAtDecision)}.`
        : null,
      entry.linkedApplicationIds.length > 0
        ? `Linked to ${entry.linkedApplicationIds.join(', ')}.`
        : null,
      `${entry.stagesCompleted.length} verification stage(s) had completed.`,
    ]
      .filter(Boolean)
      .join(' '),
    tone: entry.decision === 'reject' ? 'flag' : entry.decision === 'clarify' ? 'active' : 'done',
  }));
}

/** Rule violations -> the cited findings list. `violations` is the array; `rules` is an object. */
function flagsFrom(view: ApplicationView | null): RiskFlag[] {
  return asArray<RuleViolation>(view?.rules?.violations).map((violation) => ({
    label: violation.ruleName ?? humanise(violation.ruleId),
    ruleId: violation.ruleId,
    severity: violation.severity,
    weight: violation.weight,
    citation: violation.citation,
    // An empty evidence list must fall through to `undefined`, not to '' — the
    // panel renders a detail row whenever the field is truthy.
    detail: violation.description ?? (asArray<string>(violation.evidence).join(' · ') || undefined),
  }));
}

export default function ConsolePage() {
  useTheme();
  const officer = officerIdentity();

  // ---- Officer sign-in gate ------------------------------------------------
  // The console is only reachable through /login. This is a UX gate, not an
  // auth boundary (the API stays open by design — see login.page.ts); it exists
  // so every decision and chat turn carries a NAMED officer.
  const [signedIn] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    // Inside an MCP host iframe there is no /login flow — the injected officer
    // global stands in for the session.
    return readOfficerSession() !== null || Boolean(window.__PIQ_OFFICER__);
  });
  React.useEffect(() => {
    if (!signedIn) window.location.replace('/login');
  }, [signedIn]);

  // Seeded from the URL so a shared link lands on the right screen on first paint
  // rather than flashing the overview and then jumping.
  const initialRoute = React.useRef<Route>(currentRoute());
  const [view, setView] = React.useState<ViewId>(initialRoute.current.view);
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [overviewError, setOverviewError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialRoute.current.applicationId,
  );
  const [detail, setDetail] = React.useState<ApplicationView | null>(null);
  const [detailError, setDetailError] = React.useState<string | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // The whole envelope is held, not just `.status` — `lastSweep` is what makes the
  // autopilot panel answer "what did it find?" instead of only "how many times".
  const [autopilot, setAutopilot] = React.useState<AutopilotEnvelope | null>(null);
  const [autopilotBusy, setAutopilotBusy] = React.useState(false);
  const [autopilotError, setAutopilotError] = React.useState<string | null>(null);

  const [stream, setStream] = React.useState<StreamFrame[]>([]);
  const [connected, setConnected] = React.useState(false);
  const [agentRuns, setAgentRuns] = React.useState<AgentRunRow[]>([]);
  const [auditEntries, setAuditEntries] = React.useState<AuditEntry[]>([]);
  /** Which application the audit list is currently scoped to; null = all. */
  const [auditScope, setAuditScope] = React.useState<string | null>(null);
  const [toolNames, setToolNames] = React.useState<string[]>([]);
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const [evidenceOpen, setEvidenceOpen] = React.useState(false);
  const [actionBusy, setActionBusy] = React.useState<string | null>(null);
  const [decisionError, setDecisionError] = React.useState<string | null>(null);

  // ---- Copilot chat --------------------------------------------------------
  const chatSessionId = React.useRef<string>(
    (() => {
      try {
        const existing = window.localStorage.getItem('piq.chat.session');
        if (existing) return existing;
        const fresh = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        window.localStorage.setItem('piq.chat.session', fresh);
        return fresh;
      } catch {
        return `web-${Date.now().toString(36)}`;
      }
    })(),
  );
  const [chatTurns, setChatTurns] = React.useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);

  // ---- Caseflow: the lifecycle half of the console ------------------------
  const [board, setBoard] = React.useState<CaseflowBoard | null>(null);
  const [caseArn, setCaseArn] = React.useState<string | null>(null);
  const [caseFile, setCaseFile] = React.useState<CaseFile | null>(null);
  const [caseBusy, setCaseBusy] = React.useState<string | null>(null);
  const [orchestrator, setOrchestrator] = React.useState<{
    status: OrchestratorStatus;
    ticks: OrchestratorTick[];
  } | null>(null);
  const [lastAdvance, setLastAdvance] = React.useState<AdvanceResult | null>(null);
  const [intakeBusy, setIntakeBusy] = React.useState(false);
  const [intakeResult, setIntakeResult] = React.useState<SubmitApplicationResult | null>(null);
  const [trackArn, setTrackArn] = React.useState('');
  const [trackBusy, setTrackBusy] = React.useState(false);
  const [trackResult, setTrackResult] = React.useState<Record<string, unknown> | null>(null);
  const [trackError, setTrackError] = React.useState<string | null>(null);

  const pushToast = React.useCallback((t: Omit<Toast, 'id'>) => {
    const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6500);
  }, []);

  // ---------------------------------------------------------------- loaders

  const loadOverview = React.useCallback(async () => {
    try {
      const next = await consoleApi.overview();
      setOverview(next);
      setOverviewError(null);
      setSelectedId((cur) => cur ?? next.queue[0]?.applicationId ?? null);
    } catch (err) {
      setOverviewError(errText(err));
    }
  }, []);

  const loadDetail = React.useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      setDetail(await consoleApi.application(id));
      setDetailError(null);
    } catch (err) {
      setDetail(null);
      setDetailError(errText(err));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const loadAutopilot = React.useCallback(async () => {
    try {
      setAutopilot(await consoleApi.autopilot());
    } catch {
      /* panel renders idle */
    }
  }, []);

  const loadAgentRuns = React.useCallback(async () => {
    try {
      setAgentRuns(asArray<AgentRunRow>((await consoleApi.agentRuns(40)).runs));
    } catch {
      /* ignore */
    }
  }, []);

  const loadAudit = React.useCallback(async (id?: string) => {
    try {
      setAuditEntries(asArray<AuditEntry>((await consoleApi.audit(id)).entries));
      // The applied scope is tracked so the filter controls reflect what is
      // actually on screen. Hardcoding the per-application button as active made
      // the view claim it was showing one application's history while listing
      // every application's — the one thing an audit view must never do.
      setAuditScope(id ?? null);
    } catch {
      /* ignore */
    }
  }, []);

  // ------------------------------------------------------------------- boot

  React.useEffect(() => {
    void loadOverview();
    void loadAutopilot();
    void loadAgentRuns();
    void loadAudit();

    consoleApi
      .tools()
      .then((res) => setToolNames(asArray<string>(res.tools)))
      .catch(() => undefined);

    consoleApi
      .eventHistory()
      .then((res) => setStream(asArray<StreamFrame>(res.events).slice(-200)))
      .catch(() => undefined);

    const offConn = events.on('connection', ({ state }) => setConnected(state === 'open'));
    const offNotify = events.on('notification', ({ message, type }) =>
      pushToast({ title: message, tone: type, time: clockTime(new Date().toISOString()) }),
    );

    const handle = subscribeStream((frame) => {
      setStream((prev) => [...prev.slice(-400), frame]);
      if (
        frame.event === 'decision.recorded' ||
        frame.event === 'risk.scored' ||
        frame.event === 'pipeline.pipeline_completed' ||
        frame.event === 'agent.run_finished' ||
        frame.event === 'autopilot.sweep_finished'
      ) {
        void loadOverview();
        void loadAgentRuns();
        void loadAudit();
      }
      if (frame.event.indexOf('autopilot.') === 0) void loadAutopilot();
      // The lifecycle board is a projection of the case register, so every
      // caseflow.* frame invalidates it. Reloading the board (rather than
      // patching a card in place) keeps the lane counts and the SLA rings
      // honest — a card that moved lanes server-side must not linger here.
    });

    return () => {
      handle.close();
      offConn();
      offNotify();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  React.useEffect(() => {
    return events.on('applicantUpdated', ({ applicantId }) => {
      if (applicantId === selectedId) void loadDetail(applicantId);
    });
  }, [selectedId, loadDetail]);

  /**
   * While the autopilot is mid-sweep the SSE stream carries the step events but not
   * the aggregate counters, so poll the status until it settles. Only while sweeping:
   * a permanent 2s poll on an idle console is pure noise in the server log.
   */
  React.useEffect(() => {
    if (autopilot?.status?.mode !== 'sweeping') return;
    const timer = window.setInterval(() => void loadAutopilot(), 2000);
    return () => window.clearInterval(timer);
  }, [autopilot?.status?.mode, loadAutopilot]);

  // ---------------------------------------------------------------- derived

  const totals = overview?.totals;
  const queue = React.useMemo<QueueRow[]>(() => asArray<QueueRow>(overview?.queue), [overview]);
  const selectedRow = React.useMemo(
    () => queue.find((r) => r.applicationId === selectedId) ?? null,
    [queue, selectedId],
  );

  const escalated = React.useMemo(() => {
    const ids: string[] = [];
    for (const f of stream) {
      if (f.event !== 'agent.escalated') continue;
      const id = f.payload?.applicationId;
      if (typeof id === 'string' && ids.indexOf(id) === -1) ids.push(id);
    }
    return ids.filter((id) => !queue.find((r) => r.applicationId === id)?.decision);
  }, [stream, queue]);

  // Typed reads. `pipelineComplete` is the gate the officer decision panel keys off,
  // and reading the wrong field is what kept it disabled forever.
  const progress = detail?.progress ?? null;
  const completedStages = asArray<string>(progress?.completed);
  const missingStages = asArray<string>(progress?.missing);
  const pipelineComplete = progress?.pipelineComplete === true;
  const stageRows = asArray<StageRow>(progress?.stages);

  const summary = detail?.summary ?? null;
  const explanation = detail?.explanation ?? null;
  const decided = detail?.decision ?? null;
  const riskScore = detail?.risk?.score ?? null;
  const latestRun = detail?.agent?.latest ?? null;
  const flags = React.useMemo(() => flagsFrom(detail), [detail]);
  const auditRows = React.useMemo(() => auditRowsFrom(auditEntries), [auditEntries]);

  // `completed` is a string[]; the timeline wants {stage, completedAt}. The stage
  // records carry the real timestamps, so pull them from there.
  const timelineSteps = React.useMemo(
    () =>
      toPipelineSteps(
        stageRows
          .filter((row) => row.completed)
          .map((row) => ({ stage: row.stage, completedAt: row.at ?? undefined })),
        missingStages,
      ),
    [stageRows, missingStages],
  );

  const machineRecommendation =
    latestRun?.handoff?.recommendation ?? explanation?.recommendedAction ?? null;
  const machineConfidence = latestRun?.handoff?.confidence ?? null;

  // ---------------------------------------------------------------- actions

  // ------------------------------------------------------- caseflow loaders

  const loadBoard = React.useCallback(async () => {
    try {
      setBoard(await consoleApi.caseflowBoard());
    } catch {
      /* the lane skeleton stays; a failed poll must not blank the board */
    }
  }, []);

  const loadOrchestrator = React.useCallback(async () => {
    try {
      setOrchestrator(await consoleApi.caseflowOrchestrator());
    } catch {
      /* panel renders its idle copy */
    }
  }, []);

  const loadCaseFile = React.useCallback(async (arn: string) => {
    try {
      setCaseFile(await consoleApi.caseFile(arn));
    } catch (err) {
      setCaseFile(null);
      pushToast({ title: 'Case not found', message: errText(err), tone: 'error' });
    }
  }, [pushToast]);

  const openCase = React.useCallback(
    (arn: string) => {
      setCaseArn(arn);
      setCaseFile(null);
      setView('case');
      void loadCaseFile(arn);
    },
    [loadCaseFile],
  );

  // ------------------------------------------------------- caseflow actions

  /**
   * Advance one case as far as PassportIQ is permitted to take it.
   *
   * The toast deliberately reports the *stop reason* rather than a success
   * message: "handed to an officer" is the interesting outcome, and a UI that
   * says "done" after stopping at the gate would misrepresent what happened.
   */
  const advanceCase = React.useCallback(
    async (arn: string, maxSteps = 1) => {
      setCaseBusy(arn);
      try {
        const { result } = await consoleApi.advanceCase(arn, maxSteps);
        setLastAdvance(result);
        await Promise.all([loadBoard(), loadOrchestrator(), loadOverview()]);
        if (caseArn === arn) await loadCaseFile(arn);
        pushToast({
          title: result.handedToOfficer
            ? `${result.applicantName} — handed to an officer`
            : `${result.applicantName} — ${result.toStageLabel}`,
          message: result.stopped,
          tone: result.handedToOfficer ? 'info' : result.stepsFailed > 0 ? 'error' : 'success',
        });
      } catch (err) {
        pushToast({ title: 'Could not advance the case', message: errText(err), tone: 'error' });
      } finally {
        setCaseBusy(null);
      }
    },
    [caseArn, loadBoard, loadCaseFile, loadOrchestrator, loadOverview, pushToast],
  );

  const runCaseflowTick = React.useCallback(async () => {
    setCaseBusy('__tick__');
    try {
      const { result } = await consoleApi.caseflowTick();
      await Promise.all([loadBoard(), loadOrchestrator(), loadOverview()]);
      pushToast({
        title: 'Lifecycle pass complete',
        message: result.message,
        tone: 'success',
      });
    } catch (err) {
      pushToast({ title: 'Lifecycle pass failed', message: errText(err), tone: 'error' });
    } finally {
      setCaseBusy(null);
    }
  }, [loadBoard, loadOrchestrator, loadOverview, pushToast]);

  const setCaseflowArmed = React.useCallback(
    async (armed: boolean) => {
      try {
        const { result } = armed ? await consoleApi.caseflowStart() : await consoleApi.caseflowStop();
        await loadOrchestrator();
        pushToast({
          title: armed ? 'Lifecycle loop armed' : 'Lifecycle loop disarmed',
          message: result.message,
          tone: 'info',
        });
      } catch (err) {
        pushToast({ title: 'Could not change the loop', message: errText(err), tone: 'error' });
      }
    },
    [loadOrchestrator, pushToast],
  );

  const submitApplication = React.useCallback(
    async (input: Record<string, unknown>) => {
      setIntakeBusy(true);
      try {
        const { result } = await consoleApi.submitApplication(input);
        setIntakeResult(result);
        await Promise.all([loadBoard(), loadOverview()]);
        pushToast({
          title: `Application filed — ${result.arn}`,
          message:
            'The case is on the lifecycle board and the fraud graph has been reindexed against ' +
            'the new applicant.',
          tone: 'success',
        });
      } catch (err) {
        pushToast({ title: 'Could not file the application', message: errText(err), tone: 'error' });
      } finally {
        setIntakeBusy(false);
      }
    },
    [loadBoard, loadOverview, pushToast],
  );

  const trackApplication = React.useCallback(async () => {
    const arn = trackArn.trim();
    if (arn === '') return;
    setTrackBusy(true);
    setTrackError(null);
    try {
      const { result } = await consoleApi.callTool<Record<string, unknown>>(
        'track_passport_application',
        { arn },
      );
      setTrackResult(result);
    } catch (err) {
      setTrackResult(null);
      setTrackError(errText(err));
    } finally {
      setTrackBusy(false);
    }
  }, [trackArn]);

  /**
   * Caseflow has its own boot + subscription effect rather than riding the main
   * one, because the loaders are declared after it — and because the lifecycle
   * board is a projection of the case register, so every caseflow.* frame
   * invalidates the whole board rather than one card.
   */
  React.useEffect(() => {
    void loadBoard();
    void loadOrchestrator();
    const handle = subscribeStream((frame) => {
      if (frame.event.indexOf('caseflow.') !== 0) return;
      void loadBoard();
      void loadOrchestrator();
    });
    return () => handle.close();
  }, [loadBoard, loadOrchestrator]);

  /**
   * The case orchestrator advances cases on its own timer, so while it is armed
   * the board can change with no user action at all. Poll it — but only while
   * armed, so an idle console makes no requests.
   */
  React.useEffect(() => {
    if (orchestrator?.status?.mode !== 'running') return;
    const timer = window.setInterval(() => {
      void loadBoard();
      void loadOrchestrator();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [orchestrator?.status?.mode, loadBoard, loadOrchestrator]);

  const openApplication = React.useCallback((id: string) => {
    setSelectedId(id);
    setDecisionError(null);
    setView('application');
  }, []);

  // ---- Copilot chat: history on mount, sends thereafter ---------------------
  React.useEffect(() => {
    let cancelled = false;
    copilotApi
      .history(chatSessionId.current)
      .then((res) => {
        if (!cancelled && res.turns.length > 0) setChatTurns(res.turns);
      })
      .catch(() => {
        /* an empty transcript is a fine first paint */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sendChat = React.useCallback(
    async (message: string) => {
      // Echo the officer turn immediately; the server records its own copy and
      // the ids never collide (server ids are turn-N, this one is local-…).
      setChatTurns((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'officer',
          text: message,
          at: new Date().toISOString(),
          officer: officer.name,
        },
      ]);
      setChatBusy(true);
      setChatError(null);
      try {
        const res = await copilotApi.send(message, chatSessionId.current, officer.name);
        setChatTurns((prev) => [...prev, res.turn]);
        // A decision or an investigation changes the queue — refresh the read model.
        if (res.turn.actions?.some((a) => a.ok)) {
          void loadOverview();
          void loadAgentRuns();
        }
      } catch (err) {
        setChatError(errText(err));
      } finally {
        setChatBusy(false);
      }
    },
    [officer.name, loadOverview, loadAgentRuns],
  );

  const signOut = React.useCallback(() => {
    clearOfficerSession();
    window.location.href = '/login';
  }, []);

  // ---------------------------------------------------------------- routing

  // state -> URL. Guarded so we only write when the hash actually differs,
  // otherwise this effect and the hashchange listener below would ping-pong.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const next = formatRoute(view, selectedId);
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  }, [view, selectedId]);

  // URL -> state, for Back/Forward and for links pasted into the address bar.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onHashChange = () => {
      const route = parseRoute(window.location.hash);
      setView(route.view);
      if (route.applicationId) {
        setSelectedId(route.applicationId);
        setDecisionError(null);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const runPipeline = React.useCallback(
    async (id: string) => {
      setActionBusy('pipeline');
      try {
        const result = (await consoleApi.runPipeline(id)).result;
        const stages = asArray<PipelineStageOutcome>(result?.stages);
        // 'skipped' is not a failure — visual_similarity_flag is optional and is
        // skipped unless a comparison target is supplied. Counting it as a failure
        // would make every clean run look broken.
        const failed = stages.filter((stage) => stage.status === 'failed');
        const completed = stages.filter((stage) => stage.status === 'completed');
        const skipped = stages.filter((stage) => stage.status === 'skipped');

        if (failed.length > 0) {
          pushToast({
            title: `Pipeline finished with ${failed.length} failed stage(s)`,
            message: failed.map((stage) => humaniseStage(stage.stage)).join(', '),
            tone: 'warning',
          });
        } else {
          pushToast({
            title: `Verification pipeline completed for ${id}`,
            message: `${completed.length} stage(s) ran${skipped.length > 0 ? `, ${skipped.length} optional stage(s) skipped` : ''} in ${result?.totalDurationMs ?? 0}ms${
              result?.decisionReady ? ' — the officer decision gate is now open.' : '.'
            }`,
            tone: 'success',
          });
        }
        // Re-read the projection rather than trusting the tool's own `progress`:
        // the two use different field names for the same idea.
        await Promise.all([loadOverview(), loadDetail(id)]);
      } catch (err) {
        pushToast({ title: 'Pipeline failed', message: errText(err), tone: 'error' });
      } finally {
        setActionBusy(null);
      }
    },
    [loadDetail, loadOverview, pushToast],
  );

  const runAgent = React.useCallback(
    async (id: string) => {
      setActionBusy('agent');
      try {
        const res = await consoleApi.runAgent(id);
        const run = res.result;
        pushToast({
          title: `Agent finished investigating ${id}`,
          message: run?.handoff
            ? `${asArray(run.steps).length} steps · recommends ${humanise(run.handoff.recommendation)} · a human still decides`
            : `${asArray(run?.steps).length} steps · stopped: ${humanise(run?.stopReason ?? 'unknown')}`,
          tone: 'info',
        });
        await Promise.all([loadOverview(), loadDetail(id), loadAgentRuns()]);
      } catch (err) {
        pushToast({ title: 'Agent run failed', message: errText(err), tone: 'error' });
      } finally {
        setActionBusy(null);
      }
    },
    [loadAgentRuns, loadDetail, loadOverview, pushToast],
  );

  /**
   * The only place in the product that creates an outcome.
   *
   * `DecisionKind` and the wire verb are deliberately the same three tokens
   * ('approve' | 'clarify' | 'reject'), so there is no translation step to get
   * wrong — the previous revision mapped 'clarify' to 'request_clarification',
   * which Zod rejected, and every decision failed silently.
   */
  const submitDecision = React.useCallback(
    (kind: DecisionKind, note: string) => {
      if (!selectedId) return;
      setActionBusy('decision');
      setDecisionError(null);
      void consoleApi
        .decide(selectedId, { decision: kind as DecisionVerb, note })
        .then(async (res) => {
          pushToast({
            title: `Decision recorded: ${humanise(res.result.decision)}`,
            message: `${selectedId} · signed by ${res.result.officer}`,
            tone: 'success',
          });
          await Promise.all([loadOverview(), loadDetail(selectedId), loadAudit()]);
        })
        .catch((err: unknown) => {
          // The pipeline-complete guard lands here. Its message is written for an
          // officer, so surface it verbatim.
          setDecisionError(errText(err));
          pushToast({ title: 'Decision blocked', message: errText(err), tone: 'warning' });
        })
        .finally(() => setActionBusy(null));
    },
    [loadAudit, loadDetail, loadOverview, pushToast, selectedId],
  );

  const autopilotAction = React.useCallback(
    async (kind: 'sweep' | 'start' | 'stop') => {
      setAutopilotBusy(true);
      setAutopilotError(null);
      try {
        if (kind === 'sweep') {
          const res = await consoleApi.autopilotSweep();
          const s = res.summary;
          pushToast({
            title: 'Autopilot sweep complete',
            message: s
              ? `${s.applicationsInvestigated} investigated · ${asArray(s.escalated).length} escalated · ${s.ringsDetected} ring(s)`
              : undefined,
            tone: 'info',
          });
        } else if (kind === 'start') {
          await consoleApi.autopilotStart();
          pushToast({ title: 'Autopilot armed — it will work the queue continuously', tone: 'success' });
        } else {
          await consoleApi.autopilotStop('officer disarmed from console');
          pushToast({ title: 'Autopilot disarmed', tone: 'info' });
        }
        await Promise.all([loadAutopilot(), loadOverview(), loadAgentRuns(), loadAudit()]);
      } catch (err) {
        setAutopilotError(errText(err));
      } finally {
        setAutopilotBusy(false);
      }
    },
    [loadAgentRuns, loadAudit, loadAutopilot, loadOverview, pushToast],
  );

  const runTriage = React.useCallback(async () => {
    setActionBusy('triage');
    try {
      const res = (await consoleApi.triage()).result;
      pushToast({
        title: 'Queue triaged autonomously',
        message: `${res.processed} application(s) ranked · ${asArray<string>(res.escalated).length} escalated · ${asArray(res.detectedRings).length} ring(s) surfaced`,
        tone: 'info',
      });
      await Promise.all([loadOverview(), loadAgentRuns()]);
      setView('queue');
    } catch (err) {
      pushToast({ title: 'Triage failed', message: errText(err), tone: 'error' });
    } finally {
      setActionBusy(null);
    }
  }, [loadAgentRuns, loadOverview, pushToast]);

  // ----------------------------------------------------------------- chrome

  const nav: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: <IconDashboard size={17} /> },
    {
      id: 'lifecycle',
      label: 'Lifecycle board',
      icon: <IconClock size={17} />,
      count: board?.totals.cases,
    },
    { id: 'intake', label: 'File application', icon: <IconDoc size={17} /> },
    { id: 'track', label: 'Track by ARN', icon: <IconSearch size={17} /> },
    { id: 'queue', label: 'Officer queue', icon: <IconQueue size={17} />, count: totals?.pending },
    { id: 'application', label: 'Application review', icon: <IconUser size={17} /> },
    { id: 'graph', label: 'Fraud graph', icon: <IconGraph size={17} />, count: totals?.rings },
    { id: 'chat', label: 'Ask PassportIQ', icon: <IconChat size={17} /> },
    { id: 'automation', label: 'Automation', icon: <IconBolt size={17} /> },
    { id: 'agent', label: 'Agent runs', icon: <IconAgent size={17} />, count: totals?.agentRuns },
    { id: 'audit', label: 'Audit trail', icon: <IconAudit size={17} />, count: totals?.auditEntries },
  ];

  const quickStats: QuickStat[] = [
    { label: 'Pending review', value: totals?.pending ?? '—' },
    { label: 'High risk', value: totals?.highRisk ?? '—', tone: 'high' },
    { label: 'Linked rings', value: totals?.rings ?? '—', tone: 'medium' },
    { label: 'Agent runs', value: totals?.agentRuns ?? '—', tone: 'machine' },
  ];

  const crumbs = [
    'PassportIQ',
    view === 'case' ? 'Lifecycle board' : (nav.find((n) => n.id === view)?.label ?? 'Overview'),
  ];
  if ((view === 'application' || view === 'graph') && selectedId) crumbs.push(selectedId);
  if (view === 'case' && caseArn !== null) crumbs.push(caseArn);

  // ------------------------------------------------------------------ views

  function renderOverview() {
    return (
      <>
        <EscalationBanner ids={escalated} onSelect={openApplication} />

        <div className="piq-grid-4" style={{ marginBottom: 16 }}>
          <StatsCard
            title="Live applications"
            value={totals?.applications ?? '—'}
            change={totals ? `${totals.pending} pending` : undefined}
            description="Applications currently in the verification pool."
            icon={<IconShield size={16} />}
            tone="blue"
            onClick={() => setView('queue')}
          />
          <StatsCard
            title="High risk"
            value={totals?.highRisk ?? '—'}
            change={totals ? `${totals.mediumRisk} medium` : undefined}
            description="Scored at or above 70 by the cited-rules engine."
            icon={<IconAlert size={16} />}
            tone="danger"
            onClick={() => setView('queue')}
          />
          <StatsCard
            title="Linked clusters"
            value={totals?.rings ?? '—'}
            change={totals ? `largest ${totals.largestRing}` : undefined}
            description="Applications sharing identifiers with each other."
            icon={<IconLink size={16} />}
            tone="warning"
            onClick={() => setView('graph')}
          />
          <StatsCard
            title="Agent runs"
            value={totals?.agentRuns ?? '—'}
            change={totals ? `${totals.escalations} escalated` : undefined}
            description="Autonomous investigations completed this session."
            icon={<IconAgent size={16} />}
            tone="machine"
            onClick={() => setView('agent')}
          />
        </div>

        {overviewError ? (
          <Card title="Read model unavailable">
            <p style={{ margin: 0, fontSize: 13, color: COLORS.high }}>{overviewError}</p>
            <div style={{ marginTop: 10 }}>
              <Button onClick={() => void loadOverview()} icon={<IconRefresh size={14} />}>
                Retry
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="piq-split" style={{ marginBottom: 16 }}>
          <div className="piq-split-main">
            <ApplicantTable
              applicants={queue.slice(0, 8).map(toApplicantRecord)}
              totalCount={queue.length}
              selectedId={selectedId}
              onSelect={openApplication}
              actions={
                queue.length > 8 ? (
                  <Button small onClick={() => setView('queue')}>
                    View all {queue.length}
                  </Button>
                ) : null
              }
            />
          </div>
          <div className="piq-split-side">
            <AutopilotPanel
              compact
              status={autopilot?.status}
              lastSweep={autopilot?.lastSweep}
              busy={autopilotBusy}
              error={autopilotError}
              onSweep={() => void autopilotAction('sweep')}
              onStart={() => void autopilotAction('start')}
              onStop={() => void autopilotAction('stop')}
              onSelect={openApplication}
            />
          </div>
        </div>

        <ActivityStream events={stream} live={connected} height={340} max={40} />
      </>
    );
  }

  function renderQueue() {
    return (
      <TriageQueue
        rows={queue}
        selectedId={selectedId}
        onSelect={openApplication}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button small onClick={() => void loadOverview()} icon={<IconRefresh size={13} />}>
              Refresh
            </Button>
            <Button
              small
              variant="machine"
              disabled={actionBusy !== null}
              onClick={() => void runTriage()}
              icon={<IconAgent size={13} />}
            >
              {actionBusy === 'triage' ? 'Triaging…' : 'Agent-triage queue'}
            </Button>
            <Button
              small
              variant="machine"
              disabled={autopilotBusy}
              onClick={() => void autopilotAction('sweep')}
              icon={<IconBolt size={13} />}
            >
              Autopilot sweep
            </Button>
          </div>
        }
      />
    );
  }

  /**
   * The review screen. Graph centre, dossier right, accountability underneath.
   */
  function renderApplication() {
    if (!selectedId) return <Empty>Select an application from the queue.</Empty>;
    if (detailLoading && !detail) return <Spinner />;
    if (detailError) {
      return (
        <Card title={`Could not load ${selectedId}`}>
          <p style={{ margin: 0, fontSize: 13, color: COLORS.high }}>{detailError}</p>
          <div style={{ marginTop: 10 }}>
            <Button onClick={() => void loadDetail(selectedId)} icon={<IconRefresh size={14} />}>
              Retry
            </Button>
          </div>
        </Card>
      );
    }

    const graph = detail?.graph ?? null;
    const graphNodes = asArray(graph?.nodes);

    return (
      <>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            disabled={actionBusy !== null || pipelineComplete}
            onClick={() => void runPipeline(selectedId)}
            icon={<IconCheck size={14} />}
          >
            {pipelineComplete
              ? 'Pipeline complete'
              : actionBusy === 'pipeline'
                ? 'Running…'
                : `Run verification pipeline (${missingStages.length} left)`}
          </Button>
          <Button
            variant="machine"
            disabled={actionBusy !== null}
            onClick={() => void runAgent(selectedId)}
            icon={<IconAgent size={14} />}
          >
            {actionBusy === 'agent' ? 'Investigating…' : 'Send agent to investigate'}
          </Button>
          <Button onClick={() => setEvidenceOpen(true)} icon={<IconLink size={14} />}>
            Open evidence
          </Button>
          <Button onClick={() => setView('graph')} icon={<IconGraph size={14} />}>
            Full-screen graph
          </Button>
        </div>

        {/* ---- Centrepiece: the relationship graph + the dossier beside it ---- */}
        <div className="piq-split" style={{ marginBottom: 16 }}>
          <div className="piq-split-main">
            <Card
              title="Fraud Relationship Graph"
              subtitle="Dashed edges are identifiers reused across separate live applications — the thing a single-application review can never see."
              eyebrow="Cross-application intelligence"
              icon={<IconGraph size={16} color={COLORS.accent} />}
              actions={
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="piq-chip">
                    <IconLink size={11} />
                    cluster of {selectedRow?.clusterSize ?? 1}
                  </span>
                  <Button
                    small
                    onClick={() => void loadDetail(selectedId)}
                    icon={<IconRefresh size={13} />}
                  >
                    Rebuild
                  </Button>
                </div>
              }
              flush
            >
              {graphNodes.length === 0 ? (
                <div style={{ padding: 18 }}>
                  <Empty>
                    No graph built yet. Run the verification pipeline or send the agent in.
                  </Empty>
                </div>
              ) : (
                <FraudGraph
                  nodes={graph?.nodes}
                  edges={graph?.edges}
                  selectedId={selectedId}
                  onSelect={(id) => {
                    // Hub nodes are not applications; only navigate for real ids.
                    if (queue.some((row) => row.applicationId === id)) openApplication(id);
                  }}
                  // Tall enough that the graph column reaches the bottom of the
                  // applicant panel beside it; a short graph left a dead band of
                  // whitespace running down the middle of the review screen.
                  height={620}
                  live={autopilot?.status?.mode === 'sweeping'}
                  showLegend
                />
              )}
            </Card>
          </div>

          <div className="piq-split-side">
            <ApplicantPanel
              detail={{
                applicationId: summary?.applicationId ?? selectedId,
                applicantName: summary?.applicantName,
                applicationType: summary?.applicationType,
                dateOfBirth: summary?.dateOfBirth,
                passportNumber: summary?.passportNumber,
                phone: summary?.phone ?? null,
                email: summary?.email ?? null,
                address: summary?.address,
                submittedAt: summary?.submittedAt,
                status: summary?.status,
                riskScore,
                confidence: machineConfidence,
                linkedApplicationIds: selectedRow?.linkedApplicationIds,
              }}
              headline={selectedRow?.headline}
              onViewEvidence={() => setEvidenceOpen(true)}
              onSelectLinked={openApplication}
            />
          </div>
        </div>

        {/* ---- Accountability row: what happened, why, and who decides ---- */}
        <div className="piq-grid-3" style={{ marginBottom: 16, alignItems: 'start' }}>
          <Card title="Audit Trail" eyebrow="Immutable record" icon={<IconAudit size={16} />}>
            <AuditTrail
              rows={auditRowsFrom(auditEntries.filter((e) => e.applicationId === selectedId))}
            />
          </Card>

          <Card title="Risk Summary" eyebrow="Cited rules" icon={<IconAlert size={16} />}>
            <RiskSummary
              score={riskScore}
              recommendation={machineRecommendation}
              narrative={explanation?.explanation ?? null}
              flags={flags}
            />
            <div style={{ marginTop: 14 }}>
              <Button
                block
                onClick={() => setView('automation')}
                icon={<IconShield size={14} />}
                disabled={riskScore === null}
              >
                View Full Risk Report
              </Button>
            </div>
          </Card>

          <Card title="Officer Decision" eyebrow="Human authority" icon={<IconUser size={16} />}>
            <OfficerDecision
              officerName={officer.name}
              recommendation={machineRecommendation}
              recommendationRationale={
                latestRun?.handoff?.rationale ?? explanation?.recommendationRationale ?? null
              }
              checklist={asArray<string>(latestRun?.handoff?.officerChecklist)}
              requiresSeniorReview={latestRun?.handoff?.requiresSeniorReview === true}
              disabled={!pipelineComplete || decided !== null}
              disabledReason={
                decided
                  ? 'A decision has already been recorded for this application.'
                  : !pipelineComplete
                    ? `${missingStages.length} required verification stage(s) have not completed (${missingStages
                        .slice(0, 3)
                        .map(humaniseStage)
                        .join(', ')}${missingStages.length > 3 ? '…' : ''}). The pipeline guard rejects a decision until they do.`
                    : undefined
              }
              decided={
                decided
                  ? {
                      decision: decided.decision,
                      at: decided.decidedAt,
                      by: decided.officer,
                      note: decided.note,
                    }
                  : null
              }
              busy={actionBusy === 'decision'}
              error={decisionError}
              onSubmit={submitDecision}
            />
          </Card>
        </div>

        {/* ---- The machine's work, shown as evidence rather than as a verdict ---- */}
        <div className="piq-split">
          <div className="piq-split-main">
            <AgentTrace
              steps={asArray(latestRun?.steps)}
              handoff={latestRun?.handoff?.recommendation}
              stopReason={latestRun?.stopReason}
              planner={latestRun?.planner}
              model={latestRun?.model ?? undefined}
            />
          </div>
          <div className="piq-split-side">
            <Card title="Verification Pipeline" eyebrow="Deterministic stages">
              <PipelineTimeline steps={timelineSteps} live={connected} />
            </Card>
            <RiskPanel
              score={riskScore ?? 0}
              confidence={
                typeof machineConfidence === 'number' ? Math.round(machineConfidence * 100) : undefined
              }
              factors={flags.slice(0, 6).map((flag) => ({
                label: flag.label ?? flag.ruleId ?? 'Rule',
                value: Math.max(4, Math.min(100, Math.round(flag.weight ?? 12))),
                severity: (flag.severity as 'low' | 'medium' | 'high') ?? 'medium',
              }))}
              note={
                riskScore === null
                  ? 'Not scored yet. Run the verification pipeline to produce a score.'
                  : undefined
              }
            />
          </div>
        </div>

        <EvidenceModal
          open={evidenceOpen}
          onClose={() => setEvidenceOpen(false)}
          title={`Evidence — ${selectedId}`}
          subtitle={selectedRow?.headline}
          signals={asArray<DuplicateSignal>(detail?.duplicateSignals?.signals).map((signal) => ({
            type: signal.type,
            severity: signal.severity,
            matchedApplicationId: asArray<string>(signal.matchedApplicationIds).join(', '),
            evidence: signal.value ? { value: signal.value } : undefined,
          }))}
          documents={asArray(detail?.documents)}
        />
      </>
    );
  }

  function renderGraph() {
    const graph = detail?.graph ?? null;
    const nodes = asArray(graph?.nodes);
    const rings = asArray<RingRow>(overview?.rings);

    return (
      <>
        <Card
          title="Cross-application relationship graph"
          subtitle="Solid edges are structural. Dashed edges are identifiers reused across separate live applications — the thing a single-application review can never see."
          eyebrow="Fraud intelligence"
          icon={<IconGraph size={16} color={COLORS.accent} />}
          actions={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedId ? <span className="piq-chip">{selectedId}</span> : null}
              <Button
                small
                onClick={() => selectedId && void loadDetail(selectedId)}
                icon={<IconRefresh size={13} />}
              >
                Rebuild
              </Button>
            </div>
          }
          flush
        >
          {nodes.length === 0 ? (
            <div style={{ padding: 18 }}>
              <Empty>No graph built yet. Run the verification pipeline or send the agent in.</Empty>
            </div>
          ) : (
            <FraudGraph
              nodes={graph?.nodes}
              edges={graph?.edges}
              selectedId={selectedId}
              onSelect={(id) => {
                if (queue.some((row) => row.applicationId === id)) openApplication(id);
              }}
              height={560}
              live={autopilot?.status?.mode === 'sweeping'}
              showLegend
            />
          )}
        </Card>

        <div style={{ marginTop: 16 }}>
          <Card
            title="Detected clusters"
            eyebrow="Rings"
            subtitle="Groups of applications joined by at least one shared identifier. A cluster has no id on the wire — it is identified by its membership."
            flush
          >
            {rings.length === 0 ? (
              <div style={{ padding: 18 }}>
                <Empty>No clusters detected.</Empty>
              </div>
            ) : (
              <div className="piq-scroll" style={{ overflowX: 'auto' }}>
                <table className="piq-table">
                  <thead>
                    <tr>
                      <th>Cluster</th>
                      <th>Size</th>
                      <th>Shared identifiers</th>
                      <th>Applications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rings.map((ring) => {
                      const members = asArray<string>(ring.applicationIds);
                      // Membership IS the identity — a stable key without inventing a ringId.
                      const key = members.slice().sort().join('|');
                      return (
                        <tr key={key}>
                          <td style={{ fontWeight: 600, maxWidth: 260 }}>{ring.headline}</td>
                          <td>{ring.size}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {asArray<string>(ring.sharedSignalKinds).map((kind) => (
                                <span className="piq-chip" key={kind}>
                                  {humanise(kind)}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              {members.map((id) => (
                                <button
                                  key={id}
                                  type="button"
                                  className="piq-btn piq-btn-sm"
                                  onClick={() => openApplication(id)}
                                >
                                  {id}
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  /**
   * The automation screen — "where is the passport process".
   *
   * This exists because the MCP tool list alone does not show the officer that
   * anything happens autonomously. Here the ten-stage pipeline, the autopilot loop,
   * the agent's action allow-list, and the registered tool surface are all visible
   * at once, along with the one claim that governs the whole product: the machine
   * cannot decide.
   */
  /**
   * The lifecycle board — the answer to "where is the passport process?".
   *
   * Every lane is a real stage of the Passport Seva journey, every card is a
   * live case, and every button on a card executes a NitroStack MCP tool. The
   * orchestrator panel sits above the lanes because the interesting claim about
   * this board is not that it renders state, it is that something is *driving*
   * it — and that the driver stops on its own at the officer gate.
   */
  function renderLifecycle() {
    return (
      <>
        <OrchestratorPanel
          status={orchestrator?.status ?? null}
          ticks={orchestrator?.ticks ?? []}
          busy={caseBusy === '__tick__'}
          onTick={() => void runCaseflowTick()}
          onStart={() => void setCaseflowArmed(true)}
          onStop={() => void setCaseflowArmed(false)}
          lastAdvance={lastAdvance}
        />

        <Card
          eyebrow="Passport Seva application lifecycle"
          title="Case board"
          subtitle={
            board
              ? `${board.totals.cases} case(s) · ${board.totals.waitingOnHuman} awaiting a human officer · ` +
                `${board.totals.breached} past SLA · ${board.totals.closed} closed`
              : 'Loading the case register…'
          }
          icon={<IconClock size={16} />}
          actions={
            <Button small icon={<IconRefresh size={13} />} onClick={() => void loadBoard()}>
              Refresh
            </Button>
          }
          flush
        >
          <LifecycleBoard
            board={board}
            busyArn={caseBusy}
            onOpen={openCase}
            onAdvance={(arn) => void advanceCase(arn, 6)}
            onDecide={openApplication}
          />
        </Card>
      </>
    );
  }

  /** One case, end to end: stage rail, artefacts, and the full decision journal. */
  function renderCase() {
    if (caseArn === null) {
      return (
        <Card title="No case selected" subtitle="Open a case from the lifecycle board.">
          <Empty>
            Pick a card on the lifecycle board to read its file, artefacts and journal.
            <div style={{ marginTop: 12 }}>
              <Button variant="primary" onClick={() => setView('lifecycle')}>
                Go to the board
              </Button>
            </div>
          </Empty>
        </Card>
      );
    }
    return (
      <CaseJourney
        file={caseFile}
        busy={caseBusy === caseArn}
        onAdvance={(arn, maxSteps) => void advanceCase(arn, maxSteps)}
        onDecide={openApplication}
        onBack={() => setView('lifecycle')}
      />
    );
  }

  /**
   * File a real application. This is the head of the pipeline: the form calls
   * submit_passport_application, which mints an ARN, registers a case, adds the
   * applicant to the fraud graph and reindexes it — so a submission made here is
   * immediately visible to every fraud tool in the server.
   */
  function renderIntake() {
    return (
      <IntakeForm
        busy={intakeBusy}
        onSubmit={(input) => void submitApplication(input)}
        lastResult={intakeResult}
      />
    );
  }

  /** The citizen-facing side of the same register — deliberately thinner. */
  function renderTrack() {
    return (
      <ArnTracker
        value={trackArn}
        onChange={setTrackArn}
        onSearch={() => void trackApplication()}
        busy={trackBusy}
        result={trackResult}
        error={trackError}
      />
    );
  }

  function renderAutomation() {
    const stages = stageRows.length > 0 ? stageRows : null;
    const nextStage = missingStages[0] ?? null;

    return (
      <>
        <div className="piq-authority" style={{ marginBottom: 16 }}>
          <span style={{ color: COLORS.machine, display: 'flex', paddingTop: 1 }}>
            <IconShield size={17} />
          </span>
          <div className="piq-authority-text">
            <strong>The automation stops before the decision.</strong> The pipeline scores, the agent
            investigates and the autopilot works the queue unattended — but{' '}
            <code>officer_decide</code> is absent from the agent&apos;s action allow-list and is
            guarded server-side. Every outcome in the audit trail carries a human officer&apos;s
            identity, because a passport decision is a personal accountability.
          </div>
        </div>

        <div className="piq-split" style={{ marginBottom: 16 }}>
          <div className="piq-split-main">
            <AutopilotPanel
              status={autopilot?.status}
              lastSweep={autopilot?.lastSweep}
              busy={autopilotBusy}
              error={autopilotError}
              onSweep={() => void autopilotAction('sweep')}
              onStart={() => void autopilotAction('start')}
              onStop={() => void autopilotAction('stop')}
              onSelect={openApplication}
            />
          </div>
          <div className="piq-split-side">
            <Card
              title="Autonomous triage"
              eyebrow="Whole-queue sweep"
              subtitle="One agent run per application, ranked by how urgently a human is needed. Correlates across the queue, so rings surface that no single review would find."
              icon={<IconAgent size={16} color={COLORS.machine} />}
            >
              <Button
                variant="machine"
                block
                disabled={actionBusy !== null}
                onClick={() => void runTriage()}
                icon={<IconBolt size={14} />}
              >
                {actionBusy === 'triage' ? 'Triaging the queue…' : 'Triage the whole queue now'}
              </Button>
              <div className="piq-grid-2" style={{ marginTop: 14 }}>
                <div className="piq-ministat">
                  <div className="piq-ministat-value">{totals?.agentRuns ?? 0}</div>
                  <div className="piq-ministat-label">Agent runs</div>
                </div>
                <div className="piq-ministat">
                  <div className="piq-ministat-value" style={{ color: COLORS.high }}>
                    {totals?.escalations ?? 0}
                  </div>
                  <div className="piq-ministat-label">Escalations</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card
          title="Verification pipeline"
          eyebrow={selectedId ? `Stage state for ${selectedId}` : 'Ten deterministic stages'}
          subtitle="A fixed chain, replayable and boring on purpose. The agent may choose its own path through these tools; the pipeline always runs them in this order."
          icon={<IconCheck size={16} color={COLORS.low} />}
          actions={
            selectedId ? (
              <Button
                small
                variant="primary"
                disabled={actionBusy !== null || pipelineComplete}
                onClick={() => void runPipeline(selectedId)}
                icon={<IconRefresh size={13} />}
              >
                {pipelineComplete ? 'Complete' : actionBusy === 'pipeline' ? 'Running…' : 'Run now'}
              </Button>
            ) : undefined
          }
        >
          {stages === null ? (
            <Empty>Select an application to see its stage state.</Empty>
          ) : (
            <>
              <div className="piq-rail">
                {stages.map((row: StageRow) => {
                  const state = row.completed
                    ? 'is-done'
                    : row.stage === nextStage
                      ? 'is-active'
                      : '';
                  return (
                    <div
                      className={`piq-rail-cell ${state}${row.required ? '' : ' is-optional'}`}
                      key={row.stage}
                      title={row.stage}
                    >
                      <div className="piq-rail-name">{humaniseStage(row.stage)}</div>
                      <div className="piq-rail-meta">
                        {row.completed
                          ? (row.at ? clockTime(row.at) : 'done')
                          : row.stage === nextStage
                            ? 'next'
                            : row.required
                              ? 'pending'
                              : 'optional'}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p
                style={{
                  margin: '14px 0 0',
                  fontSize: 12.5,
                  lineHeight: 1.65,
                  color: COLORS.textSecondary,
                }}
              >
                {completedStages.length} of {stages.length} stage(s) recorded ·{' '}
                {progress?.percent ?? 0}% complete ·{' '}
                {pipelineComplete ? (
                  <strong style={{ color: COLORS.low }}>
                    the decision gate is open for a human officer
                  </strong>
                ) : (
                  <strong style={{ color: COLORS.medium }}>
                    the decision gate is closed until the required stages finish
                  </strong>
                )}
              </p>
            </>
          )}
        </Card>

        <div className="piq-grid-2" style={{ marginTop: 16, alignItems: 'start' }}>
          <Card
            title="Agent action space"
            eyebrow="Allow-list"
            subtitle="An agent that can only choose from an enumerated action space cannot invent a call that writes an outcome."
            icon={<IconAgent size={16} color={COLORS.machine} />}
          >
            <div className="piq-toolgrid">
              {AGENT_ACTIONS.map((action) => (
                <div className="piq-tool" key={action}>
                  <span
                    className="piq-tool-dot"
                    style={{ background: action === 'handoff_to_officer' ? COLORS.machine : COLORS.low }}
                  />
                  {action}
                </div>
              ))}
              <div className="piq-tool" style={{ borderColor: COLORS.highBorder, background: COLORS.highSoft }}>
                <span className="piq-tool-dot" style={{ background: COLORS.high }} />
                <s>officer_decide</s>
              </div>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 11.5, lineHeight: 1.6, color: COLORS.textMuted }}>
              <code>officer_decide</code> is struck through because it is deliberately not in the
              allow-list. The agent&apos;s terminal action is a handoff carrying a recommendation, a
              rationale and an officer checklist — nothing more.
            </p>
          </Card>

          <Card
            title="Registered MCP tools"
            eyebrow={`${toolNames.length} tools on the NitroStack server`}
            subtitle="Every write on this console executes one of these. There is no second code path."
            icon={<IconBolt size={16} color={COLORS.accent} />}
          >
            {toolNames.length === 0 ? (
              <Empty>Tool registry not reported yet.</Empty>
            ) : (
              <div className="piq-toolgrid">
                {toolNames.map((name) => (
                  <div className="piq-tool" key={name}>
                    <span className="piq-tool-dot" />
                    {name}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div style={{ marginTop: 16 }}>
          <ActivityStream
            events={stream}
            live={connected}
            height={360}
            title="Automation event stream"
            emptyHint="No events yet. Run a sweep or a pipeline."
          />
        </div>
      </>
    );
  }

  function renderAgent() {
    return (
      <div className="piq-split">
        <div className="piq-split-main" style={{ display: 'grid', gap: 16 }}>
          <AutopilotPanel
            status={autopilot?.status}
            lastSweep={autopilot?.lastSweep}
            busy={autopilotBusy}
            error={autopilotError}
            onSweep={() => void autopilotAction('sweep')}
            onStart={() => void autopilotAction('start')}
            onStop={() => void autopilotAction('stop')}
            onSelect={openApplication}
          />
          <AgentRunHistory
            runs={agentRuns}
            onSelect={(runId) => {
              const run = agentRuns.find((r) => r.runId === runId);
              if (run) openApplication(run.applicationId);
            }}
          />
        </div>
        <div className="piq-split-side">
          <ActivityStream
            events={stream.filter(
              (f) => f.event.indexOf('agent.') === 0 || f.event.indexOf('autopilot.') === 0,
            )}
            live={connected}
            height={620}
            title="Agent activity"
            emptyHint="No agent activity yet. Run a sweep."
          />
        </div>
      </div>
    );
  }

  function renderAudit() {
    return (
      <>
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 16,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Button
            small
            variant={auditScope === null ? 'primary' : undefined}
            onClick={() => void loadAudit()}
            icon={<IconRefresh size={13} />}
          >
            All applications
          </Button>
          {selectedId ? (
            <Button
              small
              variant={auditScope === selectedId ? 'primary' : undefined}
              onClick={() => void loadAudit(selectedId)}
              icon={<IconAudit size={13} />}
            >
              Only {selectedId}
            </Button>
          ) : null}
          <span style={{ fontSize: 12.5, color: COLORS.textMuted }}>
            {auditRows.length} entr{auditRows.length === 1 ? 'y' : 'ies'} ·{' '}
            {auditScope === null ? 'all applications' : `scoped to ${auditScope}`} · newest first
          </span>
        </div>
        <Card
          title="Audit trail"
          eyebrow="Immutable record"
          subtitle="Every recorded outcome, with the officer who signed it and the risk score at the moment of decision."
          flush
        >
          <div style={{ padding: 16 }}>
            <AuditTrail rows={auditRows} />
          </div>
        </Card>
      </>
    );
  }

  const autopilotArmed =
    autopilot?.status?.enabled === true && autopilot.status.mode !== 'stopped';
  const sweeping = autopilot?.status?.mode === 'sweeping';

  return (
    <AppShell>
      <Sidebar
        nav={nav}
        activeId={view}
        onNavigate={(id) => setView(id as ViewId)}
        stats={quickStats}
        navLabel="Console"
      />
      <MainColumn>
        <TopBar
          crumbs={crumbs}
          live={{ label: connected ? 'live' : 'reconnecting', tone: connected ? 'live' : 'idle' }}
          notifications={escalated.length}
          officer={officer}
          extra={
            sweeping ? (
              <span className="piq-chip" style={{ color: COLORS.machine, borderColor: '#E9D5FF' }}>
                <span className="piq-pulse-dot" />
                autopilot sweeping
                {autopilot?.status?.currentApplicationId
                  ? ` · ${autopilot.status.currentApplicationId}`
                  : ''}
              </span>
            ) : autopilotArmed ? (
              <span className="piq-chip">
                <IconBolt size={13} />
                autopilot armed
              </span>
            ) : null
          }
          onLogout={signOut}
        />
        <Content>
          {overview === null && overviewError === null ? (
            <Spinner />
          ) : view === 'overview' ? (
            renderOverview()
          ) : view === 'lifecycle' ? (
            renderLifecycle()
          ) : view === 'case' ? (
            renderCase()
          ) : view === 'intake' ? (
            renderIntake()
          ) : view === 'track' ? (
            renderTrack()
          ) : view === 'queue' ? (
            renderQueue()
          ) : view === 'application' ? (
            renderApplication()
          ) : view === 'graph' ? (
            renderGraph()
          ) : view === 'chat' ? (
            <CopilotChat
              turns={chatTurns}
              busy={chatBusy}
              error={chatError}
              officerName={officer.name}
              onSend={(m) => void sendChat(m)}
              onOpenApplication={openApplication}
            />
          ) : view === 'automation' ? (
            renderAutomation()
          ) : view === 'agent' ? (
            renderAgent()
          ) : (
            renderAudit()
          )}

          <p
            style={{
              margin: '22px 0 0',
              fontSize: 11.5,
              color: COLORS.textMuted,
              textAlign: 'center',
            }}
          >
            PassportIQ · every write on this page executes a NitroStack MCP tool
            {toolNames.length > 0 ? ` · ${toolNames.length} tools registered` : ''}
            {overview ? ` · read model ${dateTime(overview.generatedAt)}` : ''}
          </p>
        </Content>
      </MainColumn>

      <NotificationStack
        items={toasts}
        onDismiss={(id) => setToasts((p) => p.filter((t) => t.id !== id))}
      />
    </AppShell>
  );
}

/**
 * The agent's action allow-list, mirroring `AgentActionSchema`.
 *
 * Duplicated here rather than imported: `src/widgets/` is a separate npm project
 * that esbuild bundles standalone, so it cannot reach into `src/contracts/`. The
 * automation screen renders this list to make the constraint visible, and the
 * console acceptance suite asserts the server's real allow-list — so a drift
 * between the two fails the build rather than quietly misleading an officer.
 */
const AGENT_ACTIONS = [
  'document_validate',
  'ocr_extract',
  'check_identity_consistency',
  'check_address_consistency',
  'detect_duplicate_signals',
  'build_risk_graph',
  'visual_similarity_flag',
  'evaluate_rules',
  'score_risk',
  'explain_risk',
  'handoff_to_officer',
] as const;
