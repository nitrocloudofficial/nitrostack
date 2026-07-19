'use client';

import React, { useState } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

export const dynamic = 'force-dynamic';

interface MemoData {
  ticker: string;
  timestamp: number;
  liquidity: {
    score: number;
    slippagePercent: number;
    depthSummary: string;
  };
  toxicity: {
    vpin: number;
    status: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  spoofing: {
    detected: boolean;
    direction: 'BUY' | 'SELL' | 'NONE';
    details: string;
  };
  volatility: {
    volatility: number;
  };
  risk: {
    var95: number;
    expectedShortfall: number;
    riskApproved: boolean;
    comments: string;
  };
  news: {
    sentimentScore: number;
    breakdown: {
      bullish: number;
      bearish: number;
      neutral: number;
    };
  };
  recommendation: 'WAIT' | 'TWAP' | 'VWAP' | 'ICEBERG' | 'MARKET';
  confidence: number;
  reasoning: string;
}

export default function QuantGuardDashboard() {
  const theme = useTheme();
  const { isReady, getToolOutput } = useWidgetSDK();
  const data = getToolOutput<MemoData>();
  
  const [activeTab, setActiveTab] = useState<'rec' | 'market' | 'orderbook' | 'vpin' | 'spoofing' | 'risk'>('rec');

  if (!isReady || !data) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        background: '#0a0d14',
        color: '#8f9cae',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        border: '1px solid #1e293b',
        borderRadius: '12px'
      }}>
        <div style={{
          border: '4px solid #1e293b',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }} />
        <div style={{ fontSize: '16px', fontWeight: '500' }}>Aggregating Microstructure Intelligence...</div>
        <div style={{ fontSize: '13px', opacity: 0.6, marginTop: '8px' }}>Orchestrating Specialist Agents</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const isDark = theme === 'dark';
  
  // Design Tokens (Sleek Dark Theme)
  const dashboardBg = '#0b0f19';
  const panelBg = 'rgba(17, 24, 39, 0.7)';
  const borderCol = '#1f2937';
  const textPrimary = '#f3f4f6';
  const textSecondary = '#9ca3af';
  
  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'WAIT': return '#ef4444'; // Red
      case 'TWAP': return '#eab308'; // Amber
      case 'VWAP': return '#3b82f6'; // Blue
      case 'ICEBERG': return '#a855f7'; // Purple
      case 'MARKET': return '#10b981'; // Green
      default: return '#6b7280';
    }
  };

  const recColor = getRecommendationColor(data.recommendation);

  return (
    <div style={{
      background: dashboardBg,
      color: textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
      borderRadius: '16px',
      border: `1px solid ${borderCol}`,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'between',
        alignItems: 'center',
        borderBottom: `1px solid ${borderCol}`,
        paddingBottom: '16px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, tracking: '-0.025em', background: 'linear-gradient(to right, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              QuantGuard MCP Dashboard
            </h1>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: textSecondary }}>
            Active Monitoring: <strong style={{ color: textPrimary }}>{data.ticker}</strong> | Account: <strong style={{ color: textPrimary }}>ACCT-INST-01</strong>
          </p>
        </div>

        {/* Global summary badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: 'rgba(31, 41, 55, 0.5)',
          padding: '8px 16px',
          borderRadius: '10px',
          border: `1px solid ${borderCol}`,
          marginLeft: 'auto'
        }}>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>Decision</div>
            <div style={{ color: recColor, fontWeight: 'bold', fontSize: '15px' }}>{data.recommendation}</div>
          </div>
          <div style={{ width: '1px', height: '24px', background: borderCol }} />
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', opacity: 0.6 }}>Confidence</div>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#60a5fa' }}>{(data.confidence * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{
        display: 'flex',
        gap: '4px',
        background: '#111827',
        padding: '4px',
        borderRadius: '10px',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'rec', label: '📋 Recommendation', title: 'Strategy Memo' },
          { id: 'market', label: '📈 Market Overview', title: 'Quotes & Volatility' },
          { id: 'orderbook', label: '📊 Order Book Heatmap', title: 'Bids & Asks' },
          { id: 'vpin', label: '☣️ Toxicity (VPIN)', title: 'Flow Toxicity' },
          { id: 'spoofing', label: '🛑 Spoofing Panel', title: 'Manipulation Detection' },
          { id: 'risk', label: '⚡ Risk Profile', title: 'VaR & Exposure' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: '600',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: activeTab === tab.id ? '#1e293b' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : textSecondary,
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div style={{ minHeight: '350px' }}>
        {/* Panel 1: Recommendation / Memo (Live Demo Landing) */}
        {activeTab === 'rec' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
            <div style={{ background: panelBg, padding: '24px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>Chief Strategy Agent — Executive Memo</h3>
                <span style={{ fontSize: '11px', opacity: 0.5 }}>{new Date(data.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#e5e7eb',
                whiteSpace: 'pre-wrap',
                background: '#090d16',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #111827'
              }}>
                {data.reasoning}
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}`, textAlign: 'center' }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '8px' }}>Action Recommendation</div>
                <div style={{
                  background: `${recColor}15`,
                  color: recColor,
                  border: `1px solid ${recColor}40`,
                  padding: '12px',
                  borderRadius: '10px',
                  fontSize: '24px',
                  fontWeight: '900',
                  letterSpacing: '0.05em',
                  marginBottom: '12px'
                }}>
                  {data.recommendation}
                </div>
                <div style={{ fontSize: '12px', color: textSecondary }}>
                  {data.recommendation === 'WAIT' ? '🛑 Stop all trade executions immediately' : '✅ Safe to execute trade orders'}
                </div>
              </div>

              <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 'bold' }}>Agent Summary Check</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ opacity: 0.7 }}>Risk Agent</span>
                    <span style={{ color: data.risk.riskApproved ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                      {data.risk.riskApproved ? 'Approved' : 'Rejected'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ opacity: 0.7 }}>Toxicity Agent</span>
                    <span style={{ color: data.toxicity.status === 'HIGH' ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                      {data.toxicity.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ opacity: 0.7 }}>Spoofing Agent</span>
                    <span style={{ color: data.spoofing.detected ? '#ef4444' : '#10b981', fontWeight: '600' }}>
                      {data.spoofing.detected ? 'Active Wall' : 'No Wall'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Market Overview */}
        {activeTab === 'market' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>Real-time Quote Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.6 }}>Symbol</span>
                  <span style={{ fontWeight: 'bold' }}>{data.ticker}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.6 }}>Bid-Ask Spread</span>
                  <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{data.liquidity.slippagePercent * 8} bps</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.6 }}>Daily Volatility</span>
                  <span style={{ fontWeight: 'bold' }}>{(data.volatility.volatility * 100).toFixed(4)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                  <span style={{ opacity: 0.6 }}>Liquidity Score</span>
                  <span style={{ fontWeight: 'bold', color: '#10b981' }}>{data.liquidity.score} / 100</span>
                </div>
              </div>
            </div>

            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>Realized Volatility Engine</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '32px' }}>📊</div>
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.6 }}>Standard Deviation (1d)</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#60a5fa' }}>{data.volatility.volatility.toFixed(6)}</div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: textSecondary, lineHeight: '1.5' }}>
                The Volatility Agent monitors high-frequency price standard deviation. Standard deviation above 0.03 (3% price movement variance) triggers risk containment, forcing executions to use TWAP over wider horizons.
              </p>
            </div>
          </div>
        )}

        {/* Panel 3: Order Book Heatmap */}
        {activeTab === 'orderbook' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>🔴 Sell Side (Asks)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5, marginBottom: '4px' }}>
                  <span>Price</span>
                  <span>Size</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.15)', padding: '4px 8px', borderRadius: '4px' }}>
                  <span style={{ color: '#f87171' }}>Best Ask</span>
                  <span>{(data.liquidity.score * 1.5).toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.08)', padding: '4px 8px', borderRadius: '4px' }}>
                  <span>Ask Level 2</span>
                  <span>{(data.liquidity.score * 1.8).toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.04)', padding: '4px 8px', borderRadius: '4px' }}>
                  <span>Ask Level 3</span>
                  <span>{(data.liquidity.score * 2.2).toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold', color: '#10b981' }}>🟢 Buy Side (Bids)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'monospace', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5, marginBottom: '4px' }}>
                  <span>Price</span>
                  <span>Size</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.15)', padding: '4px 8px', borderRadius: '4px' }}>
                  <span style={{ color: '#34d399' }}>Best Bid</span>
                  <span>{(data.liquidity.score * 1.4).toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.08)', padding: '4px 8px', borderRadius: '4px' }}>
                  <span>Bid Level 2</span>
                  <span>{(data.liquidity.score * 1.6).toFixed(1)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(16, 185, 129, 0.04)', padding: '4px 8px', borderRadius: '4px' }}>
                  <span>Bid Level 3</span>
                  <span>{(data.liquidity.score * 2.0).toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Panel 4: Order Flow Toxicity (VPIN) */}
        {activeTab === 'vpin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}`, textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>VPIN Toxicity</h3>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: `8px solid ${data.toxicity.status === 'HIGH' ? '#ef4444' : '#10b981'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
                fontSize: '22px',
                fontWeight: 'bold'
              }}>
                {data.toxicity.vpin}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: data.toxicity.status === 'HIGH' ? '#ef4444' : '#10b981' }}>
                {data.toxicity.status} TOXICITY
              </div>
            </div>

            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold' }}>Volume-Synchronized Probability of Toxicity</h3>
              <p style={{ fontSize: '13px', color: textSecondary, lineHeight: '1.6' }}>
                VPIN measures the imbalance between buy-initiated and sell-initiated trades synchronized over equal-volume buckets.
              </p>
              <div style={{ padding: '12px', background: '#090d16', borderRadius: '8px', border: '1px solid #111827', fontSize: '13px' }}>
                <strong>Current flow state:</strong> {data.toxicity.status === 'HIGH' 
                  ? 'Informed traders represent a major portion of the flow. Executing market orders will suffer heavy adverse selection.' 
                  : 'Flow is balanced. No toxic order flow imbalance detected.'}
              </div>
            </div>
          </div>
        )}

        {/* Panel 5: Spoofing Panel */}
        {activeTab === 'spoofing' && (
          <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                fontSize: '40px',
                animation: data.spoofing.detected ? 'pulse 1s infinite' : 'none'
              }}>
                {data.spoofing.detected ? '🚨' : '🛡️'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: data.spoofing.detected ? '#ef4444' : '#10b981' }}>
                  {data.spoofing.detected ? 'Spoofing Wall Detected' : 'No Active Spoof Wall'}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: textSecondary }}>
                  Monitoring resting orders for rapid insert-and-cancels
                </p>
              </div>
            </div>

            <div style={{ padding: '16px', background: '#090d16', borderRadius: '8px', border: '1px solid #111827', fontSize: '13px', lineHeight: '1.6' }}>
              <strong>Details:</strong> {data.spoofing.details}
            </div>
            
            {data.spoofing.detected && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid #ef4444',
                fontSize: '12px',
                color: '#ef4444'
              }}>
                ⚠️ <strong>Desk Alert:</strong> Market makers might be spoofing order book depth to run stop-losses. Execution has switched to WAIT to protect capital.
              </div>
            )}
          </div>
        )}

        {/* Panel 6: Risk Panel */}
        {activeTab === 'risk' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 'bold' }}>Institutional Risk Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.6 }}>Value-at-Risk (VaR 95%)</span>
                  <span style={{ fontWeight: 'bold', color: '#f87171' }}>${(data.risk.var95 ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.6 }}>Expected Shortfall (CVaR)</span>
                  <span style={{ fontWeight: 'bold', color: '#ef4444' }}>${(data.risk.expectedShortfall ?? 0).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1f2937', paddingBottom: '8px' }}>
                  <span style={{ opacity: 0.6 }}>Max Historical Drawdown</span>
                  <span style={{ fontWeight: 'bold' }}>{(data.risk.portfolioDrawdown ?? 0).toFixed(2)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ opacity: 0.6 }}>Proposed Risk Pre-Approval</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: data.risk.riskApproved ? '#10b981' : '#ef4444'
                  }}>
                    {data.risk.riskApproved ? 'APPROVED' : 'REJECTED'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ background: panelBg, padding: '20px', borderRadius: '12px', border: `1px solid ${borderCol}` }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 'bold' }}>Risk Desk Assessment</h3>
              <div style={{ padding: '16px', background: '#090d16', borderRadius: '8px', border: '1px solid #111827', fontSize: '13px', lineHeight: '1.6' }}>
                {data.risk.comments}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: `1px solid ${borderCol}`,
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        opacity: 0.5
      }}>
        <span>System Version: 1.0.0</span>
        <span>Last Microstructure Refresh: {new Date(data.timestamp).toLocaleString()}</span>
      </div>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
