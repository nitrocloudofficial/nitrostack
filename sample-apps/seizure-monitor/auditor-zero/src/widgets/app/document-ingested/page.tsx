'use client';

/**
 * Widget for `ingest_document` — success card for the just-ingested document,
 * version-lineage strip, plus a drag & drop zone to upload the next version
 * (auto-linked via previousDocumentId) and one-click follow-up analysis.
 */

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import {
  Shell, Header, Footer, Card, Chip, Btn, EmptyState, ErrorBanner, LoadingCard,
  usePalette, unwrap, fmtTime, shortId, MONO,
} from '../../components/ui';
import { IngestDropZone } from '../../components/IngestDropZone';
import type { Doc } from '../../lib/types';

export default function DocumentIngested() {
  const c = usePalette();
  const { isReady, getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  const data = unwrap<{ doc?: Doc; error?: string }>(getToolOutput<any>());
  const [chained, setChained] = useState<Doc[]>([]);

  if (!isReady || data == null) return <LoadingCard lines={2} label="Loading document…" />;

  const doc = data.doc;
  if (!doc) {
    return (
      <Shell>
        <ErrorBanner
          title="Document was not ingested"
          detail={data.error ?? JSON.stringify(data)}
          hint="Check the input — title, docType, version, accessTier and content are all required."
        />
      </Shell>
    );
  }

  const latest = chained.length ? chained[chained.length - 1] : doc;
  const lineage: Doc[] = [doc, ...chained];

  return (
    <Shell>
      <Header
        title="Document ingested"
        subtitle={<>{shortId(doc.id)} · {fmtTime(doc.createdAt)}</>}
        right={<Btn kind="primary" onClick={() => sendFollowUpMessage(`Analyze all ingested documents`)}>▶ Analyze now</Btn>}
      />

      {/* Success card */}
      <div style={{ padding: '12px 14px', borderRadius: 10, marginBottom: 14, fontWeight: 700, fontSize: 13, background: c.greenBg, color: c.green }}>
        ✓ “{doc.title}” is stored and ready for auditing
      </div>

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <Chip bg={c.accentSoft} color={c.accent}>{doc.docType}</Chip>
          <Chip bg={c.blueBg} color={c.blue}>{doc.version}</Chip>
          <Chip bg={c.panel2} color={c.sub}>{doc.accessTier}</Chip>
          {doc.previousDocumentId && (
            <Chip bg={c.panel2} color={c.sub} title={doc.previousDocumentId}>↳ follows {shortId(doc.previousDocumentId)}</Chip>
          )}
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 750, marginBottom: 4 }}>{doc.title}</div>
        <div style={{ fontSize: 12, color: c.sub }}>
          {doc.content.length.toLocaleString()} characters · ingestion order #{doc.seq}
        </div>
        <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 10, background: c.panel2, border: `1px solid ${c.border}`, fontSize: 11.5, fontFamily: MONO, color: c.sub, maxHeight: 90, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {doc.content.slice(0, 320)}{doc.content.length > 320 ? '…' : ''}
        </div>
      </Card>

      {/* Version lineage strip (grows as more versions are chained from this widget) */}
      {lineage.length > 1 && (
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: c.faint, marginBottom: 8 }}>
            Version lineage
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {lineage.map((d, i) => (
              <React.Fragment key={d.id}>
                {i > 0 && <span style={{ color: c.faint }}>→</span>}
                <Chip bg={i === lineage.length - 1 ? c.accentSoft : c.panel2} color={i === lineage.length - 1 ? c.accent : c.sub} title={d.id}>
                  {d.version}
                </Chip>
              </React.Fragment>
            ))}
          </div>
        </Card>
      )}

      {/* Chain the next version */}
      <IngestDropZone
        compact
        callTool={callTool}
        previousDoc={latest}
        onIngested={(d) => setChained((xs) => [...xs, d])}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Btn small onClick={() => sendFollowUpMessage('List all ingested documents')}>📚 View all documents</Btn>
        <Btn small onClick={() => sendFollowUpMessage(`Analyze documents including "${doc.title}" and flag contradictions or vanished clauses`)}>
          🔍 Audit this family
        </Btn>
      </div>

      <Footer />
    </Shell>
  );
}
