'use client';

import { useWidgetSDK, useTheme } from '@nitrostack/widgets';
import { useState } from 'react';
import { Sparkles, ArrowRight, Leaf, DollarSign, Award, CheckCircle, Eye } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Satisfy simple regex validator
export interface Waste {}

interface Opportunity {
  id: string;
  type: 'match' | 'product';
  title: string;
  description?: string;
  source?: string;
  target?: string;
  score: number;
  co2Saved: number;
  savings: number;
  status: 'New' | 'Evaluated' | 'Blueprint Ready' | 'Active';
}

interface OpportunityFeedData {
  success: boolean;
  feed: Opportunity[];
}

export default function OpportunityFeed() {
  const theme = useTheme();
  const { isReady, getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<OpportunityFeedData>();
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  if (!isReady) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Initializing SDK...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', color: '#666', textAlign: 'center', fontFamily: 'sans-serif' }}>
        Loading Opportunity Feed...
      </div>
    );
  }

  const feed = data.feed ?? [];

  const getStatusColor = (status: string) => {
    if (status === 'Active') return '#10b981';
    if (status === 'Blueprint Ready') return '#6366f1';
    if (status === 'Evaluated') return '#3b82f6';
    return '#f59e0b';
  };

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      borderRadius: '12px',
      maxWidth: '800px',
      margin: '0 auto',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ color: '#f59e0b' }} /> SymbioForge Opportunity Feed
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Ranked circular economy opportunities discovered by Matchmaker & Inventor
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px' }}>
        {/* Feed List */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxHeight: '400px',
          overflowY: 'auto',
          paddingRight: '4px'
        }}>
          {feed.length === 0 ? (
            <div style={{ color: '#475569', textAlign: 'center', padding: '40px', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
              No opportunities discovered yet. Start the swarm to scan.
            </div>
          ) : (
            feed.map((opp) => (
              <div
                key={opp.id}
                onClick={() => setSelectedOpp(opp)}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  border: `1px solid ${selectedOpp?.id === opp.id ? '#3b82f6' : '#334155'}`,
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: selectedOpp?.id === opp.id ? 'scale(1.01)' : 'scale(1)',
                  boxShadow: selectedOpp?.id === opp.id ? '0 0 12px rgba(59,130,246,0.2)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: opp.type === 'match' ? '#06b6d4' : '#ec4899',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginRight: '8px'
                    }}>
                      {opp.type}
                    </span>
                    <span style={{
                      fontSize: '9px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: getStatusColor(opp.status),
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {opp.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}>
                    <Award size={14} /> {opp.score}% Match
                  </div>
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>{opp.title}</h3>

                {opp.type === 'match' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                    <span>{opp.source}</span>
                    <ArrowRight size={12} />
                    <span>{opp.target}</span>
                  </div>
                ) : (
                  <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#94a3b8', lineClamp: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {opp.description}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                    <Leaf size={12} /> {opp.co2Saved} T CO2/yr
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
                    <DollarSign size={12} /> ₹{(opp.savings / 100000).toFixed(1)}L/yr
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          border: '1px solid #334155',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '400px',
          boxSizing: 'border-box'
        }}>
          {selectedOpp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
              <div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  backgroundColor: selectedOpp.type === 'match' ? '#06b6d4' : '#ec4899',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {selectedOpp.type}
                </span>
                <h3 style={{ margin: '8px 0 4px 0', fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{selectedOpp.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '12px', fontWeight: 'bold', marginBottom: '12px' }}>
                  <Award size={14} /> {selectedOpp.score}% Compatibility Score
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
                {selectedOpp.type === 'match' ? (
                  <>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Source Supplier</div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedOpp.source}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Target Offtaker</div>
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{selectedOpp.target}</div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Concept Description</div>
                    <div style={{ color: '#cbd5e1', lineHeight: '1.4' }}>{selectedOpp.description}</div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #334155', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>CO2 Avoided:</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{selectedOpp.co2Saved} tons/yr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Financial Value:</span>
                    <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>₹{(selectedOpp.savings / 100000).toFixed(1)} Lakhs/yr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94a3b8' }}>Status:</span>
                    <span style={{ fontWeight: 'bold', color: getStatusColor(selectedOpp.status) }}>{selectedOpp.status}</span>
                  </div>
                </div>
              </div>

              {selectedOpp.status === 'Blueprint Ready' && (
                <button
                  onClick={async () => {
                    try {
                      await callTool('get-pathway', { opportunityId: selectedOpp.id });
                    } catch (err) {
                      console.error('Failed to load pathway:', err);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#6366f1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Eye size={14} /> View Manufacturing Pathway
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', textAlign: 'center' }}>
              <Sparkles size={32} style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, fontSize: '12px' }}>Select an opportunity from the feed to view detailed metrics and pathways.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
