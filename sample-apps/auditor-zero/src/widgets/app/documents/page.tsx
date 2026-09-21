'use client';

/**
 * Widget for `list_documents` / `seed_demo_documents` — searchable, sortable
 * document inventory with family/version badges, lineage links, one-click demo
 * seeding, and a run-audit action.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import type { Audit, Doc } from '../../lib/types';
import {
  Shell, Header, Footer, Card, Chip, Btn, Banner, EmptyState, LoadingCard,
  ProgressBar, SearchInput, StatGrid, StatTile, TableWrap, Th, Td,
  usePalette, unwrap, fmtTime, shortId, MONO,
} from '../../components/ui';

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

type SortKey = 'title' | 'docType' | 'version' | 'createdAt';

export default function Documents() {
  const c = usePalette();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const data = unwrap<{ docs?: Doc[] }>(getToolOutput<any>());

  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortAsc, setSortAsc] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'good' | 'bad' | 'info'; text: string } | null>(null);
  const [auditLive, setAuditLive] = useState<Audit | null>(null);
  const aliveRef = useRef(true);
  useEffect(() => () => { aliveRef.current = false; }, []);

  // All hooks must run on every render — compute rows (and the memoized filter
  // below) BEFORE any early return, or React throws "Rendered more hooks than
  // during the previous render" once the data arrives.
  const rows = docs ?? data?.docs ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = q
      ? rows.filter((d) =>
          [d.title, d.docType, d.version, d.accessTier, d.id].some((v) => v?.toLowerCase().includes(q)))
      : [...rows];
    out.sort((a, b) => {
      const cmp = String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? ''), undefined, { numeric: true });
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [rows, query, sortKey, sortAsc]);

  if (!isReady || data == null) return <LoadingCard lines={3} label="Loading documents…" />;

  const byId = new Map(rows.map((d) => [d.id, d]));

  const refresh = async () => {
    setBusy('refresh');
    try {
      const r = unwrap<{ docs: Doc[] }>(await callTool('list_documents', {}));
      setDocs(r.docs ?? []);
    } catch (e: any) {
      setNotice({ tone: 'bad', text: `Refresh failed: ${String(e?.message ?? e)}` });
    } finally { setBusy(null); }
  };

  const seed = async () => {
    setBusy('seed');
    setNotice(null);
    try {
      const r = unwrap<{ docs: Doc[] }>(await callTool('seed_demo_documents', {}));
      setNotice({ tone: 'good', text: `✓ Seeded ${r.docs?.length ?? 0} demo documents` });
      await refresh();
    } catch (e: any) {
      setNotice({ tone: 'bad', text: `Seeding failed: ${String(e?.message ?? e)}` });
    } finally { setBusy(null); }
  };

  const auditAll = async () => {
    setBusy('audit');
    setAuditLive(null);
    setNotice({ tone: 'info', text: '⏳ Audit started — running the detection pipeline…' });
    try {
      // analyze_document queues the pipeline and returns the running audit right
      // away, so await it for the id rather than firing it blind: an un-awaited
      // call stays pending on the RPC bridge and starves every later callTool.
      const started = unwrap<{ audit?: Audit; error?: string }>(await callTool('analyze_document', {}));
      if (started.error) throw new Error(started.error);
      const audit = started.audit;
      if (!audit) throw new Error('analyze_document returned no audit');
      setAuditLive(audit);

      let misses = 0;
      for (let i = 0; i < 150 && aliveRef.current; i++) {
        await sleep(2000);
        if (!aliveRef.current) return;
        let live: Audit | undefined;
        try {
          live = unwrap<{ audit?: Audit }>(await callTool('get_audit_result', { auditId: audit.id })).audit;
          misses = 0;
        } catch (e: any) {
          // Surface a bridge that stops answering instead of spinning silently.
          if (++misses >= 3) throw new Error(`lost contact while polling — ${String(e?.message ?? e)}`);
          continue;
        }
        if (!live) continue;
        setAuditLive(live);
        if (live.status === 'complete') {
          const n = live.findingIds.length;
          setNotice({ tone: 'good', text: `✓ Audit complete — ${n} finding${n === 1 ? '' : 's'}. Open the dashboard with get_audit_result ${live.id}` });
          return;
        }
        if (live.status === 'failed') {
          setNotice({ tone: 'bad', text: `Audit failed: ${live.error ?? 'unknown error'}` });
          return;
        }
      }
      if (aliveRef.current) setNotice({ tone: 'info', text: `Audit is still running — check get_audit_result ${audit.id}` });
    } catch (e: any) {
      if (aliveRef.current) setNotice({ tone: 'bad', text: `Audit failed: ${String(e?.message ?? e)}` });
    } finally {
      if (aliveRef.current) { setBusy(null); setAuditLive(null); }
    }
  };

  const families = new Set(rows.map((d) => d.docType)).size;
  const versioned = rows.filter((d) => d.previousDocumentId).length;

  const onSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(true); }
  };
  const sortProps = (k: SortKey) => ({
    onClick: () => onSort(k),
    active: sortKey === k,
    dir: (sortAsc ? 'asc' : 'desc') as 'asc' | 'desc',
  });

  return (
    <Shell maxWidth={720}>
      <Header
        title="Documents"
        subtitle={`${rows.length} ingested`}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small onClick={refresh} disabled={busy !== null}>{busy === 'refresh' ? 'Refreshing…' : '↻ Refresh'}</Btn>
            {rows.length > 0 && (
              <Btn kind="primary" small onClick={auditAll} disabled={busy !== null}>
                {busy === 'audit' ? 'Auditing…' : '▶ Audit all'}
              </Btn>
            )}
          </div>
        }
      />

      {notice && <Banner tone={notice.tone}>{notice.text}</Banner>}

      {busy === 'audit' && auditLive && (auditLive.status === 'running' || auditLive.status === 'pending') && (
        <div style={{ marginBottom: 14 }}>
          <ProgressBar done={auditLive.progressDone} total={auditLive.progressTotal} />
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No documents ingested yet"
          body="Ingest documents with ingest_document, or load the built-in demo set — a v1/v2/v3 policy lineage plus a contradicting BYOD policy."
          action={<Btn kind="primary" onClick={seed} disabled={busy !== null}>{busy === 'seed' ? 'Seeding…' : '✨ Seed demo documents'}</Btn>}
        />
      ) : (
        <>
          <StatGrid>
            <StatTile label="Documents" value={rows.length} />
            <StatTile label="Families" value={families} color={c.accent} />
            <StatTile label="Versioned" value={versioned} color={c.accent} />
            <StatTile label="Showing" value={filtered.length} color={c.sub} />
          </StatGrid>

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <SearchInput value={query} onChange={setQuery} placeholder="Search title, type, version, tier…" />
          </div>

          <TableWrap>
            <thead>
              <tr>
                <Th {...sortProps('title')}>Title</Th>
                <Th {...sortProps('docType')}>Family</Th>
                <Th {...sortProps('version')}>Version</Th>
                <Th>Lineage</Th>
                <Th {...sortProps('createdAt')}>Ingested</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><Td colSpan={5}><span style={{ color: c.sub }}>No documents match “{query}”</span></Td></tr>
              )}
              {filtered.map((d) => {
                const prev = d.previousDocumentId ? byId.get(d.previousDocumentId) : null;
                return (
                  <tr key={d.id}>
                    <Td>
                      <div style={{ fontWeight: 650 }}>{d.title}</div>
                      <div style={{ fontSize: 10.5, color: c.faint, fontFamily: MONO }}>
                        {shortId(d.id)} · {d.accessTier} · {d.content.length.toLocaleString()} chars
                      </div>
                    </Td>
                    <Td><Chip bg={c.accentSoft} color={c.accent}>{d.docType}</Chip></Td>
                    <Td><Chip bg={c.blueBg} color={c.blue}>{d.version}</Chip></Td>
                    <Td>
                      {d.previousDocumentId
                        ? <span style={{ fontSize: 11.5, color: c.sub }} title={d.previousDocumentId}>↳ {prev ? prev.version : shortId(d.previousDocumentId)}</span>
                        : <span style={{ fontSize: 11.5, color: c.faint }}>origin</span>}
                    </Td>
                    <Td><span style={{ whiteSpace: 'nowrap', color: c.sub, fontSize: 12 }}>{fmtTime(d.createdAt)}</span></Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </>
      )}

      <Footer />
    </Shell>
  );
}
