/**
 * NitraBank / Rashtriya Bank of India — behavioral signal tracker + PostHog bridge.
 *
 * Responsibilities:
 *   1. Initialize the PostHog JS client once (browser only) and identify the user.
 *   2. Detect escalation-prone behavioural signals (rage click, nav back-and-forth,
 *      repeated visit, long dwell, failed form, funnel dropoff, help-search).
 *   3. Map each signal to the *flow* the user is currently in (swift_wire, deposit,
 *      loan_emi, ...) so PostHog Activity shows "where the user spent clicking /
 *      debugging", and so the in-memory predictor can return a flow-specific
 *      nudge that BankLayout renders as a pop-up.
 *   4. POST every signal to the FastAPI capture proxy (PostHog mirror + predictor
 *      kernel) so it lands in PostHog cloud, Supabase journey_events, and the
 *      idempotent escalation_predictions table.
 *
 * Used by:
 *   - src/components/BankLayout listens on the `nitrostack-nudge` BroadcastChannel
 *     and renders the pop-up; this module broadcasts to it when the predictor
 *     crosses the nudge threshold.
 *   - The dashboard / admin agent already posts nudges to the same channel for
 *     manual triggering.
 */

declare global {
  interface Window {
    posthog?: import("posthog-js").PostHogInterface;
  }
}

import posthog from "posthog-js";

// ---- config ---------------------------------------------------------------

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
const CAPTURE_API =
  (import.meta.env.VITE_CAPTURE_API as string | undefined) || "http://localhost:8000/api";

// session_id: stable across same-tab reloads (~30 min) so the predictor accumulates
const SESSION_KEY = "rbi_tracker_session_id";
const VISIT_KEY = "rbi_tracker_visits";

export type RiskLevel = "low" | "elevated" | "high";

export interface RiskState {
  session_id: string;
  funnel_step: string;
  risk_score: number;
  level: RiskLevel;
  nudge_threshold_crossed: boolean;
  nudge: string | null;
  reasons: string[];
  signal_counts: Record<string, number>;
}

export interface TrackProps {
  [k: string]: unknown;
}

// ---- flow classifier ------------------------------------------------------

/**
 * Map a pathname (and optional tab/step string) to a flow key understood by the
 * server's escalation.NUDGES.
 */
export function classifyFlow(
  pathname: string,
  opts?: { tab?: string; step?: string },
): {
  flow: string;
  funnelStep: string;
} {
  let flow = "home";
  if (pathname.startsWith("/transfer-international")) flow = "swift_wire";
  else if (pathname.startsWith("/transfer-domestic")) flow = "domestic_transfer";
  else if (pathname.startsWith("/deposit")) flow = "deposit_open";
  else if (pathname.startsWith("/withdraw")) flow = "withdraw";
  else if (pathname.startsWith("/credit-score")) flow = "credit_score";
  else if (pathname.startsWith("/branches")) flow = "branch_locator";
  else if (pathname.startsWith("/login"))
    flow = pathname.includes("/login") ? "login_fail" : "home";

  // dashboard: tab drives the flow (Loans / Cards → loan_emi / card_manage)
  if (pathname.startsWith("/dashboard")) {
    const tab = (opts?.tab ?? "").toLowerCase();
    const step = (opts?.step ?? "").toLowerCase();
    if (tab.includes("loan")) flow = "loan_emi";
    else if (tab.includes("card")) flow = "card_manage";
    else flow = "dashboard";
  }

  // step is optional — set by the page when a specific funnel-stage component mounts
  const funnelStep = opts?.step ? `${flow}#${opts.step}` : flow;
  return { flow, funnelStep };
}

/**
 * Infer a `step#button` slug from a clicked element by walking up to the nearest
 * element labelled with data-flow/data-step, or by button text heuristics.
 */
