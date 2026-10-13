'use client';

/**
 * Widget for `verify_replay_chain` — integrity dashboard that visualizes the
 * recomputed HMAC chain from GENESIS and pinpoints the exact record where
 * tampering breaks the seal.
 */

import React, { useState } from 'react';
import { useWidgetSDK } from '@nitrostack/widgets';
import type { ReplayResult } from '../../lib/types';
import {
  Shell, Header, Footer, Btn, EmptyState, LoadingCard, StatGrid, StatTile,
  usePalette, unwrap, fmtTime, shortId, shortHash, MONO, type Palette,
} from '../../components/ui';

function BigStatus({ c, ok, records, brokenAt }: { c: Palette; ok: boolean; records: number; brokenAt: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px', borderRadius: 12,
      marginBottom: 16, background: ok ? c.greenBg : c.redBg, border: `1px solid ${ok ? c.green : c.red}`,
    }} role="status">
      <div aria-hidden style={{
        width: 44, height: 44, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, color: '#fff', background: ok ? '#0ca30c' : '#d03b3b', flexShrink: 0,
      }}>{ok ? '✓' : '✕'}</div>
      <div>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: ok ? c.green : c.red }}>
          {ok ? 'Integrity verified' : 'Tampering detected'}
        </div>
        <div style={{ fontSize: 12.5, color: c.sub, marginTop: 2 }}>
          {ok
            ? `All ${records} records re-derive from GENESIS under the server-held HMAC key.`
            : `The keyed hash chain no longer verifies — it breaks at record ${shortId(brokenAt)}. Every record from there on is untrusted.`}
        </div>
      </div>
    </div>
  );
}

export default function ReplayVerify() {
  const c = usePalette();
  const { getToolOutput, callTool, isReady } = useWidgetSDK();
  const initial = unwrap<ReplayResult | null>(getToolOutput<any>());

  const [result, setResult] = useState<ReplayResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  if (!isReady || initial == null) return <LoadingCard lines={3} label="Recomputing HMAC chain…" />;

  const r = result ?? initial;
  const records = r.records ?? [];
  const brokenIdx = r.brokenAt ? records.findIndex((x) => x.id === r.brokenAt) : -1;
  const intact = r.verified ? records.length : (brokenIdx === -1 ? 0 : brokenIdx);

  const reverify = async () => {
    setVerifying(true);
    try {
      const next = unwrap<ReplayResult>(await callTool('verify_replay_chain', {
        auditId: r.auditId,
        ...(r.findingId ? { findingId: r.findingId } : {}),
      }));
      setResult(next);
    } catch { /* noop */ } finally { setVerifying(false); }
  };

  return (
    <Shell maxWidth={720}>
      <Header
        title="Replay Chain Verification"
        subtitle={<>audit {shortId(r.auditId)}{r.findingId ? <> · finding {shortId(r.findingId)}</> : null}</>}
        right={<Btn kind="primary" onClick={reverify} disabled={verifying}>{verifying ? 'Re-verifying…' : '↻ Re-verify'}</Btn>}
      />

      {records.length === 0 ? (
        <EmptyState icon="🕳" title="Nothing to verify" body="This scope has no sealed records — run analyze_document first." />
      ) : (
        <>
          <BigStatus c={c} ok={r.verified} records={records.length} brokenAt={r.brokenAt} />

          <StatGrid>
            <StatTile label="Records" value={records.length} />
            <StatTile label="Verified" value={intact} color={c.green} />
            <StatTile label="Broken" value={r.verified ? 0 : records.length - intact} color={r.verified ? c.sub : c.red} />
            <StatTile label="Algorithm" value={<span style={{ fontSize: 13, fontFamily: MONO }}>HMAC-SHA256</span>} color={c.accent} />
          </StatGrid>

          {/* Chain visualization */}
          <div style={{ background: c.panel, border: `1px solid ${c.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 750, marginBottom: 10 }}>Hash chain replay — GENESIS forward</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Genesis node */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, background: c.green, flexShrink: 0 }} />
                <span style={{ fontFamily: MONO, fontSize: 11.5, color: c.green, fontWeight: 700 }}>GENESIS</span>
              </div>
              {records.map((rec, i) => {
                const isBroken = rec.id === r.brokenAt;
                const afterBreak = brokenIdx !== -1 && i > brokenIdx;
                return (
                  <div key={rec.id} style={{ opacity: afterBreak ? 0.55 : 1 }}>
                    <div aria-hidden style={{ width: 2, height: 14, background: isBroken ? c.red : c.border, marginLeft: 4 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span aria-hidden style={{
                        width: 10, height: 10, borderRadius: 999, flexShrink: 0,
                        background: isBroken ? c.red : afterBreak ? c.faint : c.green,
                      }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: isBroken ? c.red : c.text, minWidth: 150 }}>
                        {rec.agentName}
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 10.5, color: isBroken ? c.red : afterBreak ? c.faint : c.green }} title={rec.hash}>
                        {shortHash(rec.hash)}
                      </span>
                      <span style={{ fontSize: 10.5, color: c.faint }}>{fmtTime(rec.timestamp)}</span>
                      {isBroken && (
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: '#d03b3b', padding: '2px 8px', borderRadius: 999 }}>
                          ✕ SEAL MISMATCH
                        </span>
                      )}
                      {afterBreak && <span style={{ fontSize: 10.5, color: c.faint }}>untrusted after break</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verification summary */}
            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${c.border}`, fontSize: 11.5, color: c.sub }}>
              Each seal is <span style={{ fontFamily: MONO }}>HMAC-SHA256(secret, prevHash + payload)</span> with a server-held key —
              a tampered record cannot be re-sealed without the secret.
              {r.verified
                ? <span style={{ color: c.green, fontWeight: 700 }}> Full chain re-derived successfully.</span>
                : <span style={{ color: c.red, fontWeight: 700 }}> Recomputation diverged from the stored seal at record {shortId(r.brokenAt)}.</span>}
            </div>
          </div>
        </>
      )}

      <Footer />
    </Shell>
  );
}
