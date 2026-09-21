'use client';

/**
 * Widget for `get_decision_trail` — timeline of every sealed Black Box decision
 * with expandable input/output metadata cards linked by their HMAC chain.
 */

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import type { DecisionRecord, ReplayResult } from '../../lib/types';
import {
  Shell, Header, Footer, Chip, Btn, Banner, EmptyState, LoadingCard,
  StatGrid, StatTile, JsonView, HashChip,
  usePalette, unwrap, fmtTime, shortId, shortHash, summarize, MONO,
} from '../../components/ui';

interface TrailOutput { auditId: string; findingId: string | null; records: DecisionRecord[] }

export default function DecisionTrail() {
  const c = usePalette();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const data = unwrap<TrailOutput | null>(getToolOutput<any>());

  const [openId, setOpenId] = useState<string | null>(null);
  const [verify, setVerify] = useState<ReplayResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isReady || data == null) return <LoadingCard lines={3} label="Loading decision trail…" />;

  const records = data.records ?? [];
  const agents = new Set(records.map((r) => r.agentName));
  const spanMs = records.length >= 2
    ? new Date(records[records.length - 1].timestamp).getTime() - new Date(records[0].timestamp).getTime()
    : 0;

  const runVerify = async () => {
    setVerifying(true);
    try {
      const r = unwrap<ReplayResult>(await callTool('verify_replay_chain', {
        auditId: data.auditId,
        ...(data.findingId ? { findingId: data.findingId } : {}),
      }));
      setVerify(r);
    } catch { /* noop */ } finally { setVerifying(false); }
  };

  return (
    <Shell maxWidth={720}>
      <Header
        title="Black Box · Decision Trail"
        subtitle={<>audit {shortId(data.auditId)}{data.findingId ? <> · finding {shortId(data.findingId)}</> : null}</>}
        right={<Btn kind="primary" onClick={runVerify} disabled={verifying}>{verifying ? 'Verifying…' : '🔐 Verify chain'}</Btn>}
      />

      {verify && (
        <Banner tone={verify.verified ? 'good' : 'bad'}>
          {verify.verified
            ? `✓ Chain verified — ${verify.records.length} sealed records intact from GENESIS`
            : `✕ Tampering detected — chain breaks at record ${shortId(verify.brokenAt)}`}
        </Banner>
      )}

      {records.length === 0 ? (
        <EmptyState icon="🕳" title="Empty ledger" body="No sealed decisions for this scope yet — run analyze_document first." />
      ) : (
        <>
          <StatGrid>
            <StatTile label="Sealed records" value={records.length} />
            <StatTile label="Agents" value={agents.size} color={c.accent} />
            <StatTile label="Span" value={spanMs < 1000 ? `${spanMs}ms` : `${(spanMs / 1000).toFixed(1)}s`} color={c.sub} />
            <StatTile label="Chain root" value={<span style={{ fontFamily: MONO, fontSize: 14 }}>GENESIS</span>} color={c.green} />
          </StatGrid>

          {/* Timeline */}
          <div style={{ borderLeft: `2px solid ${c.border}`, marginLeft: 8, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {records.map((r, i) => {
              const open = openId === r.id;
              const broken = verify?.brokenAt === r.id;
              return (
                <div key={r.id} style={{ position: 'relative' }}>
                  <span aria-hidden style={{
                    position: 'absolute', left: -25, top: 10, width: 12, height: 12, borderRadius: 999,
                    background: broken ? c.red : c.accent, border: `2px solid ${c.bg}`,
                  }} />
                  <div
                    onClick={() => setOpenId(open ? null : r.id)}
                    role="button"
                    aria-expanded={open}
                    style={{
                      background: c.panel, borderRadius: 12, padding: '11px 13px', cursor: 'pointer',
                      border: `1px solid ${broken ? c.red : c.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: c.faint, fontFamily: MONO }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: broken ? c.red : c.text }}>
                        {r.agentName}{broken && ' — chain breaks here'}
                      </span>
                      {r.findingId && <Chip bg={c.accentSoft} color={c.accent}>finding {shortId(r.findingId)}</Chip>}
                      <span style={{ flex: 1 }} />
                      <span style={{ fontSize: 11, color: c.faint }}>{fmtTime(r.timestamp)}</span>
                      <span style={{ fontSize: 11, color: c.faint }}>{open ? '▾' : '▸'}</span>
                    </div>
                    {!open && (
                      <div style={{ fontSize: 11.5, color: c.sub, marginTop: 4 }}>{summarize(r.output)}</div>
                    )}
                    <div style={{ fontSize: 10.5, color: c.faint, fontFamily: MONO, marginTop: 5 }}>
                      {shortHash(r.prevHash)} → <HashChip hash={r.hash} broken={broken} />
                    </div>
                    {open && (
                      <div style={{ marginTop: 10, display: 'grid', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: c.faint, marginBottom: 4 }}>Input</div>
                          <JsonView value={r.input} maxHeight={160} />
                        </div>
                        <div>
                          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: c.faint, marginBottom: 4 }}>Output</div>
                          <JsonView value={r.output} maxHeight={160} />
                        </div>
                        <div style={{ fontSize: 10.5, color: c.faint, fontFamily: MONO, wordBreak: 'break-all' }}>
                          seal {r.hash}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Footer />
    </Shell>
  );
}