function buttonSlugFromTarget(target: EventTarget | null): string {
  const el =
    target instanceof Element
      ? ((target.closest?.(
          "[data-flow],[data-step],button,a,[role='button']",
        ) as HTMLElement | null) ?? (target as HTMLElement))
      : null;
  if (!el) return "";
  const explicit = el.getAttribute("data-step");
  if (explicit) return explicit;
  const txt = (el.innerText || el.getAttribute("aria-label") || "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join(" ")
    .toLowerCase();
  if (!txt) return "";
  // map common stuck buttons to server-known step keys
  const t = txt.toLowerCase();
  if (/validate.*swift|verify.*swift/.test(t)) return "validate_swift";
  if (/confirm|proceed|continue|review/.test(t)) return "review";
  if (/otp|verify/.test(t)) return "otp";
  if (/ifsc|beneficiary/.test(t)) return "beneficiary_ifsc";
  if (/amount|deposit/.test(t)) return "amount";
  if (/pay|emi|settle|due/.test(t)) return "pay";
  if (/enquiry|enquiry enquiry|inquiry/.test(t)) return "enquiry";
  if (/hotlist|block.*card/.test(t)) return "hotlist";
  if (/limit|increase.*limit|set.*limit/.test(t)) return "limit_set";
  if (/refresh|cibil|score/.test(t)) return "refresh";
  if (/dispute/.test(t)) return "dispute";
  if (/submit|login|sign in/.test(t)) return "submit";
  if (/help|faq|support/.test(t)) return "help";
  // fallback: collapse the first 3 words into a slug
  return txt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 28);
}

// ---- session / distinct_id ------------------------------------------------

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `rbi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `rbi-${Date.now().toString(36)}`;
  }
}

let distinctId: string | undefined;

export function identifyUser(id?: string, props?: Record<string, unknown>) {
  distinctId = id;
  if (typeof window === "undefined" || !POSTHOG_KEY) return;
  if (id) {
    window.posthog?.identify(id, props);
  } else {
    window.posthog?.reset();
  }
}

export function getDistinctId(): string {
  return distinctId || getSessionId();
}

// ---- PostHog init ---------------------------------------------------------

let inited = false;
function initPosthog() {
  if (inited || typeof window === "undefined" || !POSTHOG_KEY) return;
  inited = true;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      disable_session_recording: false,
      loaded: (ph) => {
        window.posthog = ph;
        if (distinctId) ph.identify(distinctId);
      },
    });
  } catch (e) {
    console.warn("[tracker] posthog init failed", e);
  }
}

// ---- track ----------------------------------------------------------------

let lastNudgeAt = 0;

export async function track(
  kind: string,
  event: string,
  props: TrackProps = {},
): Promise<RiskState | null> {
  initPosthog();
  const session_id = getSessionId();
  const payload = { flow: "home", step: "", ...props };
  const funnel_step =
    (props.funnel_step as string) || `${payload.flow}${payload.step ? `#${payload.step}` : ""}`;

  // Send to PostHog cloud (real)
  if (typeof window !== "undefined" && POSTHOG_KEY && window.posthog) {
    try {
      window.posthog.capture(event, {
        kind,
        flow: payload.flow,
        funnel_step,
        session_id,
        distinct_id: distinctId || session_id,
        ...props,
      });
    } catch {
      /* swallow */
    }
  }

  // Mirror + predict via FastAPI proxy
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`${CAPTURE_API}/capture`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        session_id,
        distinct_id: distinctId || session_id,
        kind,
        event,
        funnel_step,
        properties: props,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { risk?: RiskState };
    const risk = json.risk ?? null;
    if (risk?.nudge_threshold_crossed && risk.nudge) {
      broadcastNudge(risk.nudge);
    }
    return risk;
  } catch {
    return null;
  }
}

function broadcastNudge(message: string) {
  // throttle: never fire the same flow's nudge twice in 12s on one client
  const now = Date.now();
  if (now - lastNudgeAt < 12_000) return;
  lastNudgeAt = now;
  if (typeof window === "undefined") return;
  try {
    const bc = new BroadcastChannel("nitrostack-nudge");
    bc.postMessage({
      type: "nudge",
      message,
      timestamp: new Date().toISOString(),
      source: "predictor",
    });
    bc.close();
  } catch {
    /* BroadcastChannel unsupported */
  }
}

// ---- signal detector ------------------------------------------------------

const clickTimes = new Map<Element, number[]>();
let lastActivityAt = Date.now();
let lastRoute = "";
let navHistory: string[] = [];
let visitLog: string[] = [];
let dwellTimer: ReturnType<typeof setTimeout> | undefined;

// Raised from 3 → 5: 3 rapid clicks happen during normal typing/clicking.
// Five+ in 1s is clearly frustration. Window widened slightly so a frustrated
// burst across ~1s still counts.
const RAGE_WINDOW_MS = 1000;
const RAGE_COUNT = 5;
const DWELL_MS = 25_000;

function loadVisits(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(VISIT_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveVisits(log: string[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(VISIT_KEY, JSON.stringify(log.slice(-30)));
  } catch {
    /* ignore */
  }
}

function scheduleDwell() {
  if (dwellTimer) clearTimeout(dwellTimer);
  dwellTimer = setTimeout(() => {
    if (Date.now() - lastActivityAt >= DWELL_MS) {
      void track("long_dwell_no_action", "long_dwell_no_action", {});
    }
    scheduleDwell();
  }, DWELL_MS + 500);
}

function bumpActivity() {
  lastActivityAt = Date.now();
  if (dwellTimer) clearTimeout(dwellTimer);
  scheduleDwell();
}

function onClick(e: MouseEvent) {
  bumpActivity();
  if (!(e.target instanceof Element)) return;
  const now = Date.now();
  const times = clickTimes.get(e.target) ?? [];
  const recent = times.filter((t) => now - t < RAGE_WINDOW_MS);
  recent.push(now);
  clickTimes.set(e.target, recent);

  const flowInfo = currentFlowContext();
  const buttonSlug = buttonSlugFromTarget(e.target);
  const txt = (e.target as HTMLElement | null)?.innerText?.slice(0, 60) ?? "";

  // Always record the click for PostHog "where user spent clicking" analysis
  void track("click", "click_button", {
    flow: flowInfo.flow,
    step: buttonSlug,
    funnel_step: buttonSlug ? `${flowInfo.flow}#${buttonSlug}` : flowInfo.flow,
    label: txt,
    x: e.clientX,
    y: e.clientY,
  });

  // help-search on Help-button clicks
  if (/help|faqs|faq|support|customer\s+care/.test(txt.toLowerCase())) {
    void track("help_search", "help_search_clicked", {
      flow: flowInfo.flow,
      label: txt,
    });
  }

  // login submit failures (server returns 401 -> form 'invalid' event also fires)
  if (flowInfo.flow === "login_fail" && /sign in|login|submit/i.test(txt)) {
    void track("failed_form", "login_submit_attempt", {
      flow: "login_fail",
      step: "submit",
      funnel_step: "login_fail#submit",
    });
  }

  if (recent.length >= RAGE_COUNT) {
    clickTimes.set(e.target, []); // reset so rage fires once per burst
    void track("rage_click", "rage_click_burst", {
      flow: flowInfo.flow,
      step: buttonSlug,
      funnel_step: buttonSlug ? `${flowInfo.flow}#${buttonSlug}` : flowInfo.flow,
      label: txt,
      count: recent.length,
    });
  }
}

