'use client';

import React from 'react';
import { Button, Card, Logo, WordMark, Badge } from '../ui';

const HIGHLIGHTS = [
  { title: 'Describe it once', body: 'Tell us your situation in plain language. We read out the details.' },
  { title: 'Know what to gather', body: 'Get the document checklist and timeline for your exact route.' },
  { title: 'Check before you file', body: 'We read your documents and flag mismatches against your case.' },
];

export function Landing({ onStart }: { onStart: () => void }) {
  return (
    <Card style={{ overflow: 'hidden', padding: 0 }}>
      <div
        className="me-animate-in"
        style={{
          background:
            'linear-gradient(150deg, var(--me-blue-700) 0%, var(--me-blue-600) 48%, var(--me-blue-500) 100%)',
          padding: 'clamp(26px, 6vw, 46px) clamp(20px, 5vw, 40px)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 22 }}>
          <Logo size={34} />
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Migrate<span style={{ opacity: 0.75 }}>Ease</span>
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(25px, 5.6vw, 40px)',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: 15 + 'em',
          }}
        >
          Your visa application, without the guesswork.
        </h1>

        <p
          style={{
            margin: '14px 0 26px',
            fontSize: 'clamp(14.5px, 2.4vw, 16.5px)',
            color: 'rgba(255,255,255,0.88)',
            maxWidth: '46ch',
          }}
        >
          Start a case, get your document checklist, and validate what you upload —
          all in one guided flow.
        </p>

        <button
          type="button"
          onClick={onStart}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 9,
            padding: '13px 24px',
            borderRadius: 'var(--me-radius)',
            border: 'none',
            background: '#fff',
            color: 'var(--me-blue-700)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(8, 25, 60, 0.22)',
          }}
        >
          Start my application
          <span aria-hidden>→</span>
        </button>
      </div>

      <div style={{ padding: 'clamp(18px, 4vw, 28px)' }}>
        <div
          style={{
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          }}
        >
          {HIGHLIGHTS.map((item, i) => (
            <div
              key={item.title}
              className="me-animate-in"
              style={{
                animationDelay: `${0.06 * (i + 1)}s`,
                background: 'var(--me-surface-alt)',
                border: '1px solid var(--me-border)',
                borderRadius: 'var(--me-radius)',
                padding: 16,
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 27,
                  height: 27,
                  borderRadius: 8,
                  background: 'var(--me-blue-600)',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 11,
                }}
              >
                {i + 1}
              </div>
              <h3 style={{ margin: '0 0 5px', fontSize: 15 }}>{item.title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--me-text-muted)' }}>{item.body}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge tone="neutral">Guidance only — not legal advice</Badge>
          <Badge tone="neutral">Cases are not saved after a server restart</Badge>
        </div>
      </div>
    </Card>
  );
}
