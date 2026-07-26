'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { api, toErrorMessage } from '../../lib/mcp';
import { formatConfidence, humanizeCheck, humanizeFieldName } from '../../lib/format';
import type { DocumentOcrOutput, DocumentValidateOutput } from '../../lib/types';
import {
  Actions,
  Alert,
  Badge,
  Button,
  Card,
  ScreenHeader,
  Spinner,
  SuccessCheck,
} from '../ui';

type Phase = 'reading' | 'checking' | 'done' | 'failed';

/**
 * Screen 6 — Validation Result.
 *
 * Runs `document_ocr` then `document_validate` in sequence, showing which
 * stage is in flight. A failed check is a normal outcome, not an error — the
 * error path is reserved for the calls themselves failing.
 */
export function Validation({
  caseId,
  documentId,
  onRestart,
  onUploadAnother,
}: {
  caseId: string;
  documentId: string;
  onRestart: () => void;
  onUploadAnother: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('reading');
  const [ocr, setOcr] = useState<DocumentOcrOutput | null>(null);
  const [result, setResult] = useState<DocumentValidateOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setError(null);
    setOcr(null);
    setResult(null);
    setPhase('reading');

    try {
      const extraction = await api.documentOcr(documentId);
      setOcr(extraction);

      setPhase('checking');
      const validation = await api.documentValidate({ caseId, documentId });
      setResult(validation);
      setPhase('done');
    } catch (err) {
      setError(toErrorMessage(err));
      setPhase('failed');
    }
  }, [caseId, documentId]);

  useEffect(() => {
    void run();
  }, [run]);

  const isValid = result?.status === 'VALID';
  const fields = ocr?.extractedFields as Record<string, unknown> | undefined;

  // Defensive, for the same reason as Checklist: never index into an array
  // the response might not have sent.
  const passedChecks = Array.isArray(result?.passedChecks) ? result.passedChecks : [];
  const failedChecks = Array.isArray(result?.failedChecks) ? result.failedChecks : [];
  const totalChecks = passedChecks.length + failedChecks.length;

  return (
    <Card>
      <ScreenHeader
        title="Document check"
        subtitle="What we read, and how it compares to your case."
        action={
          result ? (
            <Badge tone={isValid ? 'success' : 'danger'}>{result.status}</Badge>
          ) : undefined
        }
      />

      {(phase === 'reading' || phase === 'checking') && (
        <div style={{ display: 'grid', gap: 13, padding: '26px 0' }}>
          {[
            { key: 'reading', label: 'Reading your document' },
            { key: 'checking', label: 'Comparing against your case' },
          ].map((stage) => {
            const active = phase === stage.key;
            const complete =
              (stage.key === 'reading' && phase === 'checking');

            return (
              <div
                key={stage.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  fontSize: 14.5,
                  color: active || complete ? 'var(--me-text)' : 'var(--me-text-subtle)',
                }}
              >
                {complete ? (
                  <span
                    aria-hidden
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: '50%',
                      background: 'var(--me-success)',
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                ) : active ? (
                  <Spinner size={19} />
                ) : (
                  <span
                    aria-hidden
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: '50%',
                      border: '2px solid var(--me-border-strong)',
                    }}
                  />
                )}
                {stage.label}
              </div>
            );
          })}
        </div>
      )}

      {phase === 'failed' && (
        <Alert
          tone="error"
          title="Couldn't complete the check"
          action={
            <Button variant="secondary" onClick={() => void run()}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {phase === 'done' && result && (
        <div className="me-animate-in">
          <div style={{ margin: '4px 0 20px' }}>
            <SuccessCheck tone={isValid ? 'success' : 'danger'} />
            <p style={{ textAlign: 'center', margin: '13px 0 3px', fontWeight: 650, fontSize: 16 }}>
              {isValid ? 'Everything checks out' : 'We found some problems'}
            </p>
            <p
              style={{
                textAlign: 'center',
                margin: 0,
                fontSize: 13.5,
                color: 'var(--me-text-muted)',
              }}
            >
              {passedChecks.length} of {totalChecks} checks passed ·{' '}
              {formatConfidence(result.confidence)} confidence
            </p>
          </div>

          {failedChecks.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Alert tone="error" title="Needs your attention">
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {failedChecks.map((c) => (
                    <li key={c} style={{ marginBottom: 3 }}>
                      {humanizeCheck(c)}
                    </li>
                  ))}
                </ul>
              </Alert>
            </div>
          )}

          {passedChecks.length > 0 && (
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
              {passedChecks.map((c) => (
                <Badge key={c} tone="success">
                  ✓ {humanizeCheck(c)}
                </Badge>
              ))}
            </div>
          )}

          <h2 style={{ fontSize: 15, margin: '0 0 10px' }}>What we read</h2>

          {ocr?.kind === 'unknown' ? (
            <pre
              style={{
                margin: 0,
                padding: 14,
                borderRadius: 'var(--me-radius)',
                background: 'var(--me-surface-alt)',
                border: '1px solid var(--me-border)',
                fontFamily: 'var(--me-mono)',
                fontSize: 13,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {ocr.extractedText?.trim() || 'No readable text found in this document.'}
            </pre>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {fields &&
                Object.entries(fields).map(([key, value]) => {
                  const missing = value === null || value === undefined || value === '';
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 14,
                        padding: '11px 13px',
                        borderRadius: 'var(--me-radius)',
                        border: '1px solid var(--me-border)',
                        background: missing ? 'var(--me-warning-bg)' : 'var(--me-surface-alt)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ fontSize: 13.5, color: 'var(--me-text-muted)' }}>
                        {humanizeFieldName(key)}
                      </span>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: missing ? 'var(--me-warning)' : 'var(--me-text)',
                          wordBreak: 'break-word',
                          textAlign: 'right',
                        }}
                      >
                        {missing ? 'Not found' : String(value)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <Alert tone="info">
              A passing check means the details match your case. It isn't a decision on your
              application, and it isn't legal advice.
            </Alert>
          </div>

          <Actions>
            <Button variant="secondary" onClick={onRestart}>
              Start over
            </Button>
            <Button onClick={onUploadAnother}>Upload another document</Button>
          </Actions>
        </div>
      )}
    </Card>
  );
}
