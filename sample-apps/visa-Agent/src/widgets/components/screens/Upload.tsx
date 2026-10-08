'use client';

import React, { useRef, useState } from 'react';
import { api, toErrorMessage } from '../../lib/mcp';
import { fileToBase64, toBase64 } from '../../lib/format';
import {
  Actions,
  Alert,
  Badge,
  Button,
  Card,
  Field,
  ScreenHeader,
  inputStyle,
} from '../ui';

const DOCUMENT_TYPES = [
  { value: 'passport', label: 'Passport' },
  { value: 'visa_letter', label: 'Admission / visa letter' },
];

type Mode = 'file' | 'text';

/**
 * Screen 5 — Upload Document.
 *
 * Calls `document_upload` with base64 content. Two input modes: attach a
 * file, or paste the document's text. Both send real bytes — the paste mode
 * exists because the backend's extraction reads `Label: value` lines, so a
 * pasted passport page is genuinely readable where a scanned JPEG is not.
 */
export function Upload({
  caseId,
  onUploaded,
  onBack,
}: {
  caseId: string;
  onUploaded: (documentId: string, documentType: string) => void;
  onBack: () => void;
}) {
  const [documentType, setDocumentType] = useState('passport');
  const [mode, setMode] = useState<Mode>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSubmit = mode === 'text' ? text.trim().length > 0 : file !== null;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);

    try {
      let contentBase64: string;
      let fileName: string;

      if (mode === 'file' && file) {
        contentBase64 = await fileToBase64(file);
        fileName = file.name;
      } else {
        contentBase64 = toBase64(text);
        fileName = `${documentType}.txt`;
      }

      const result = await api.documentUpload({ caseId, documentType, fileName, contentBase64 });
      onUploaded(result.documentId, documentType);
    } catch (err) {
      setError(toErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <ScreenHeader
        title="Upload a document"
        subtitle="We'll read it and check it against your case."
      />

      <div style={{ display: 'grid', gap: 18 }}>
        <Field label="Document type">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            style={inputStyle}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <div role="tablist" aria-label="Upload method" style={{ display: 'flex', gap: 8 }}>
          {(
            [
              { key: 'text', label: 'Paste text' },
              { key: 'file', label: 'Attach file' },
            ] as { key: Mode; label: string }[]
          ).map((tab) => {
            const active = mode === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                type="button"
                onClick={() => setMode(tab.key)}
                style={{
                  padding: '8px 15px',
                  borderRadius: 999,
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: `1px solid ${active ? 'var(--me-blue-600)' : 'var(--me-border-strong)'}`,
                  background: active ? 'var(--me-blue-50)' : 'var(--me-surface)',
                  color: active ? 'var(--me-blue-700)' : 'var(--me-text-muted)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {mode === 'text' ? (
          <Field
            label="Document contents"
            hint="Use one field per line, e.g. “Nationality: India”. Our reader looks for labelled lines."
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={
                documentType === 'passport'
                  ? 'Full Name: ANJALI SHARMA\nNationality: India\nPassport Number: Z1234567\nDate of Expiry: 2030-04-18'
                  : 'University: TU Munich\nCountry: Germany\nIntake: Winter 2026'
              }
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--me-mono)', fontSize: 13.5 }}
            />
          </Field>
        ) : (
          <Field label="File">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) setFile(dropped);
              }}
              style={{
                border: '1.5px dashed var(--me-border-strong)',
                borderRadius: 'var(--me-radius)',
                padding: '26px 18px',
                textAlign: 'center',
                cursor: 'pointer',
                background: 'var(--me-surface-alt)',
              }}
            >
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: 'none' }}
              />
              {file ? (
                <>
                  <Badge tone="brand">{file.name}</Badge>
                  <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--me-text-muted)' }}>
                    Click to choose a different file
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14.5 }}>
                    Drop a file here, or click to browse
                  </p>
                  <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--me-text-muted)' }}>
                    Text files read best — image and PDF scans upload but won't extract fields yet.
                  </p>
                </>
              )}
            </div>
          </Field>
        )}

        {error && (
          <Alert tone="error" title="Upload failed">
            {error}
          </Alert>
        )}
      </div>

      <Actions>
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button onClick={() => void submit()} loading={busy} disabled={!canSubmit}>
          {busy ? 'Uploading…' : 'Upload & verify →'}
        </Button>
      </Actions>
    </Card>
  );
}
