export type Severity = "low" | "medium" | "high";

export interface AlertState {
  active: boolean;
  title: string;
  message: string;
  severity: Severity;
  time: string;
}

export interface AlertHistoryEntry extends AlertState {
  raisedAt: number;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const MAX_HISTORY = 50;
const DOWNGRADE_COOLDOWN_MS = 10_000;

let currentAlert: AlertState = {
  active: false,
  title: "",
  message: "",
  severity: "low",
  time: "",
};

let history: AlertHistoryEntry[] = [];
let lastRaisedAt: number | null = null;

function severityRank(severity: Severity): number {
  return SEVERITY_ORDER[severity] ?? 0;
}

/**
 * Update the active alert.
 *
 * Escalations (higher or equal severity) take effect immediately and are
 * recorded in history. Downgrades and clears are gated by a cooldown so a
 * transient safe packet cannot instantly dismiss a raised alert.
 */
export function updateAlert(alert: AlertState): AlertState {
  const now = Date.now();
  const incoming: AlertState = {
    ...alert,
    time: alert.time || new Date().toLocaleTimeString(),
  };

  if (!incoming.active) {
    if (
      currentAlert.active &&
      lastRaisedAt !== null &&
      now - lastRaisedAt < DOWNGRADE_COOLDOWN_MS
    ) {
      return currentAlert;
    }
    currentAlert = incoming;
    lastRaisedAt = null;
    return currentAlert;
  }

  const incomingRank = severityRank(incoming.severity);
  const currentRank = severityRank(currentAlert.severity);

  if (
    currentAlert.active &&
    lastRaisedAt !== null &&
    now - lastRaisedAt < DOWNGRADE_COOLDOWN_MS &&
    incomingRank < currentRank
  ) {
    return currentAlert;
  }

  if (incomingRank >= currentRank || !currentAlert.active) {
    history.push({ ...incoming, raisedAt: now });
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    lastRaisedAt = now;
  }

  currentAlert = incoming;
  return currentAlert;
}

export function getAlert(): AlertState {
  return currentAlert;
}

export function getAlertHistory(): AlertHistoryEntry[] {
  return [...history];
}

export function resetAlert(): void {
  currentAlert = {
    active: false,
    title: "",
    message: "",
    severity: "low",
    time: "",
  };
  lastRaisedAt = null;
}
