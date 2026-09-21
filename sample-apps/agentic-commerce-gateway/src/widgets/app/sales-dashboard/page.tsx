'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { Empty, Micro, MONO, RefStrip, SANS, Section, Slip, tokens } from '../_shared/ui';

interface FeedRow {
  orderId: string;
  protocol: string;
  agentId: string;
  agentDisplayName: string;
  status: string;
  total: string;
  totalMinor: number;
  items: string;
}

interface DashboardData {
  store: string;
  counts: {
    pending: number;
    approved: number;
    held: number;
    declined: number;
    flagged: number;
  };
  totalOrders: number;
  approvedRevenue: string;
  revenueProtected: string;
  hitlThreshold: string;
  feed: FeedRow[];
  agents: Array<{ agentId: string; displayName: string; orders: number; value: string; declined: number }>;
  flagged: Array<{ orderId: string; reason: string; exposure: string; evidence: string[] }>;
  blocklist: Array<{ agentId: string; displayName: string; reason: string }>;
}

const GLYPH: Record<string, string> = {
  approved: '✓',
  held: '‖',
  declined: '✗',
  flagged: '⚑',
  pending: '·',
};

/**
 * The dashboard is the one document the server sends no `nextStep` for — it
 * reports on the whole store rather than one order — so the footer states what
 * currently needs a person, in order of urgency.
 */
function nextAction(d: DashboardData): string {
  if (d.counts.flagged > 0) {
    return `${d.counts.flagged} disputed order(s) open. Settle or write off each before the next payout run.`;
  }
  if (d.counts.held > 0) {
    return `${d.counts.held} order(s) await seller sign-off above the ${d.hitlThreshold} threshold.`;
  }
  if (d.counts.pending > 0) {
    return `${d.counts.pending} order(s) not yet screened. Run compute_trust_score on each.`;
  }
  return 'No orders need seller action. Screening is current.';
}

