'use client';

import React from 'react';
import { useTheme, useWidgetSDK, useWidgetState } from '@nitrostack/widgets';
import {
  Empty,
  Field,
  Micro,
  MONO,
  RefStrip,
  SANS,
  Section,
  Slip,
  Stamp,
  TickMeter,
  tokens,
  toneFor,
} from '../_shared/ui';

interface Signal {
  id: string;
  label: string;
  points: number;
  max: number;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

interface Check {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

interface OrderReviewData {
  orderId: string;
  agentId: string;
  agentDisplayName: string;
  score: number;
  band: string;
  verdict: string;
  status: string;
  protocol: string;
  signals: Signal[];
  failedSignals: number;
  conflicts: string[];
  reasoning: string[];
  hitlRequired: boolean;
  orderTotal: string;
  hitlThreshold: string;
  items: Array<{ sku: string; name: string; qty: number; lineTotal: string }>;
  screening: { checks: Check[]; failedChecks: number; summary: string };
  evidencePath: string[];
  nextStep: string;
}

export default function OrderReview() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ showWorking: boolean }>(() => ({
    showWorking: false,
  }));

  const t = tokens(theme === 'dark');
  const data = getToolOutput<OrderReviewData>();

  if (!data) return <Empty t={t} message="AWAITING ORDER REVIEW" />;

  const tone = toneFor(t, data.verdict);
  const showWorking = state?.showWorking ?? false;

  const statusTone = (s: Signal['status']) =>
    s === 'pass' ? t.clear : s === 'warn' ? t.hold : t.danger;

  return (
    <Slip t={t}>
      <RefStrip
        t={t}
        left={
          <>
            <strong style={{ fontWeight: 700 }}>{data.orderId}</strong>
            <span style={{ color: t.inkSoft }}> · {data.protocol.toUpperCase()} · NOVAGEAR</span>
          </>
        }
        right="AGENT ORDER SCREENING"
      />

      {/* Verdict + score: the two things a seller needs in one glance. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          padding: '18px 16px 16px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <Micro t={t}>Trust score</Micro>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 46,
              lineHeight: 1,
              fontWeight: 700,
              color: tone,
              letterSpacing: '-0.02em',
              margin: '6px 0 8px',
            }}
          >
            {data.score}
            <span style={{ fontSize: 16, color: t.inkSoft, fontWeight: 400 }}>/100</span>
          </div>
          <TickMeter value={data.score} max={100} tone={tone} t={t} />
          <div
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: t.inkSoft,
              marginTop: 8,
            }}
          >
            {data.band} · {data.failedSignals} of {data.signals.length} signals failed
          </div>
        </div>
        <Stamp label={data.verdict} tone={tone} t={t} />
      </div>

      <Section title="Buyer" t={t}>
        <div className="gw-grid-2">
          <Field label="Agent" value={data.agentDisplayName} t={t} mono={false} />
          <Field label="Agent ID" value={data.agentId} t={t} />
          <Field label="Order total" value={data.orderTotal} t={t} tone={tone} />
          <Field label="Disposition" value={data.status.toUpperCase()} t={t} tone={tone} />
        </div>
      </Section>

      <Section title="Cart" t={t} note={`${data.items.length} line item(s)`}>
        {data.items.map((item) => (
          <div
            key={item.sku}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              padding: '6px 0',
              borderBottom: `1px solid ${t.ruleSoft}`,
              fontFamily: MONO,
              fontSize: 12.5,
            }}
          >
            <span style={{ minWidth: 0 }}>
              <span style={{ color: t.inkSoft }}>{item.qty}× </span>
              {item.sku}
              <span style={{ color: t.inkSoft, fontFamily: SANS, fontSize: 12 }}> {item.name}</span>
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>{item.lineTotal}</span>
          </div>
        ))}
      </Section>

      {/* Weighted signals — the seller can see which one sank the order. */}
      <Section title="Risk signals" t={t} note="points awarded / weight">
        {data.signals.map((s) => (
          <div key={s.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 10,
              }}
            >
              <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 11.5,
                  color: statusTone(s.status),
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.08em',
                }}
              >
                {s.points}/{s.max} {s.status.toUpperCase()}
              </span>
            </div>
            <div style={{ margin: '5px 0 4px' }}>
              <TickMeter value={s.points} max={s.max} tone={statusTone(s.status)} t={t} segments={16} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 11.5, color: t.inkSoft, lineHeight: 1.4 }}>
              {s.detail}
            </div>
          </div>
        ))}
      </Section>

      {data.conflicts.length > 0 && (
        <Section title="Conflicting evidence" t={t} note={`${data.conflicts.length}`}>
          {data.conflicts.map((c, i) => (
            <div
              key={i}
              style={{
                background: t.holdWash,
                borderLeft: `3px solid ${t.hold}`,
                padding: '9px 11px',
                marginBottom: 8,
                fontFamily: SANS,
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              {c}
            </div>
          ))}
        </Section>
      )}

      {/* Only meaningful when the order is actually waiting on a person — a
          declined order never reaches settlement. */}
      {data.hitlRequired && data.verdict === 'hold' && (
        <Section title="Human review" t={t}>
          <div style={{ fontFamily: SANS, fontSize: 12, lineHeight: 1.45 }}>
            Order total exceeds the {data.hitlThreshold} threshold. A person signs off before this
            sale settles, regardless of score.
          </div>
        </Section>
      )}

      <Section title="Identity checks" t={t} note={data.screening.summary}>
        {data.screening.checks.map((c) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              gap: 9,
              padding: '5px 0',
              alignItems: 'flex-start',
              fontFamily: SANS,
              fontSize: 12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                fontFamily: MONO,
                color: c.passed ? t.clear : t.danger,
                fontWeight: 700,
                lineHeight: 1.4,
              }}
            >
              {c.passed ? '✓' : '✗'}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{c.label}</span>
              <span style={{ color: t.inkSoft }}> — {c.detail}</span>
            </span>
          </div>
        ))}
      </Section>

      {/* The gateway's working, kept out of the way until asked for. */}
      <Section title="Gateway working" t={t}>
        <button
          onClick={() => setState({ showWorking: !showWorking })}
          aria-expanded={showWorking}
          style={{
            fontFamily: MONO,
            fontSize: 11,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            background: 'transparent',
            color: t.ink,
            border: `1px solid ${t.rule}`,
            padding: '6px 11px',
            cursor: 'pointer',
          }}
        >
          {showWorking ? '− Hide reasoning' : '+ Show reasoning'}
        </button>

        {showWorking && (
          <div style={{ marginTop: 11 }}>
            <Micro t={t} style={{ marginBottom: 6 }}>
              Decision trail
            </Micro>
            {data.reasoning.map((r, i) => (
              <div
                key={i}
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  lineHeight: 1.45,
                  paddingLeft: 12,
                  borderLeft: `2px solid ${t.ruleSoft}`,
                  marginBottom: 7,
                }}
              >
                {r}
              </div>
            ))}

            <Micro t={t} style={{ margin: '12px 0 6px' }}>
              Evidence path ({data.protocol.toUpperCase()})
            </Micro>
            {data.evidencePath.map((e, i) => (
              <div
                key={i}
                style={{
                  fontFamily: MONO,
                  fontSize: 11,
                  color: t.inkSoft,
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}
              >
                {e}
              </div>
            ))}
          </div>
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
        NEXT — {data.nextStep}
      </div>
    </Slip>
  );
}
