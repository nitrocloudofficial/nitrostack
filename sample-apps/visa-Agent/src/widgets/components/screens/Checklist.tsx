'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api, toErrorMessage } from '../../lib/mcp';
import type { ResolveRequirementsOutput } from '../../lib/types';
import {
  Actions,
  Alert,
  Button,
  Card,
  ScreenHeader,
  SkeletonRows,
} from '../ui';

/**
 * Screen 4 — Requirement Checklist.
 *
 * Calls `resolve_requirements`. The backend resolves from a small hardcoded
 * dataset and throws when a nationality/destination/visa-type combination
 * isn't covered — that surfaces here as an explicit, recoverable error
 * rather than an empty list, so the user is never shown a checklist that
 * silently isn't theirs.
 */
export function Checklist({
  caseId,
  onContinue,
  onBack,
  onResolved,
  initialData,
}: {
  caseId: string;
  onContinue: () => void;
  onBack: () => void;
  onResolved?: (data: ResolveRequirementsOutput) => void;
  /** The resolve_requirements result that mounted this widget, if any. */
  initialData?: ResolveRequirementsOutput;
}) {
  const [data, setData] = useState<ResolveRequirementsOutput | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.resolveRequirements(caseId);
      setData(result);
      onResolved?.(result);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [caseId, onResolved]);

  useEffect(() => {
    // `resolve_requirements` itself mounts this widget. Calling it again from
    // this mount creates an unbounded host -> widget -> tool -> widget cycle.
    // The tool result is already the complete checklist, so render it directly.
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }
    void load();
  }, [initialData, load]);

  // Defensive: a tool response missing an expected array must degrade to an
  // empty list, never crash the screen mid-render.
  const checklist = Array.isArray(data?.checklist) ? data.checklist : [];
  const notes = Array.isArray(data?.notes) ? data.notes : [];

  const total = checklist.length;
  const done = checklist.filter((item) => checked[item]).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Card>
      <ScreenHeader
        title="What you'll need"
        subtitle="Tick items off as you gather them. This list is for your reference only."
      />

      {loading && <SkeletonRows rows={6} />}

      {!loading && error && (
        <Alert
          tone="error"
          title="Couldn't load your checklist"
          action={
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!loading && !error && data && (
        <div className="me-animate-in">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 13.5, color: 'var(--me-text-muted)' }}>
              {done} of {total} gathered
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--me-blue-700)' }}>{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: 7,
              borderRadius: 999,
              background: 'var(--me-border)',
              overflow: 'hidden',
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, var(--me-blue-500), var(--me-blue-600))',
                transition: 'width 0.35s ease',
              }}
            />
          </div>

          {checklist.length === 0 && (
            <Alert tone="warning" title="No checklist items came back">
              The server returned no document requirements for this case.
            </Alert>
          )}

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {checklist.map((item) => {
              const isChecked = !!checked[item];
              return (
                <li key={item}>
                  <label
                    style={{
                      display: 'flex',
                      gap: 11,
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: 'var(--me-radius)',
                      border: `1px solid ${isChecked ? 'var(--me-blue-200)' : 'var(--me-border)'}`,
                      background: isChecked ? 'var(--me-blue-50)' : 'var(--me-surface)',
                      cursor: 'pointer',
                      transition: 'background 0.18s ease, border-color 0.18s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => setChecked((prev) => ({ ...prev, [item]: !prev[item] }))}
                      style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--me-blue-600)' }}
                    />
                    <span
                      style={{
                        fontSize: 14.5,
                        textDecoration: isChecked ? 'line-through' : 'none',
                        color: isChecked ? 'var(--me-text-muted)' : 'var(--me-text)',
                      }}
                    >
                      {item}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>

          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            {data.timeline && (
              <Alert tone="info" title="Estimated timeline">
                {data.timeline}
              </Alert>
            )}

            {notes.length > 0 && (
              <Alert tone="warning" title="Before you rely on this">
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {notes.map((note) => (
                    <li key={note} style={{ marginBottom: 3 }}>
                      {note}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>

          <Actions>
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
            <Button onClick={onContinue}>Upload a document →</Button>
          </Actions>
        </div>
      )}
    </Card>
  );
}
