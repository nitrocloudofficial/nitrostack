'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api, toErrorMessage } from '../../lib/mcp';
import { humanizeFieldName } from '../../lib/format';
import type { OnboardingExtractOutput } from '../../lib/types';
import { Actions, Alert, Badge, Button, Card, ScreenHeader, Spinner, inputStyle } from '../ui';

interface Message {
  id: number;
  author: 'user' | 'agent';
  text: string;
  fields?: { label: string; value: string }[];
  missing?: string[];
}

const OPENING: Message = {
  id: 0,
  author: 'agent',
  text:
    "Tell me about your move — where you're from, where you're going, and what you'll be doing there.",
};

/**
 * Screen 2 — AI Chat.
 *
 * Every send is a real `onboarding_extract` call. The backend extraction is
 * deterministic, so when it reports missing fields we ask for exactly those
 * rather than guessing on the user's behalf.
 */
export function Chat({
  onCaseStarted,
}: {
  onCaseStarted: (caseId: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([OPENING]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedCaseId, setStartedCaseId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  async function send() {
    const message = draft.trim();
    if (!message || busy) return;

    setError(null);
    setBusy(true);
    setDraft('');
    setMessages((prev) => [...prev, { id: prev.length, author: 'user', text: message }]);

    try {
      const result: OnboardingExtractOutput = await api.onboardingExtract(message);

      const fields = [
        { label: 'Nationality', value: result.extracted?.nationality ?? '—' },
        { label: 'Destination', value: result.extracted?.destinationCountry ?? '—' },
        { label: 'Visa type', value: result.extracted?.visaType ?? '—' },
      ];

      if (result.outcome === 'case_started') {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length,
            author: 'agent',
            text: "Got it — I've opened your case with these details.",
            fields,
          },
        ]);
        setStartedCaseId(result.caseId);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: prev.length,
            author: 'agent',
            text: result.message || 'I still need a little more information.',
            fields,
            missing: result.missingFields,
          },
        ]);
      }
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <ScreenHeader
        title="Tell us about your move"
        subtitle="We read your nationality, destination, and visa type from what you write."
      />

      <div
        style={{
          display: 'grid',
          gap: 12,
          maxHeight: 340,
          overflowY: 'auto',
          padding: 4,
          marginBottom: 16,
        }}
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className="me-animate-in"
            style={{ display: 'flex', justifyContent: m.author === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '11px 14px',
                borderRadius: 'var(--me-radius-lg)',
                borderBottomRightRadius: m.author === 'user' ? 4 : undefined,
                borderBottomLeftRadius: m.author === 'agent' ? 4 : undefined,
                background: m.author === 'user' ? 'var(--me-blue-600)' : 'var(--me-surface-alt)',
                color: m.author === 'user' ? '#fff' : 'var(--me-text)',
                border: m.author === 'agent' ? '1px solid var(--me-border)' : 'none',
                fontSize: 14.5,
              }}
            >
              <p style={{ margin: 0 }}>{m.text}</p>

              {m.fields && (
                <div style={{ display: 'grid', gap: 5, marginTop: 11 }}>
                  {m.fields.map((f) => (
                    <div
                      key={f.label}
                      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}
                    >
                      <span style={{ color: 'var(--me-text-muted)' }}>{f.label}</span>
                      <strong style={{ color: f.value === '—' ? 'var(--me-text-subtle)' : undefined }}>
                        {f.value}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {m.missing && m.missing.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>
                  {m.missing.map((f) => (
                    <Badge key={f} tone="danger">
                      Need {humanizeFieldName(f).toLowerCase()}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div style={{ display: 'flex', gap: 9, alignItems: 'center', color: 'var(--me-text-muted)', fontSize: 13.5 }}>
            <Spinner size={15} />
            Reading your message…
          </div>
        )}

        <div ref={endRef} />
      </div>

      {error && (
        <div style={{ marginBottom: 14 }}>
          <Alert tone="error" title="Couldn't process that message">
            {error}
          </Alert>
        </div>
      )}

      {startedCaseId ? (
        <Alert tone="success" title="Case opened">
          Your case is ready. Continue to review the details.
        </Alert>
      ) : (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            disabled={busy}
            placeholder="e.g. I am from India and moving to Germany for a Masters"
            aria-label="Describe your move"
            style={{ ...inputStyle, flex: '1 1 240px', resize: 'vertical', minHeight: 46 }}
          />
          <Button onClick={() => void send()} loading={busy} disabled={!draft.trim()}>
            Send
          </Button>
        </div>
      )}

      {startedCaseId && (
        <Actions>
          <Button onClick={() => onCaseStarted(startedCaseId)}>Review my case →</Button>
        </Actions>
      )}
    </Card>
  );
}
