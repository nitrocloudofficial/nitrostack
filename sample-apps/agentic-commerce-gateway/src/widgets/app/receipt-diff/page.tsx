'use client';

import React from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import {
  Empty,
  Micro,
  MONO,
  RefStrip,
  SANS,
  Section,
  Slip,
  Stamp,
  tokens,
} from '../_shared/ui';

interface Diff {
  field: string;
  receiptValue: string;
  chainValue: string;
  match: boolean;
  severity: 'ok' | 'warning' | 'critical';
}

interface ReceiptDiffData {
  orderId: string;
  verified: boolean;
  diffs: Diff[];
  mismatchCount: number;
  criticalMismatches: number;
  exposure: string;
  summary: string;
  recommendedAction: string;
  agentId: string;
  agentDisplayName: string;
  receipt: { amount: string; payee: string; issuedAt: string };
  chain: { amount: string; payee: string; txHash: string; network: string; settledAt: string };
  nextStep: string;
}

/** Field name -> the wording a seller would use. */
function fieldLabel(field: string): string {
  if (field.startsWith('line_item.')) {
    const sku = field.split('.')[1];
    return `Quantity · ${sku}`;
  }
  const map: Record<string, string> = {
    amount: 'Amount',
    currency: 'Currency',
    payee: 'Paid to',
    network: 'Network',
    tx_hash: 'Transaction',
  };
  return map[field] ?? field;
}

export default function ReceiptDiff() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();

  const t = tokens(theme === 'dark');
  const data = getToolOutput<ReceiptDiffData>();

  if (!data) return <Empty t={t} message="AWAITING SETTLEMENT RECORD" />;

  const tone = data.verified ? t.clear : t.danger;

  return (
    <Slip t={t} maxWidth={620}>
      <RefStrip
        t={t}
        left={
          <>
            <strong style={{ fontWeight: 700 }}>{data.orderId}</strong>
            <span style={{ color: t.inkSoft }}> · {data.agentId}</span>
          </>
        }
        right="RECEIPT vs ON-CHAIN RECORD"
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 16px 14px',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <Micro t={t}>
            {data.verified ? 'Settlement consistent' : 'Settlement discrepancy'}
          </Micro>
          <div
            style={{
              fontFamily: SANS,
              fontSize: 13.5,
              lineHeight: 1.45,
              marginTop: 6,
              color: t.ink,
            }}
          >
            {data.summary}
          </div>
        </div>
        <Stamp label={data.verified ? 'Verified' : 'Mismatch'} tone={tone} t={t} />
      </div>

      {/* The diff itself: claim on the left, record on the right. */}
      <Section
        title="Field comparison"
        t={t}
        note={`${data.mismatchCount} of ${data.diffs.length} disagree`}
      >
        <div
          className="gw-diff"
          style={{
            paddingBottom: 6,
            borderBottom: `1px solid ${t.rule}`,
            marginBottom: 2,
          }}
        >
          <Micro t={t}>Receipt claims</Micro>
          <div className="gw-diff-gutter" />
          <Micro t={t}>Chain records</Micro>
        </div>

        {data.diffs.map((d) => {
          const bad = !d.match;
          return (
            <div
              key={d.field}
              style={{
                background: bad ? t.dangerWash : 'transparent',
                borderBottom: `1px solid ${t.ruleSoft}`,
                padding: '9px 0 9px 0',
              }}
            >
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 600,
                  color: bad ? t.danger : t.inkSoft,
                  marginBottom: 4,
                  paddingLeft: bad ? 9 : 0,
                  borderLeft: bad ? `3px solid ${t.danger}` : 'none',
                }}
              >
                {fieldLabel(d.field)}
              </div>

              <div className="gw-diff" style={{ paddingLeft: bad ? 12 : 0 }}>
                <div style={{ minWidth: 0 }}>
                  <span className="gw-cell-label">
                    <Micro t={t} style={{ marginBottom: 2 }}>
                      Receipt
                    </Micro>
                  </span>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: bad ? t.danger : t.ink,
                      fontWeight: bad ? 700 : 400,
                      wordBreak: 'break-all',
                      lineHeight: 1.4,
                    }}
                  >
                    {d.receiptValue}
                  </div>
                </div>

                <div
                  className="gw-diff-gutter"
                  aria-hidden="true"
                  style={{
                    fontFamily: MONO,
                    fontSize: 15,
                    fontWeight: 700,
                    textAlign: 'center',
                    color: bad ? t.danger : t.rule,
                  }}
                >
                  {bad ? '≠' : '='}
                </div>

                <div style={{ minWidth: 0 }}>
                  <span className="gw-cell-label">
                    <Micro t={t} style={{ marginBottom: 2, marginTop: 6 }}>
                      Chain {bad ? '(≠)' : ''}
                    </Micro>
                  </span>
                  <div
                    style={{
                      fontFamily: MONO,
                      fontSize: 13,
                      color: bad ? t.danger : t.ink,
                      fontWeight: bad ? 700 : 400,
                      wordBreak: 'break-all',
                      lineHeight: 1.4,
                    }}
                  >
                    {d.chainValue}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Section>

      {/* Accounting convention: the total sits under a double rule. */}
      <div
        style={{
          margin: '0 16px',
          borderTop: `1px solid ${t.rule}`,
          borderBottom: `3px double ${data.verified ? t.rule : t.danger}`,
          padding: '12px 0',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Micro t={t}>Seller exposure</Micro>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 26,
            fontWeight: 700,
            color: data.verified ? t.inkSoft : t.danger,
            letterSpacing: '-0.01em',
          }}
        >
          {data.exposure}
        </div>
      </div>

      <Section title="Settlement record" t={t}>
        <div style={{ fontFamily: MONO, fontSize: 11.5, lineHeight: 1.6, color: t.inkSoft }}>
          <div style={{ wordBreak: 'break-all' }}>
            <span style={{ color: t.ink }}>tx</span> {data.chain.txHash}
          </div>
          <div>
            <span style={{ color: t.ink }}>network</span> {data.chain.network}
          </div>
          <div>
            <span style={{ color: t.ink }}>settled</span> {data.chain.settledAt}
          </div>
          <div>
            <span style={{ color: t.ink }}>receipt issued</span> {data.receipt.issuedAt}
          </div>
        </div>
      </Section>

      <Section title="Recommended action" t={t}>
        <div
          style={{
            fontFamily: SANS,
            fontSize: 12.5,
            lineHeight: 1.5,
            background: data.verified ? t.clearWash : t.dangerWash,
            borderLeft: `3px solid ${tone}`,
            padding: '10px 12px',
          }}
        >
          {data.recommendedAction}
        </div>
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
