'use client';

import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { useState } from 'react';

export const dynamic = 'force-dynamic';

interface FinancialMetrics {
  revenue: string;
  netIncome: string;
  operatingCashFlow: string;
}

interface FinancialStatementsData {
  ticker: string;
  statementType: string;
  period: string;
  metrics: FinancialMetrics;
  status: string;
}

/**
 * Main Financial Dashboard Widget
 */
export default function FinancialDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<FinancialStatementsData>();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  if (!isReady) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'rgba(226, 232, 240, 0.6)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '14px' }}>Initializing dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        color: 'rgba(226, 232, 240, 0.6)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ fontSize: '14px' }}>Loading financial data...</div>
      </div>
    );
  }

  // Safely extract metrics with fallbacks
  const metrics = data.metrics || {};
  const revenue = metrics.revenue || '—';
  const netIncome = metrics.netIncome || '—';
  const operatingCashFlow = metrics.operatingCashFlow || '—';

  // Metric card configurations with unique accent colors and gradients
  const metricCards = [
    {
      label: 'Revenue',
      value: revenue,
      icon: '📈',
      accentColor: '16, 185, 129', // emerald
      accentGradient: 'linear-gradient(90deg, rgb(16, 185, 129), rgb(34, 197, 94))',
    },
    {
      label: 'Net Income',
      value: netIncome,
      icon: '💰',
      accentColor: '59, 130, 246', // blue
      accentGradient: 'linear-gradient(90deg, rgb(59, 130, 246), rgb(99, 102, 241))',
    },
    {
      label: 'Operating Cash Flow',
      value: operatingCashFlow,
      icon: '💵',
      accentColor: '139, 92, 246', // violet
      accentGradient: 'linear-gradient(90deg, rgb(139, 92, 246), rgb(168, 85, 247))',
    },
  ];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 100%)',
      minHeight: '100vh',
      padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'rgb(226, 232, 240)',
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '40px',
        maxWidth: '1200px',
        margin: '0 auto 40px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '16px',
          marginBottom: '8px',
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: 0,
            color: 'rgb(226, 232, 240)',
            letterSpacing: '-0.5px',
          }}>
            Financial Dashboard
          </h1>
          <span style={{
            fontSize: '14px',
            color: 'rgba(226, 232, 240, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600',
          }}>
            {data.ticker}
          </span>
        </div>
        <p style={{
          fontSize: '14px',
          color: 'rgba(226, 232, 240, 0.6)',
          margin: '0',
          textTransform: 'capitalize',
        }}>
          {data.period} {data.statementType.replace(/_/g, ' ')}
        </p>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '24px',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {metricCards.map((card, idx) => {
          const isHovered = hoveredCard === idx;
          const isNegative = card.value.startsWith('-');

          return (
            <div
              key={idx}
              style={{
                background: isHovered ? 'rgba(15, 23, 42, 0.8)' : 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(12px)',
                border: isHovered ? `1px solid rgba(${card.accentColor}, 0.3)` : '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '16px',
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered ? `0 20px 40px rgba(${card.accentColor}, 0.15)` : 'none',
              }}
              onMouseEnter={() => setHoveredCard(idx)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Gradient accent bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: card.accentGradient,
              }} />

              {/* Icon and Label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  fontSize: '28px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `rgba(${card.accentColor}, 0.1)`,
                  borderRadius: '12px',
                  border: `1px solid rgba(${card.accentColor}, 0.2)`,
                }}>
                  {card.icon}
                </div>
                <div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(226, 232, 240, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontWeight: '600',
                  }}>
                    {card.label}
                  </div>
                </div>
              </div>

              {/* Value */}
              <div style={{
                fontSize: '32px',
                fontWeight: '700',
                color: isNegative ? 'rgb(239, 68, 68)' : 'rgb(226, 232, 240)',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                marginBottom: '8px',
                letterSpacing: '-0.5px',
              }}>
                {card.value}
              </div>

              {/* Subtle accent line */}
              <div style={{
                height: '1px',
                background: `linear-gradient(90deg, rgba(${card.accentColor}, 0.3), transparent)`,
                marginTop: '12px',
              }} />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '48px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'rgba(226, 232, 240, 0.4)',
        maxWidth: '1200px',
        margin: '48px auto 0',
      }}>
        <p style={{ margin: 0 }}>
          ✨ Powered by NitroStack Financial Dashboard
        </p>
      </div>
    </div>
  );
}
