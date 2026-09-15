/**
 * Copilot chat panel — the "Ask PassportIQ" view inside the officer console.
 *
 * A standard chatbot surface (bubbles, suggestion chips, enter-to-send) with
 * one deliberate addition: every copilot reply lists the REAL MCP tool calls
 * it made, success or refusal, so the conversation is auditable rather than
 * plausible. Replies that reference an application deep-link into the review
 * screen via onOpenApplication.
 */
import React from 'react';
import { COLORS } from '../lib/theme.js';
import { clockTime } from '../lib/format.js';
import type { ChatTurn } from '../lib/api.js';
import { Button, Card, Spinner } from './chrome.jsx';
import { IconAgent, IconCheck, IconAlert } from './icons.jsx';

const STARTERS = [
  'what should I review first',
  'show fraud rings',
  'triage the queue',
  'autopilot status',
  'help',
];

export function CopilotChat({
  turns,
  busy,
  error,
  officerName,
  onSend,
  onOpenApplication,
}: {
  turns: ChatTurn[];
  busy: boolean;
  error: string | null;
  officerName: string;
  onSend: (message: string) => void;
  onOpenApplication?: (applicationId: string) => void;
}) {
  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, busy]);

  const submit = (message: string) => {
    const text = message.trim();
    if (!text || busy) return;
    setDraft('');
    onSend(text);
  };

  const lastSuggestions =
    [...turns].reverse().find((t) => t.role === 'copilot' && t.suggestions?.length)?.suggestions ??
    [];

  return (
    <Card
      title="Ask PassportIQ"
      subtitle="Plain language in, real MCP tool calls out — every action the copilot takes is listed on its reply. It recommends; you decide."
    >
      <div
        ref={scrollRef}
        style={{
          height: 460,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '4px 2px',
        }}
      >
        {turns.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 420 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                margin: '0 auto 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: COLORS.machineSoft,
                color: COLORS.machine,
              }}
            >
              <IconAgent size={22} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textPrimary }}>
              Good shift, {officerName.split(' ')[0]}.
            </div>
            <p style={{ fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 1.6, margin: '6px 0 12px' }}>
              I drive the same guarded tools as the console buttons: triage, investigations,
              pipeline runs, risk explanations — and I file your decisions on the audit trail.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {STARTERS.map((s) => (
                <Chip key={s} label={s} onClick={() => submit(s)} />
              ))}
            </div>
          </div>
        )}

        {turns.map((turn) => (
          <Bubble key={turn.id} turn={turn} onOpenApplication={onOpenApplication} />
        ))}

        {busy && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: COLORS.textSecondary, fontSize: 12 }}>
            <Spinner /> PassportIQ is working — running tools, not guessing…
          </div>
        )}
        {error && (
          <div style={{ fontSize: 12.5, color: COLORS.high }}>
            <IconAlert size={13} /> {error}
          </div>
        )}
      </div>

      {lastSuggestions.length > 0 && !busy && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 0' }}>
          {lastSuggestions.map((s) => (
            <Chip key={s} label={s} onClick={() => submit(s)} />
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
        style={{ display: 'flex', gap: 8, marginTop: 12 }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='Try "investigate PIQ-2026-2004" or "why is 2001 flagged"'
          style={{
            flex: 1,
            padding: '10px 13px',
            borderRadius: 9,
            border: `1px solid ${COLORS.border}`,
            fontSize: 13.5,
            outline: 'none',
            background: COLORS.surface,
            color: COLORS.textPrimary,
          }}
        />
        <Button variant="primary" type="submit" disabled={busy || draft.trim().length === 0}>
          Send
        </Button>
      </form>
    </Card>
  );
}

function Bubble({
  turn,
  onOpenApplication,
}: {
  turn: ChatTurn;
  onOpenApplication?: (applicationId: string) => void;
}) {
  const mine = turn.role === 'officer';
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '78%',
          padding: '10px 13px',
          borderRadius: mine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
          background: mine ? COLORS.accent : COLORS.surfaceAlt,
          color: mine ? '#fff' : COLORS.textPrimary,
          border: mine ? 'none' : `1px solid ${COLORS.border}`,
          fontSize: 13,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {turn.text}

        {!mine && turn.actions && turn.actions.length > 0 && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid ${COLORS.border}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 5,
            }}
          >
            {turn.actions.map((action, i) => (
              <span
                key={`${action.tool}-${i}`}
                title={action.summary}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10.5,
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  padding: '2px 7px',
                  borderRadius: 5,
                  background: action.ok ? COLORS.lowSoft : COLORS.highSoft,
                  color: action.ok ? COLORS.low : COLORS.high,
                  border: `1px solid ${action.ok ? COLORS.low : COLORS.high}33`,
                }}
              >
                {action.ok ? <IconCheck size={10} /> : <IconAlert size={10} />}
                {action.tool}
              </span>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: mine ? 'rgba(255,255,255,.72)' : COLORS.textSecondary,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span>{mine ? (turn.officer ?? 'You') : `PassportIQ · ${turn.mode ?? 'deterministic'}`}</span>
          <span>{clockTime(turn.at)}</span>
          {!mine && turn.applicationId && onOpenApplication && (
            <button
              type="button"
              onClick={() => onOpenApplication(turn.applicationId as string)}
              style={{
                border: 'none',
                background: 'transparent',
                color: COLORS.accent,
                fontSize: 10.5,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Open {turn.applicationId} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: 11.5,
        padding: '5px 11px',
        borderRadius: 999,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.surface,
        color: COLORS.textSecondary,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}
