'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CaseData, TimelineEvent, DecisionInput } from './types';
import { getCase, listCases, submitDecision as apiSubmitDecision } from './api';

const STORAGE_KEY = 'care-mediator:dev-case-id';
const POLL_INTERVAL_MS = 4000; // refresh case data every 4 s to pick up backend changes

function readStoredCaseId(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) ?? '';
}

type CaseContextValue = {
  caseId: string;
  setCaseId: (id: string) => void;
  caseData: CaseData | null;
  loading: boolean;
  error: string | null;
  availableCaseIds: string[];
  /** Push an optimistic timeline event locally while the server catches up. */
  pushTimelineEvent: (event: TimelineEvent) => void;
  /** Immediately inject a fresh case object (e.g. after a mutation) instead of waiting for the poll. */
  applyCaseUpdate: (data: CaseData) => void;
  /** Submit an insurer decision to the backend and update state from the response. */
  submitDecision: (decision: DecisionInput) => Promise<void>;
  /** Per-session notification banner set when the insurer takes an action. */
  notification: { message: string; tone: 'verified' | 'amber' } | null;
  dismissNotification: () => void;
  refreshCases: () => Promise<void>;
};

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  // Always start empty so the first client render matches the server-rendered
  // HTML — reading localStorage synchronously here would mismatch whenever a
  // case is already stored. The render-time correction below (which only
  // runs once availableCaseIds is populated, i.e. safely past hydration)
  // already calls readStoredCaseId() itself, so no separate effect is needed.
  const [caseId, setCaseIdState] = useState<string>('');
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableCaseIds, setAvailableCaseIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    tone: 'verified' | 'amber';
  } | null>(null);

  // Track the active fetch so stale responses don't overwrite fresher ones
  const fetchSeqRef = useRef(0);

  const refreshCases = useCallback(async () => {
    try {
      const cases = await listCases();
      setAvailableCaseIds(cases.map((c) => c.caseId));
    } catch {
      setAvailableCaseIds(['clean-case', 'gotcha-case']);
    }
  }, []);

  // Load the list of available case IDs from the backend on mount. Inlined
  // (rather than calling the `refreshCases` callback) so every setState
  // happens inside a .then()/.catch() continuation, not synchronously at
  // the top of the effect.
  useEffect(() => {
    let cancelled = false;
    listCases()
      .then((cases) => {
        if (!cancelled) setAvailableCaseIds(cases.map((c) => c.caseId));
      })
      .catch(() => {
        if (!cancelled) setAvailableCaseIds(['clean-case', 'gotcha-case']);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Choose an initial case once we know which IDs exist — adjusting state
  // during render (React's recommended alternative to an effect here)
  // rather than calling setState synchronously inside a useEffect.
  if (!caseId && availableCaseIds.length > 0) {
    const stored = readStoredCaseId();
    const first = availableCaseIds.includes(stored) ? stored : availableCaseIds[0];
    setCaseIdState(first);
  }

  const setCaseId = useCallback((id: string) => {
    setCaseIdState(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }, []);

  // Fetch (and poll) case data whenever caseId changes
  useEffect(() => {
    if (!caseId) return;

    let cancelled = false;
    const seq = ++fetchSeqRef.current;

    async function load(isInitial: boolean) {
      if (isInitial) setLoading(true);
      try {
        const data = await getCase(caseId);
        if (cancelled || fetchSeqRef.current !== seq) return;
        setCaseData(data);
        setError(null);
      } catch (err) {
        if (cancelled || fetchSeqRef.current !== seq) return;
        setError(err instanceof Error ? err.message : 'Failed to load case.');
      } finally {
        if (!cancelled && fetchSeqRef.current === seq) setLoading(false);
      }
    }

    load(true);
    const interval = setInterval(() => load(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [caseId]);

  const pushTimelineEvent = useCallback((event: TimelineEvent) => {
    setCaseData((prev) => {
      if (!prev) return prev;
      return { ...prev, timeline: [...prev.timeline, event] };
    });
  }, []);

  const submitDecision = useCallback(
    async (decision: DecisionInput) => {
      if (!caseId) return;
      const updated = await apiSubmitDecision(caseId, decision);
      setCaseData(updated);
      setError(null);

      // Set notification for patient/hospital views
      if (decision.action === 'approve') {
        setNotification({ message: 'The insurer has approved this claim in full.', tone: 'verified' });
      } else if (decision.action === 'partial') {
        setNotification({ message: 'The insurer has partially approved this claim. See the ledger for details.', tone: 'amber' });
      } else if (decision.action === 'deny') {
        setNotification({
          message: `The insurer has issued a decision: Denied.${decision.note ? ` Reason: ${decision.note}` : ''}`,
          tone: 'amber',
        });
      } else if (decision.action === 'more-info') {
        setNotification({
          message: 'The insurer has requested additional information for this case. Please check the timeline for details.',
          tone: 'amber',
        });
      }
    },
    [caseId]
  );

  const dismissNotification = useCallback(() => setNotification(null), []);

  const value = useMemo(
    () => ({
      caseId,
      setCaseId,
      caseData,
      loading,
      error,
      availableCaseIds,
      pushTimelineEvent,
      applyCaseUpdate: setCaseData,
      submitDecision,
      notification,
      dismissNotification,
      refreshCases,
    }),
    [caseId, setCaseId, caseData, loading, error, availableCaseIds, pushTimelineEvent, submitDecision, notification, dismissNotification, refreshCases]
  );

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error('useCase must be used within a CaseProvider');
  return ctx;
}
