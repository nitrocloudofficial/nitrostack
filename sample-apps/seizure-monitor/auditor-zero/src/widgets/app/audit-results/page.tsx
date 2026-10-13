'use client';

/**
 * Widget for `analyze_document` / `get_audit_result` — findings dashboard with
 * severity, detection method, a replayable Black Box ledger per finding, and
 * one-click integrity verification (plus a dev-only tamper demo).
 */

import React, { useEffect, useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import type { Audit, DecisionRecord, Finding, ReplayResult } from '../../lib/types';
import { DETECTION_LABEL } from '../../lib/types';
import {
  Shell, Header, Footer, Chip, SeverityBadge, StatusBadge, Btn, Banner,
  ErrorBanner, EmptyState, LoadingCard, StatGrid, StatTile, ProgressBar, HashChip,
  usePalette, unwrap, shortId, summarize, MONO,
} from '../../components/ui';

interface AuditOutput { audit?: Audit; findings?: Finding[]; autoSeeded?: boolean; error?: string }

export default function AuditResults() {
  const c = usePalette();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const data = unwrap<AuditOutput | null>(getToolOutput<any>());

  const [verify, setVerify] = useState<ReplayResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [trail, setTrail] = useState<DecisionRecord[]>([]);
  const [dev, setDev] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [live, setLive] = useState<{ audit: Audit; findings: Finding[] } | null>(null);

  // analyze_document returns immediately with the audit still running — poll
  // get_audit_result until it completes so the dashboard fills in live.
  const toolAuditId = data?.audit?.id;
  const toolStatus = data?.audit?.status;
  useEffect(() => {
    if (!isReady || !toolAuditId) return;
    if (toolStatus !== 'running' && toolStatus !== 'pending') return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (stopped) return;
      try {
        const r = unwrap<{ audit?: Audit; findings?: Finding[] }>(await callTool('get_audit_result', { auditId: toolAuditId }));
        if (stopped) return;
        if (r?.audit) {
          setLive({ audit: r.audit, findings: r.findings ?? [] });
          if (r.audit.status === 'complete' || r.audit.status === 'failed') return;
        }
      } catch { /* transient poll failure — keep going */ }
      timer = setTimeout(tick, 2000);
    };
    timer = setTimeout(tick, 1200);
    return () => { stopped = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, toolAuditId, toolStatus]);

  if (!isReady || data == null) return <LoadingCard lines={3} label="Running audit…" />;

  // If the tool call failed, the payload has no audit — surface the error instead
  // of rendering a misleading empty dashboard.
  if (!data.audit) {
    const raw = data.error ?? (data as any)?.content?.[0]?.text ?? (typeof data === 'string' ? data : JSON.stringify(data));
    return (
      <Shell>
        <Header title="Audit Results" />
        <ErrorBanner
          title="Audit did not run"
          detail={String(raw)}
          hint="Tip: just run analyze_document again — it auto-seeds demo documents if the store is empty."
        />
        <Footer />
      </Shell>
    );
  }

  const audit = live?.audit ?? data.audit;
  const findings = live?.findings ?? data.findings ?? [];
  const auditId = audit.id;
  const running = audit.status === 'running' || audit.status === 'pending';
  const stats = {
    total: findings.length,
    high: findings.filter((f) => f.severity === 'high').length,
    contradictions: findings.filter((f) => f.type === 'contradiction').length,
    disappearances: findings.filter((f) => f.type === 'disappearance').length,
  };

  const runVerify = async () => {
    if (!auditId) return;
    setVerifying(true);
    try {
      setVerify(unwrap<ReplayResult>(await callTool('verify_replay_chain', { auditId })));
    } catch { /* noop */ } finally { setVerifying(false); }
  };

  const toggleReplay = async (findingId: string) => {
    if (openId === findingId) { setOpenId(null); return; }
    setOpenId(findingId);
    setBusy('trail');
    try {
      const r = unwrap<{ records: DecisionRecord[] }>(await callTool('get_decision_trail', { auditId, findingId }));
      setTrail(r.records ?? []);
    } catch { setTrail([]); } finally { setBusy(null); }
  };

  const tamper = async (recordId: string) => {
    setBusy(recordId);
    try {
      await callTool('debug_tamper_record', { recordId, newOutput: { verdict: 'consistent', note: 'edited' } });
      await runVerify();
    } catch { /* noop */ } finally { setBusy(null); }
  };

  return (
    <Shell>
      <Header
        title="Audit Results"
        subtitle={<>{shortId(auditId)} · {audit.docIds.length} docs</>}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={audit.status} />
            <Btn kind="primary" onClick={runVerify} disabled={verifying}>{verifying ? 'Verifying…' : '🔐 Verify Integrity'}</Btn>
          </div>
        }
      />

      {data.autoSeeded && (
        <Banner tone="info">✨ Store was empty — the demo document set was seeded automatically for this audit.</Banner>
      )}

      {running && (
        <div style={{ marginBottom: 14 }}>
          <ProgressBar done={audit.progressDone} total={audit.progressTotal} />
          <div style={{ fontSize: 11.5, color: c.faint, marginTop: 6 }}>
            ⏳ Audit in progress — this dashboard updates automatically as agents finish.
          </div>
        </div>
      )}

      {audit.status === 'failed' && audit.error && <Banner tone="bad">✕ {audit.error}</Banner>}

      {verify && (
        <Banner tone={verify.verified ? 'good' : 'bad'}>
          {verify.verified
            ? `✓ Integrity verified — ${verify.records.length}-record HMAC chain intact from GENESIS`
            : '✕ Tampering detected — the sealed chain no longer verifies'}
        </Banner>
      )}

      <StatGrid>
        <StatTile label="Findings" value={stats.total} />
        <StatTile label="Contradictions" value={stats.contradictions} color={c.amber} />
        <StatTile label="Disappearances" value={stats.disappearances} color={c.accent} />
        <StatTile label="High severity" value={stats.high} color={stats.high ? c.red : c.sub} />
      </StatGrid>

      {findings.length === 0 && !running && (
        <EmptyState icon="✅" title="No conflicts found" body="Every compared clause pair was judged consistent, and no obligation category vanished between versions." />
      )}

      {findings.map((f) => (
        <div key={f.id} style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            <SeverityBadge severity={f.severity} />
            <Chip bg={c.accentSoft} color={c.accent}>{DETECTION_LABEL[f.detectionMethod] ?? f.detectionMethod}</Chip>
            <Chip bg={c.panel2} color={c.sub}>{f.type}</Chip>
            <Chip bg={c.panel2} color={c.sub} title="Model confidence">conf: {f.confidence}</Chip>
            <span style={{ flex: 1 }} />
            <Btn small active={openId === f.id} onClick={() => toggleReplay(f.id)}>Replay</Btn>
          </div>
          <div style={{ fontSize: 13.5 }}>{f.explanation}</div>
          <div style={{ fontSize: 12, color: c.faint, marginTop: 4 }}>Why flagged: {f.severityJustification}</div>
          {f.docIds?.length > 0 && (
            <div style={{ fontSize: 11, color: c.faint, marginTop: 6, fontFamily: MONO }}>
              evidence: {f.docIds.map((d) => shortId(d)).join(' · ')}
            </div>
          )}

          {/* Replay timeline */}
          {openId === f.id && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${c.border}`, paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>Black Box ledger</span>
                <label style={{ fontSize: 11.5, color: c.faint, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} /> Dev tools
                </label>
              </div>
              {busy === 'trail' && <div style={{ color: c.sub, fontSize: 12 }}>Loading ledger…</div>}
              <div style={{ borderLeft: `2px solid ${c.border}`, marginLeft: 6, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {trail.map((r) => {
                  const broken = verify?.brokenAt === r.id;
                  return (
                    <div key={r.id} style={{ position: 'relative' }}>
                      <span aria-hidden style={{ position: 'absolute', left: -23, top: 3, width: 10, height: 10, borderRadius: 999, background: broken ? c.red : c.accent, border: `2px solid ${c.panel}` }} />
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: broken ? c.red : c.text }}>{r.agentName}{broken && ' — chain breaks here'}</div>
                      <div style={{ fontSize: 11.5, color: c.sub, margin: '2px 0' }}>out: {summarize(r.output, 90)}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <HashChip hash={r.hash} broken={broken} />
                        {dev && (
                          <Btn kind="danger" small onClick={() => tamper(r.id)} disabled={busy === r.id}>
                            {busy === r.id ? 'Tampering…' : 'Tamper'}
                          </Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}

      <Footer />
    </Shell>
  );
}
