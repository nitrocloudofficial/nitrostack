import { CACHED_RUN_EVENTS } from './cachedRun.js';

const EVENT_TYPES = [
  'agent_start',
  'agent_done',
  'agent_error',
  'reconciliation_done',
  'debate_exchange',
  'debate_done',
  'final_report',
  'error',
  'done'
];

/**
 * Starts a review run, live or cached, and calls onEvent(eventName, data)
 * for each milestone as it happens. Returns a cancel() function.
 */
export function startReview({ proposalTitle, proposalDescription, useCached, onEvent, onFatalError }) {
  if (useCached) {
    let cancelled = false;
    (async () => {
      for (const { event, data } of CACHED_RUN_EVENTS) {
        if (cancelled) return;
        // Small stagger so the UI still reads as "live" rather than instant-dump.
        await new Promise(r => setTimeout(r, event === 'agent_start' ? 120 : 550));
        if (cancelled) return;
        onEvent(event, data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }

  const params = new URLSearchParams({ proposalTitle, proposalDescription });
  const source = new EventSource(`/api/review/stream?${params.toString()}`);

  EVENT_TYPES.forEach(type => {
    source.addEventListener(type, evt => {
      let data = {};
      try {
        data = JSON.parse(evt.data);
      } catch {
        // ignore parse issues on empty payloads
      }
      onEvent(type, data);
      if (type === 'done' || type === 'error') {
        source.close();
      }
    });
  });

  source.onerror = () => {
    onFatalError?.();
    source.close();
  };

  return () => source.close();
}