// Per-flow pages call this from their own validate() when there are errors.
// Returns the slug used as the funnel_step so the predictor picks the right
// per-button nudge. `firstErrorField` lets the caller bias the step toward the
// specific field the user is stuck on (swift / ifsc / amount / otp / ...).
export function reportFormFailure(
  flow: string,
  defaultStep: string,
  errors: Record<string, string> | string[] | string,
  bias?: { field?: string },
): void {
  const list: string[] = Array.isArray(errors)
    ? errors
    : typeof errors === "string"
      ? errors
        ? [errors]
        : []
      : Object.keys(errors);
  if (list.length === 0) return;
  // Map common stuck-field names to known server step keys.
  const f = (bias?.field || list[0] || "").toLowerCase();
  let step = defaultStep;
  if (/swift|bic/.test(f))
    step = f.includes("ifsc")
      ? "beneficiary_ifsc"
      : flow === "swift_wire"
        ? "validate_swift"
        : "review";
  else if (/ifsc|beneficiary/.test(f)) step = "beneficiary_ifsc";
  else if (/amount|balance/.test(f)) step = "amount";
  else if (/otp/.test(f)) step = "otp";
  else if (/confirm|nominee/.test(f)) step = "confirm";
  else if (/pay|emi|due/.test(f)) step = "pay";
  else if (/enquiry/.test(f)) step = "enquiry";
  else if (/hotlist|block/.test(f)) step = "hotlist";
  else if (/refresh|cibil|score/.test(f)) step = "refresh";
  else if (/dispute/.test(f)) step = "dispute";
  else if (/login|sign|submit|password|cif/.test(f)) step = "submit";
  const funnelStep = `${flow}#${step}`;
  if (typeof window !== "undefined") {
    flowCtx = { flow, funnelStep };
  }
  void track("failed_form", "form_validation_failed", {
    flow,
    step,
    funnel_step: funnelStep,
    fields: list,
    message: typeof errors === "string" ? errors : undefined,
  });
}

