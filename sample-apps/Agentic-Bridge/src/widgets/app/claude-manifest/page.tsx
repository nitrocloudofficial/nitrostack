'use client';

/**
 * Manifest panel — the CLAUDE.md artifact, plus the manual ingestion dropzone
 * for context the automated swarm could not reach.
 */

import { useState } from 'react';
import { Badge, Button, Card, Empty, Note, Pre, Shell, Stats, useBridgeTool } from '../../lib/ui';

interface Payload {
  written?: boolean;
  path?: string;
  bytes?: number;
  lines?: number;
  factsUsed?: number;
  skillsDocumented?: number;
  resolvedConflicts?: number;
  unresolvedConflicts?: number;
  content?: string;
  // ingest_manual_document shares this widget
  ingested?: boolean;
  document?: { id: string; name: string; chars: number; mimeType?: string };
  chunks?: number;
  pdfPages?: number;
  warnings?: string[];
  totalDocuments?: number;
  nextStep?: string;
}

export default function ClaudeManifest() {
  const { data, busy, error, run, clearError } = useBridgeTool<Payload>();
  const [docName, setDocName] = useState('');
  const [docText, setDocText] = useState('');
  const [showIngest, setShowIngest] = useState(false);
  /** Set for binary uploads (PDFs), where there is no text to show in the box. */
  const [docBase64, setDocBase64] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const ingest = async () => {
    const ok = await run('ingest_manual_document', {
      name: docName.trim(),
      // A PDF goes up as bytes and is parsed server-side; anything textual goes
      // up as text so the administrator can edit it before ingesting.
      ...(docBase64 ? { file_base64: docBase64 } : { text: docText }),
    });
    if (ok) {
      setDocName('');
      setDocText('');
      setDocBase64(null);
    }
  };

  const readDroppedFile = async (file: File) => {
    setReadError(null);
    setDocName(file.name);
    setShowIngest(true);

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setDocBase64(null);
      setDocText(await file.text());
      return;
    }

    try {
      // btoa() only accepts binary strings, so the bytes are fed through in
      // chunks — spreading a multi-megabyte array into String.fromCharCode
      // overflows the call stack.
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      setDocBase64(btoa(binary));
      setDocText('');
    } catch {
      setDocBase64(null);
      setReadError(`Could not read ${file.name}. Paste its text below instead.`);
    }
  };

  return (
    <Shell
      icon="◈"
      title="CLAUDE.md Manifest"
      subtitle={data?.path ? `${data.path} · ${data.bytes ?? 0} bytes` : 'the deterministic context artifact'}
      error={error}
      onDismissError={clearError}
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={() => setShowIngest((v) => !v)}>
            {showIngest ? 'Close' : 'Inject context'}
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={busy === 'synthesize_claude_md'}
            onClick={() => run('synthesize_claude_md')}
          >
            Regenerate
          </Button>
        </>
      }
    >
      {data?.written ? (
        <Stats
          items={[
            { label: 'Lines', value: data.lines ?? 0, tone: 'accent' },
            { label: 'Facts used', value: data.factsUsed ?? 0 },
            { label: 'Skills', value: data.skillsDocumented ?? 0 },
            {
              label: 'Human rulings',
              value: data.resolvedConflicts ?? 0,
              tone: data.resolvedConflicts ? 'ok' : 'neutral',
            },
          ]}
        />
      ) : null}

      {data?.unresolvedConflicts ? (
        <Note tone="warn">
          {data.unresolvedConflicts} conflict(s) are still unresolved and were written in as an explicit
          warning block rather than silently guessed at.
        </Note>
      ) : null}

      {showIngest ? (
        <Card title="Inject context the swarm could not reach">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void readDroppedFile(file);
            }}
            style={{
              border: '1px dashed var(--bx-line-strong)',
              borderRadius: 8,
              padding: 14,
              textAlign: 'center',
              fontSize: 11.5,
              color: 'var(--bx-fg-mute)',
              marginBottom: 10,
            }}
          >
            Drop a PDF, text or markdown file here, or paste below.
          </div>

          {readError ? <Note tone="warn">{readError}</Note> : null}

          {docBase64 ? (
            <Note tone="accent">
              <strong>{docName}</strong> is queued as a PDF ({Math.round((docBase64.length * 3) / 4 / 1024)} KB).
              Its text layer is extracted on the server — there is nothing to paste below.
            </Note>
          ) : null}

          <div className="bx-field">
            <label className="bx-label" htmlFor="doc-name">
              Title
            </label>
            <input
              id="doc-name"
              className="bx-input"
              placeholder="e.g. ADR-021 — event bus rejected"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
            />
          </div>
          <div className="bx-field">
            <label className="bx-label" htmlFor="doc-text">
              Content
            </label>
            <textarea
              id="doc-text"
              className="bx-textarea"
              placeholder="Paste the decision record, wiki page or Slack thread…"
              value={docText}
              onChange={(e) => setDocText(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            disabled={!docName.trim() || (!docText.trim() && !docBase64)}
            loading={busy === 'ingest_manual_document'}
            onClick={ingest}
          >
            Ingest &amp; embed
          </Button>

          {data?.ingested ? (
            <Note tone="ok">
              Ingested <strong>{data.document?.name}</strong>
              {data.pdfPages ? ` — ${data.pdfPages} page(s) of PDF text` : ''} — {data.chunks} chunk(s),
              now searchable via <code>query_knowledge</code>. {data.nextStep}
            </Note>
          ) : null}

          {data?.warnings?.length ? (
            <Note tone="warn">{data.warnings.join(' ')}</Note>
          ) : null}
        </Card>
      ) : null}

      {data?.content ? (
        <Card
          title="Generated manifest"
          aside={<Badge tone="ok">deterministic · zero LLM calls</Badge>}
        >
          <Pre>{data.content}</Pre>
        </Card>
      ) : (
        <Empty
          icon="◈"
          title="Manifest not generated yet"
          hint={
            <>
              Run the swarm, resolve any conflicts, then call <code>synthesize_claude_md</code>.
            </>
          }
        />
      )}
    </Shell>
  );
}