export default function SalesDashboard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const t = tokens(theme === 'dark');
  const data = getToolOutput<DashboardData>();

  if (!data) return <Empty t={t} message="AWAITING SALES LEDGER" />;

  const toneFor = (status: string) =>
    status === 'approved'
      ? t.clear
      : status === 'held' || status === 'pending'
        ? t.hold
        : t.danger;

  /** An order counts as stopped if the gateway kept the money from leaving. */
  const stopped = (s: string) => s === 'declined' || s === 'flagged';
  /** Only approved orders have actually settled; pending and held are still open. */
  const settled = (s: string) => s === 'approved';

  return (
    <Slip t={t} maxWidth={640}>
      <style>{`
        .gw-led { display: grid; grid-template-columns: 16px 1fr 88px 88px; gap: 8px; align-items: baseline; }
        .gw-led-stopped { display: none; }
        @media (max-width: 470px) {
          .gw-led { grid-template-columns: 16px 1fr 92px; }
          .gw-led-settled { display: none; }
          .gw-led-stopped { display: block; }
        }
      `}</style>

      <RefStrip t={t} left={<strong>{data.store}</strong>} right="AGENT SALES LEDGER" />

      {/* Disposition strip — what the gateway did with the day's orders. */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0,
          borderBottom: `1px solid ${t.rule}`,
        }}
      >
        {(
          [
            ['approved', data.counts.approved, t.clear],
            ['held', data.counts.held, t.hold],
            ['declined', data.counts.declined, t.danger],
            ['flagged', data.counts.flagged, t.danger],
            ['pending', data.counts.pending, t.inkSoft],
          ] as Array<[string, number, string]>
        ).map(([label, count, tone]) => (
          <div
            key={label}
            style={{
              flex: '1 1 88px',
              padding: '11px 10px',
              borderRight: `1px solid ${t.ruleSoft}`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 21, fontWeight: 700, color: tone }}>
              {count}
            </div>
            <Micro t={t} style={{ marginTop: 2 }}>
              {label}
            </Micro>
          </div>
        ))}
      </div>

      {/* The ledger tape: settled on one side, stopped on the other. */}
      <Section title="Order ledger" t={t} note={`${data.totalOrders} agent order(s)`}>
        <div
          className="gw-led"
          style={{ paddingBottom: 6, borderBottom: `1px solid ${t.rule}`, marginBottom: 4 }}
        >
          <div />
          <Micro t={t}>Order</Micro>
          <Micro t={t} style={{ textAlign: 'right' }}>
            <span className="gw-led-settled">Settled</span>
            <span className="gw-led-stopped">Amount</span>
          </Micro>
          <Micro t={t} style={{ textAlign: 'right' }} >
            <span className="gw-led-settled">Stopped</span>
          </Micro>
        </div>

        {data.feed.map((row) => {
          const tone = toneFor(row.status);
          const isStopped = stopped(row.status);
          const isSettled = settled(row.status);
          return (
            <div
              key={row.orderId}
              className="gw-led"
              style={{ padding: '7px 0', borderBottom: `1px solid ${t.ruleSoft}` }}
            >
              <div
                aria-hidden="true"
                style={{ fontFamily: MONO, fontSize: 12, color: tone, fontWeight: 700 }}
              >
                {GLYPH[row.status] ?? '·'}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: MONO, fontSize: 12.5 }}>
                  {row.orderId}
                  <span style={{ color: t.inkSoft, fontSize: 10.5, letterSpacing: '0.06em' }}>
                    {' '}
                    {row.protocol.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 11.5,
                    color: t.inkSoft,
                    lineHeight: 1.35,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {row.agentDisplayName} · {row.items}
                </div>
              </div>

              {/* Wide layout: two money columns. Narrow: one, colour-coded. */}
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 12.5,
                  textAlign: 'right',
                  color: isSettled ? t.ink : t.inkSoft,
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="gw-led-settled">{isSettled ? row.total : '—'}</span>
                <span className="gw-led-stopped" style={{ color: tone }}>
                  {row.total}
                </span>
              </div>

              <div
                className="gw-led-settled"
                style={{
                  fontFamily: MONO,
                  fontSize: 12.5,
                  textAlign: 'right',
                  color: isStopped ? t.danger : t.ruleSoft,
                  whiteSpace: 'nowrap',
                  fontWeight: isStopped ? 700 : 400,
                }}
              >
                {isStopped ? row.total : '—'}
              </div>
            </div>
          );
        })}

        {/* Totals sit under a double rule, as on a paper ledger. */}
        <div
          style={{
            marginTop: 10,
            borderTop: `1px solid ${t.rule}`,
            borderBottom: `3px double ${t.rule}`,
            padding: '12px 0',
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <Micro t={t}>Revenue settled</Micro>
            <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 3 }}>
              {data.approvedRevenue}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Micro t={t}>Revenue protected</Micro>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 28,
                fontWeight: 700,
                color: t.clear,
                marginTop: 3,
                letterSpacing: '-0.01em',
              }}
            >
              {data.revenueProtected}
            </div>
          </div>
        </div>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 11,
            color: t.inkSoft,
            marginTop: 7,
            lineHeight: 1.45,
          }}
        >
          Protected = value of orders declined at screening, plus exposure uncovered on settled
          orders that were flagged. Orders above {data.hitlThreshold} always go to a human.
        </div>
      </Section>

      {data.flagged.length > 0 && (
        <Section title="Disputed orders" t={t} note={`${data.flagged.length}`}>
          {data.flagged.map((f) => (
            <div
              key={f.orderId}
              style={{
                background: t.dangerWash,
                borderLeft: `3px solid ${t.danger}`,
                padding: '9px 11px',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>
                  {f.orderId}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.danger }}>
                  {f.exposure}
                </span>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>
                {f.reason}
              </div>
              {f.evidence.map((e, i) => (
                <div
                  key={i}
                  style={{ fontFamily: MONO, fontSize: 11, color: t.inkSoft, marginTop: 2 }}
                >
                  {e}
                </div>
              ))}
            </div>
          ))}
        </Section>
      )}

      <Section title="Buying agents" t={t} note={`${data.agents.length}`}>
        {data.agents.map((a) => (
          <div
            key={a.agentId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              padding: '6px 0',
              borderBottom: `1px solid ${t.ruleSoft}`,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600 }}>
                {a.displayName}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: t.inkSoft }}>
                {' '}
                {a.agentId}
              </span>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 12, whiteSpace: 'nowrap' }}>
              {a.orders} order(s) · {a.value}
              {a.declined > 0 && (
                <span style={{ color: t.danger }}> · {a.declined} stopped</span>
              )}
            </span>
          </div>
        ))}
      </Section>

      <Section title="Blocklist" t={t} note={data.blocklist.length ? `${data.blocklist.length}` : 'empty'}>
        {data.blocklist.length === 0 ? (
          <div style={{ fontFamily: SANS, fontSize: 12, color: t.inkSoft }}>
            No agents banned yet. Blocklist an agent to decline its future orders at screening.
          </div>
        ) : (
          data.blocklist.map((b) => (
            <div
              key={b.agentId}
              style={{ padding: '6px 0', borderBottom: `1px solid ${t.ruleSoft}` }}
            >
              <div style={{ fontFamily: MONO, fontSize: 12.5, color: t.danger, fontWeight: 700 }}>
                {b.agentId}
                <span style={{ color: t.inkSoft, fontWeight: 400 }}> · {b.displayName}</span>
              </div>
              <div style={{ fontFamily: SANS, fontSize: 11.5, color: t.inkSoft, marginTop: 2 }}>
                {b.reason}
              </div>
            </div>
          ))
        )}
      </Section>

      <div
        style={{
          borderTop: `1px dashed ${t.rule}`,
          background: t.stock,
          padding: '10px 16px',
          fontFamily: MONO,
          fontSize: 11,
          color: t.inkSoft,
          lineHeight: 1.4,
        }}
      >
        NEXT — {nextAction(data)}
      </div>
    </Slip>
  );
}