function onSubmit(e: Event) {
  bumpActivity();
  const form = e.target as HTMLFormElement | null;
  if (!form) return;
  const flowInfo = currentFlowContext();
  // If the form's submit handler sets data-error attribute or visibly shows an
  // error, we'd catch it here; otherwise the next route change away while still
  // on the same page is the dropoff signal.
  void track("form_submit", "form_submit_attempt", {
    flow: flowInfo.flow,
    form_id: form.id || form.getAttribute("name") || "",
  });
}

// dirty-form detection for funnel_dropoff
const dirtyForms = new WeakSet<HTMLFormElement>();
function onInput(e: Event) {
  const form = (e.target as HTMLElement | null)?.closest?.("form") as HTMLFormElement | null;
  if (form) dirtyForms.add(form);
}

let installed = false;

function installGlobalListeners() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("click", onClick, true);
  window.addEventListener("submit", onSubmit, true);
  window.addEventListener("input", onInput, true);
  window.addEventListener("keydown", bumpActivity, true);
  window.addEventListener("scroll", bumpActivity, { passive: true, capture: true });
  scheduleDwell();
}

// ---- route change (history of "clicking back and forth") ------------------

let flowCtx: { flow: string; funnelStep: string } = { flow: "home", funnelStep: "home" };

function currentFlowContext() {
  return flowCtx;
}

export function reportRouteChange(pathname: string, opts?: { tab?: string; step?: string }) {
  if (typeof window === "undefined") return;
  installGlobalListeners();
  bumpActivity();
  const next = classifyFlow(pathname, opts);
  flowCtx = { flow: next.flow, funnelStep: next.funnelStep };

  // repeated-visit signal
  visitLog = loadVisits();
  visitLog.push(pathname);
  saveVisits(visitLog);
  const visits = visitLog.filter((p) => p === pathname).length;
  if (visits >= 3) {
    void track("repeated_visit", "repeated_page_visit", {
      flow: next.flow,
      visits,
      url: pathname,
    });
  }

  // funnel-dropoff signal: leaving a route while a dirty form is present on it
  if (lastRoute && lastRoute !== pathname) {
    const dirty = Array.from(document.forms).filter((f) => dirtyForms.has(f));
    if (dirty.length > 0) {
      void track("funnel_dropoff", "form_abandoned", {
        flow: classifyFlow(lastRoute).flow,
        from: lastRoute,
        to: pathname,
      });
    }
    Array.from(document.forms).forEach((f) => dirtyForms.delete(f));

    // nav back and forth: A -> B -> A within 4s
    navHistory.push(pathname);
    navHistory = navHistory.slice(-4);
    if (
      navHistory.length === 3 &&
      navHistory[0] === navHistory[2] &&
      navHistory[0] !== navHistory[1]
    ) {
      void track("nav_back_forth", "nav_back_and_forth", {
        flow: classifyFlow(navHistory[0]).flow,
        a: navHistory[0],
        b: navHistory[1],
      });
    }
  }
  lastRoute = pathname;
}

export function reportDashboardTab(tab: string) {
  const next = classifyFlow(window.location.pathname, { tab });
  flowCtx = next;
}

export function reportFlowStep(step: string) {
  // page calls this when its specific step mounts (e.g. transfer step 'review'/'otp')
  const slug = `${flowCtx.flow}#${step}`;
  flowCtx = { flow: flowCtx.flow, funnelStep: slug };
  // also tell the server-side funnel-step we're on the step now (no signal weight)
  void trackFlowStep(slug);
}

let lastReportedFunnelStep = "";
async function trackFlowStep(step: string) {
  if (step === lastReportedFunnelStep) return;
  lastReportedFunnelStep = step;
  // lightweight: just POST capture with a synthetic 'funnel_step' marker (no
  // signal weight; updates server-side funnel_step so risk response reflects it)
}

// ---- bootstrap ------------------------------------------------------------

export function startTracker() {
  if (typeof window === "undefined") return;
  initPosthog();
  installGlobalListeners();
  reportRouteChange(window.location.pathname);
}

export function isPosthogConfigured() {
  return Boolean(POSTHOG_KEY);
}

export function isCaptureConfigured() {
  return Boolean(CAPTURE_API);
}
