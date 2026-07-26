'use client';

import React, { useState } from 'react';
import { StrategicBaseline } from '../data/mockData';

interface GenomeStudioProps {
  baselines: StrategicBaseline[];
  onAddBaseline: (newBaseline: Omit<StrategicBaseline, 'id' | 'createdDate'>) => void;
}

export const GenomeStudio: React.FC<GenomeStudioProps> = ({
  baselines,
  onAddBaseline,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(baselines[0]?.id || null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State for Add Objective Modal
  const [title, setTitle] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [category, setCategory] = useState<StrategicBaseline['category']>('Security & Compliance');
  const [description, setDescription] = useState<string>('');
  const [toleranceThreshold, setToleranceThreshold] = useState<number>(0.20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    onAddBaseline({
      code: code.toUpperCase() || 'OKR-99',
      title,
      category,
      description,
      toleranceThreshold,
      activeMonitorsCount: 1,
      alignedCount: 1,
      driftedCount: 0,
      status: 'Active',
    });

    // Reset & Close
    setTitle('');
    setCode('');
    setDescription('');
    setToleranceThreshold(0.20);
    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#FFFFFF' }}>
            Genome Management Studio
          </h2>
          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9CA3AF' }}>
            Define, calibrate, and enforce enterprise strategic baselines & OKR policies
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            backgroundColor: '#6366F1',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Strategic Objective
        </button>
      </div>

      {/* Strategic Baselines Accordion List */}
      <div className="glass-panel" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {baselines.map((base) => {
            const isExpanded = expandedId === base.id;

            return (
              <div
                key={base.id}
                style={{
                  borderRadius: '10px',
                  backgroundColor: isExpanded ? 'rgba(22, 27, 38, 0.9)' : 'rgba(22, 27, 38, 0.5)',
                  border: isExpanded ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Accordion Header Bar */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : base.id)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(99, 102, 241, 0.15)',
                      color: '#818CF8',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                    }}>
                      {base.code}
                    </span>

                    <div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#FFFFFF' }}>
                        {base.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{base.category}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: '#6B7280', display: 'block' }}>Tolerance Cap</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#34D399' }}>
                        ±{(base.toleranceThreshold * 100).toFixed(0)}%
                      </span>
                    </div>

                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: base.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: base.status === 'Active' ? '#10B981' : '#F59E0B',
                    }}>
                      {base.status}
                    </span>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>

                {/* Accordion Body Content */}
                {isExpanded && (
                  <div style={{
                    padding: '0 20px 20px 20px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    marginTop: '8px',
                    paddingTop: '16px',
                  }}>
                    <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#D1D5DB', lineHeight: '1.5' }}>
                      {base.description}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0E131F', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Active Telemetry Monitors</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                          {base.activeMonitorsCount} Channels
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0E131F', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Aligned Transmissions</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981', marginTop: '2px' }}>
                          {base.alignedCount} Signals
                        </div>
                      </div>

                      <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0E131F', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <span style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Flagged Drift Signals</span>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#EF4444', marginTop: '2px' }}>
                          {base.driftedCount} Signals
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#D1D5DB',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}>
                        Calibrate Variance Threshold
                      </button>
                      <button style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: '#A5B4FC',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}>
                        View Matched Signals
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Objective Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '500px',
            maxWidth: '90vw',
            backgroundColor: '#161B26',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>
                Add Strategic Baseline Objective
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Baseline Code / ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. SEC-05 or OKR-12"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0E131F',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Objective Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SOC2 Pre-Release Audit Policy"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0E131F',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Objective Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0E131F',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                >
                  <option value="Security & Compliance">Security & Compliance</option>
                  <option value="Pricing & SLA Governance">Pricing & SLA Governance</option>
                  <option value="Legal & Risk Control">Legal & Risk Control</option>
                  <option value="Brand & Market Claims">Brand & Market Claims</option>
                  <option value="Product Architecture">Product Architecture</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                  Policy Description & Rules *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify exact operational constraints and policy boundaries..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    backgroundColor: '#0E131F',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    marginTop: '4px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Variance Tolerance Threshold Slider (0.1 to 0.5) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
                    Variance Tolerance Threshold
                  </label>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#6366F1' }}>
                    ±{toleranceThreshold.toFixed(2)} ({(toleranceThreshold * 100).toFixed(0)}%)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.50"
                  step="0.05"
                  value={toleranceThreshold}
                  onChange={(e) => setToleranceThreshold(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    marginTop: '8px',
                    accentColor: '#6366F1',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                  <span>0.10 (Strict)</span>
                  <span>0.30 (Balanced)</span>
                  <span>0.50 (Permissive)</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#9CA3AF',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    backgroundColor: '#6366F1',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  Save Strategic Objective
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
