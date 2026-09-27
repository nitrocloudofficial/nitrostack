'use client';

/**
 * Widget for `list_audits` — audit history with status filters, timestamps,
 * progress, and clickable rows that expand to load each audit's findings.
 */

import React, { useMemo, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import type { Audit, Finding } from '../../lib/types';
import {
  Shell, Header, Footer, Chip, SeverityBadge, StatusBadge, Btn, EmptyState,
  LoadingCard, StatGrid, StatTile, ProgressBar, TableWrap, Th, Td, Skeleton,
  usePalette, unwrap, fmtTime, fmtAgo, shortId, MONO,
} from '../../components/ui';

type StatusFilter = 'all' | Audit['status'];

export default function Audits() {
  const c = usePalette();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const data = unwrap<{ audits?: Audit[] }>(getToolOutput<any>());

  const [audits, setAudits] = useState<Audit[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Finding[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Hooks must run on every render — keep this useMemo above the early return.
  const rows = audits ?? data?.audits ?? [];
  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((a) => a.status === filter)),
    [rows, filter],
  );

  if (!isReady || data == null) return <LoadingCard lines={3} label="Loading audits…" />;

  const refresh = async () => {
    setBusy('refresh');
    try {
      const r = unwrap<{ audits: Audit[] }>(await callTool('list_audits', {}));
      setAudits(r.audits ?? []);
    } catch { /* keep current rows */ } finally { setBusy(null); }
  };

  const toggle = async (a: Audit) => {
    if (openId === a.id) { setOpenId(null); return; }
    setOpenId(a.id);
    if (!details[a.id]) {
      setBusy(`open:${a.id}`);
      try {
        const r = unwrap<{ findings: Finding[] }>(await callTool('get_audit_result', { auditId: a.id }));
        setDetails((d) => ({ ...d, [a.id]: r.findings ?? [] }));
      } catch {
        setDetails((d) => ({ ...d, [a.id]: [] }));
      } finally { setBusy(null); }
    }
  };

  const counts = {
    complete: rows.filter((a) => a.status === 'complete').length,
    running: rows.filter((a) => a.status === 'running' || a.status === 'pending').length,
    failed: rows.filter((a) => a.status === 'failed').length,
  };

  const filters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'complete', label: 'Complete' },
    { key: 'running', label: 'Running' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <Shell maxWidth={720}>
      <Header
        title="Audits"
        subtitle={`${rows.length} total · most recent first`}
        right={<Btn small onClick={refresh} disabled={busy !== null}>{busy === 'refresh' ? 'Refreshing…' : '↻ Refresh'}</Btn>}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No audits yet"
          body="Run analyze_document to audit your ingested documents — it auto-seeds a demo document set if the store is empty."
        />
      ) : (
        <>
          <StatGrid>
            <StatTile label="Audits" value={rows.length} />
            <StatTile label="Complete" value={counts.complete} color={c.green} />
            <StatTile label="Running" value={counts.running} color={c.blue} />
            <StatTile label="Failed" value={counts.failed} color={counts.failed ? c.red : c.sub} />
          </StatGrid>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }} role="tablist" aria-label="Filter by status">
            {filters.map((f) => (
              <Btn key={f.key} small active={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Btn>
            ))}
          </div>

          <TableWrap>
            <thead>
              <tr>
                <Th>Audit</Th>
                <Th>Status</Th>
                <Th align="right">Docs</Th>
                <Th align="right">Findings</Th>
                <Th>Started</Th>
                <Th>Completed</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><Td colSpan={6}><span style={{ color: c.sub }}>No {filter} audits</span></Td></tr>
              )}
              {filtered.map((a) => {
                const open = openId === a.id;
                const fs = details[a.id];
                return (
                  <React.Fragment key={a.id}>
                    <tr
                      onClick={() => toggle(a)}
                      style={{ cursor: 'pointer', background: open ? c.panel2 : 'transparent' }}
                      aria-expanded={open}
                    >
                      <Td mono>
                        {shortId(a.id)}
                        <span style={{ color: c.faint, marginLeft: 6, fontSize: 11 }}>{open ? '▾' : '▸'}</span>
                      </Td>
                      <Td><StatusBadge status={a.status} /></Td>
                      <Td align="right">{a.docIds.length}</Td>
                      <Td align="right">
                        <Chip bg={a.findingIds.length ? c.amberBg : c.greenBg} color={a.findingIds.length ? c.amber : c.green}>
                          {a.findingIds.length}
                        </Chip>
                      </Td>
                      <Td><span style={{ whiteSpace: 'nowrap', color: c.sub, fontSize: 12 }} title={fmtTime(a.createdAt)}>{fmtAgo(a.createdAt)}</span></Td>
                      <Td><span style={{ whiteSpace: 'nowrap', color: c.sub, fontSize: 12 }}>{fmtTime(a.completedAt)}</span></Td>
                    </tr>
                    {open && (
                      <tr>
                        <Td colSpan={6}>
                          <div style={{ background: c.panel2, borderRadius: 10, padding: '10px 12px' }}>
                            {(a.status === 'running' || a.status === 'pending') && (
                              <div style={{ marginBottom: 10 }}>
                                <ProgressBar done={a.progressDone} total={a.progressTotal} />
                              </div>
                            )}
                            {a.error && <div style={{ color: c.red, fontSize: 12.5, marginBottom: 8 }}>✕ {a.error}</div>}
                            {busy === `open:${a.id}` && <Skeleton height={40} />}
                            {fs && fs.length === 0 && busy !== `open:${a.id}` && (
                              <div style={{ fontSize: 12.5, color: c.green }}>✓ No conflicts found in this audit</div>
                            )}
                            {fs && fs.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {fs.map((f) => (
                                  <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <SeverityBadge severity={f.severity} />
                                    <span style={{ fontSize: 12.5, color: c.text }}>{f.explanation}</span>
                                  </div>
                                ))}
                                <div style={{ fontSize: 11.5, color: c.faint }}>
                                  {/* Full id, not shortId — get_audit_result validates a uuid and
                                      rejects the truncated form shown in the table column. */}
                                  Ask for <span style={{ fontFamily: MONO, userSelect: 'all' }}>get_audit_result {a.id}</span> to open the full dashboard with the Black Box ledger.
                                </div>
                              </div>
                            )}
                          </div>
                        </Td>
                      </tr>
                    )}
                  </React.Fragment>
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
