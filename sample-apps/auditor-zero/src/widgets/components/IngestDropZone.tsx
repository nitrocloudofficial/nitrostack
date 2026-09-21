'use client';

/**
 * Drag & drop (or click-to-browse) upload zone that ingests a text document via
 * the `ingest_document` tool. Handles the full lifecycle: pick file -> edit
 * metadata -> upload with progress -> success / error state.
 */

import React, { useRef, useState } from 'react';
import { usePalette, Btn, Spinner, unwrap, FONT, MONO } from './ui';
import type { Doc } from '../lib/types';

type Phase = 'idle' | 'form' | 'uploading' | 'done' | 'error';

interface Props {
  callTool: (name: string, args: any) => Promise<any>;
  /** When set, the ingested doc is linked as the next version of this document. */
  previousDoc?: Pick<Doc, 'id' | 'title' | 'docType' | 'version' | 'accessTier'> | null;
  onIngested?: (doc: Doc) => void;
  compact?: boolean;
}

function bumpVersion(v: string): string {
  const m = v.match(/^(.*?)(\d+)$/);
  return m ? `${m[1]}${Number(m[2]) + 1}` : `${v}.1`;
}

export function IngestDropZone({ callTool, previousDoc, onIngested, compact }: Props) {
  const c = usePalette();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [form, setForm] = useState({
    title: '',
    docType: previousDoc?.docType ?? 'policy',
    version: previousDoc ? bumpVersion(previousDoc.version) : 'v1',
    accessTier: previousDoc?.accessTier ?? 'tier-1',
    content: '',
  });

  const takeFile = async (file: File) => {
    if (file.size > 2_000_000) { setError('File too large (max 2 MB of text).'); setPhase('error'); return; }
    try {
      const text = await file.text();
      setForm((f) => ({ ...f, title: previousDoc?.title ?? file.name.replace(/\.[^.]+$/, ''), content: text }));
      setError(null);
      setPhase('form');
    } catch {
      setError('Could not read that file as text.');
      setPhase('error');
    }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) { setError('Title and content are required.'); return; }
    setPhase('uploading');
    setError(null);
    try {
      const res = unwrap<{ doc: Doc }>(await callTool('ingest_document', {
        title: form.title.trim(),
        docType: form.docType.trim() || 'policy',
        version: form.version.trim() || 'v1',
        accessTier: form.accessTier.trim() || 'tier-1',
        content: form.content,
        ...(previousDoc ? { previousDocumentId: previousDoc.id } : {}),
      }));
      if (!res?.doc) throw new Error(typeof res === 'string' ? res : (res as any)?.error ?? 'Ingest failed');
      setDoc(res.doc);
      setPhase('done');
      onIngested?.(res.doc);
    } catch (e: any) {
      setError(String(e?.message ?? e));
      setPhase('error');
    }
  };

  const input = (key: keyof typeof form, label: string, flex = 1) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex, minWidth: 90 }}>
      <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: c.faint }}>{label}</span>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        style={{ padding: '7px 10px', borderRadius: 8, fontSize: 12.5, fontFamily: FONT, border: `1px solid ${c.border}`, background: c.panel, color: c.text, outline: 'none' }}
      />
    </label>
  );

  if (phase === 'done' && doc) {
    return (
      <div style={{ padding: '14px 16px', borderRadius: 12, background: c.greenBg, color: c.green, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span>✓ Ingested “{doc.title}” {doc.version}</span>
        <span style={{ fontFamily: MONO, fontWeight: 400, fontSize: 11.5, opacity: 0.85 }}>{doc.id.slice(0, 8)}</span>
        <span style={{ flex: 1 }} />
        <Btn small onClick={() => { setPhase('idle'); setDoc(null); setForm((f) => ({ ...f, title: '', content: '', version: bumpVersion(f.version) })); }}>
          Ingest another
        </Btn>
      </div>
    );
  }

  if (phase === 'uploading') {
    return (
      <div style={{ padding: '18px 16px', borderRadius: 12, border: `1px dashed ${c.border}`, background: c.panel2, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: c.sub }}>
        <Spinner /> Sealing “{form.title}” into the store…
      </div>
    );
  }

  if (phase === 'form') {
    return (
      <div style={{ padding: 14, borderRadius: 12, border: `1px solid ${c.border}`, background: c.panel, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 750 }}>
          {previousDoc ? <>New version of “{previousDoc.title}” (follows {previousDoc.version})</> : 'Document details'}
          <span style={{ fontWeight: 400, color: c.faint, marginLeft: 8, fontSize: 11.5 }}>{form.content.length.toLocaleString()} chars loaded</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {input('title', 'Title', 2)}
          {input('docType', 'Type')}
          {input('version', 'Version')}
          {input('accessTier', 'Tier')}
        </div>
        {error && <div style={{ fontSize: 12, color: c.red }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="primary" small onClick={submit}>Ingest document</Btn>
          <Btn small onClick={() => { setPhase('idle'); setError(null); }}>Cancel</Btn>
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a document"
      onClick={() => fileRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) takeFile(f);
      }}
      style={{
        padding: compact ? '14px 16px' : '24px 18px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
        border: `2px dashed ${dragOver ? c.accent : c.border}`,
        background: dragOver ? c.accentSoft : c.panel2,
        transition: 'border-color .15s ease, background .15s ease',
      }}
    >
      <input
        ref={fileRef} type="file" accept=".txt,.md,.markdown,.text,text/*" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) takeFile(f); e.target.value = ''; }}
      />
      <div style={{ fontSize: compact ? 18 : 24 }} aria-hidden>📥</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>
        {previousDoc ? `Drop the next version of “${previousDoc.title}”` : 'Drop a document here'}
      </div>
      <div style={{ fontSize: 11.5, color: c.faint, marginTop: 3 }}>
        or click to browse — plain text / markdown
      </div>
      {phase === 'error' && error && <div style={{ fontSize: 12, color: c.red, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
