'use client';

import React from 'react';
import {
  colors,
  confidenceColor,
  fadeKeyframes,
  sectionTitle,
  space,
  surface,
} from './ui';

interface ConfidenceGaugeProps {
  confidence: number;
  isDark: boolean;
}

function certaintyLabel(score: number) {
  if (score >= 80) return 'HIGH CERTAINTY';
  if (score >= 50) return 'MODERATE CERTAINTY';
  return 'LOW CERTAINTY';
}

export function ConfidenceGauge({ confidence, isDark }: ConfidenceGaugeProps) {
  const score = Math.max(0, Math.min(100, Number.isFinite(confidence) ? confidence : 0));
  const strokeColor = confidenceColor(score);
  const label = certaintyLabel(score);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <article
      aria-label={`Confidence gauge ${score} percent`}
      style={{
        ...surface(isDark),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        height: '100%',
        minHeight: 240,
      }}
    >
      <style>{fadeKeyframes}</style>
      <h3 style={{ ...sectionTitle(), width: '100%', justifyContent: 'flex-start' }}>
        <span aria-hidden="true">🎯</span> Confidence Gauge
      </h3>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 160,
            height: 160,
            margin: '0 auto',
          }}
        >
          <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-hidden="true">
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={isDark ? colors.slate600 : '#e2e8f0'}
              strokeWidth="12"
              fill="transparent"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke={strokeColor}
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 900ms ease-in-out' }}
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: 32, fontWeight: 800, color: strokeColor, lineHeight: 1 }}>
              {score}%
            </span>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.5px',
                opacity: 0.8,
                marginTop: space.xs,
              }}
            >
              {label}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
