'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TelemetrySignal } from '../data/mockData';
import { Zap, Play, Pause, ChevronDown, ChevronUp, Search, MessageSquare, Briefcase, CheckCircle2, ShieldAlert } from 'lucide-react';

interface TelemetryStreamProps {
  signals: TelemetrySignal[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onSimulateSignal: () => void;
  onTriggerNudge?: (deptName: string, baselineTitle: string) => void;
  onShowToast?: (msg: string) => void;
}

export const TelemetryStream: React.FC<TelemetryStreamProps> = ({
  signals,
  isStreaming,
  onToggleStreaming,
  onSimulateSignal,
  onTriggerNudge,
  onShowToast,
}) => {
  const [selectedSource, setSelectedSource] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSignalId, setExpandedSignalId] = useState<string | null>(signals[0]?.id || null);

  const filteredSignals = signals.filter((s) => {
    if (selectedSource !== 'All' && s.source !== selectedSource) return false;
    if (selectedSeverity !== 'All' && s.severity !== selectedSeverity) return false;
    if (selectedDept !== 'All' && s.department !== selectedDept) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.payloadPreview.toLowerCase().includes(q) ||
        s.fullRawMessage.toLowerCase().includes(q) ||
        s.matchedBaselineTitle.toLowerCase().includes(q) ||
        s.sender.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'High':
        return { color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.15)', border: 'rgba(0, 229, 255, 0.3)' };
      case 'Med':
        return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
      default:
        return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Slack':
        return (
          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(224, 30, 90, 0.15)', color: '#EC4899', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={12} />
            Slack
          </span>
        );
      case 'Teams':
        return (
          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(98, 100, 167, 0.2)', color: '#A5B4FC', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MessageSquare size={12} />
            Teams
          </span>
        );
      case 'Jira':
        return (
          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(0, 82, 204, 0.2)', color: '#60A5FA', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Briefcase size={12} />
            Jira
          </span>
        );
      case 'Confluence':
        return (
          <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'rgba(38, 132, 255, 0.2)', color: '#38BDF8', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Briefcase size={12} />
            Confluence
          </span>
        );
      default:
        return <span style={{ fontSize: '10px', fontWeight: 800 }}>{source}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Header & Controls */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="live-pulse" style={{ backgroundColor: '#10B981', width: '12px', height: '12px' }} />
            Live Telemetry Stream
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A1A1AA', fontWeight: 500 }}>
            Real-time ingestion feed & divergence evaluation engine
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSimulateSignal}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              color: '#38BDF8',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Zap size={14} /> Inject Signal
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleStreaming}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              backgroundColor: isStreaming ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
              border: `1px solid ${isStreaming ? 'rgba(16, 185, 129, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`,
              color: isStreaming ? '#34D399' : '#FDBA74',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
            {isStreaming ? 'Streaming Live' : 'Stream Paused'}
          </motion.button>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel" 
        style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', flex: 1 }}>
          <input
            type="text"
            placeholder="Filter by raw text, baseline, or sender..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '13px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(0, 229, 255, 0.5)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
          <Search size={16} color="#A1A1AA" style={{ position: 'absolute', left: '12px', top: '10px' }} />
        </div>

        {/* Source Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>Source:</span>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="neon-select"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <option value="All">All Sources</option>
            <option value="Slack">Slack</option>
            <option value="Teams">Teams</option>
            <option value="Jira">Jira</option>
            <option value="Confluence">Confluence</option>
          </select>
        </div>

        {/* Severity Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>Severity:</span>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <option value="All">All Severities</option>
            <option value="High">High Drift</option>
            <option value="Med">Med Drift</option>
            <option value="Low">Low Drift</option>
          </select>
        </div>

        {/* Department Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#FFFFFF',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <option value="All">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product">Product</option>
            <option value="Sales">Sales</option>
            <option value="Marketing">Marketing</option>
            <option value="Legal & Risk">Legal & Risk</option>
          </select>
        </div>
      </motion.div>

      {/* Main Stream Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel" 
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          display: 'grid',
          gridTemplateColumns: '80px 110px 120px 1fr 180px 120px 90px',
          gap: '16px',
          fontSize: '11px',
          fontWeight: 800,
          color: '#52525B',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          <div>Timestamp</div>
          <div>Source</div>
          <div>Department</div>
          <div>Payload Preview</div>
          <div>Matched Baseline</div>
          <div>Drift Score</div>
          <div style={{ textAlign: 'right' }}>Actions</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence>
            {filteredSignals.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '13px', fontWeight: 500 }}
              >
                No telemetry signals match the active filters.
              </motion.div>
            ) : (
              filteredSignals.map((signal, index) => {
                const isExpanded = expandedSignalId === signal.id;
                const severityStyle = getSeverityStyle(signal.severity);

                return (
                  <motion.div 
                    key={signal.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      backgroundColor: isExpanded ? 'rgba(0, 229, 255, 0.05)' : 'transparent',
                    }}
                  >
                    <div
                      onClick={() => setExpandedSignalId(isExpanded ? null : signal.id)}
                      style={{
                        padding: '16px 20px',
                        display: 'grid',
                        gridTemplateColumns: '80px 110px 120px 1fr 180px 120px 90px',
                        gap: '16px',
                        alignItems: 'center',
                        fontSize: '13px',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
                      }}
                      onMouseOut={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div style={{ color: '#A1A1AA', fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                        {signal.timestamp}
                      </div>

                      <div>{getSourceIcon(signal.source)}</div>

                      <div style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        {signal.department}
                      </div>

                      <div style={{ color: '#D1D5DB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {signal.payloadPreview}
                      </div>

                      <div style={{ color: '#A5B4FC', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                        {signal.matchedBaselineTitle}
                      </div>

                      <div>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          backgroundColor: severityStyle.bg,
                          color: severityStyle.color,
                          border: `1px solid ${severityStyle.border}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {severityStyle.color === '#00E5FF' ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />}
                          {signal.driftScore.toFixed(2)} ({signal.severity})
                        </span>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <motion.button 
                          whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontWeight: 600
                          }}
                        >
                          {isExpanded ? 'Close' : 'Detail'}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </motion.button>
                      </div>
                    </div>

                    {/* Expanded Row Detail - Side by Side LLM Divergence Inspector */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            padding: '24px',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderTop: '1px solid rgba(0, 229, 255, 0.1)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '24px',
                          }}>
                            {/* Left: Raw Signal Payload */}
                            <div style={{
                              padding: '20px',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(5, 5, 5, 0.6)',
                              border: '1px solid rgba(255, 255, 255, 0.05)',
                              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  Raw Message Payload ({signal.channelOrTicket})
                                </span>
                                <span style={{ fontSize: '11px', color: '#52525B', fontFamily: 'monospace', fontWeight: 600 }}>
                                  Sender: {signal.sender}
                                </span>
                              </div>
                              <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#FFFFFF',
                                lineHeight: '1.6',
                                fontFamily: 'monospace',
                                whiteSpace: 'pre-wrap',
                                backgroundColor: 'rgba(0,0,0,0.8)',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                              }}>
                                {signal.fullRawMessage}
                              </p>

                              <div style={{ marginTop: '16px' }}>
                                <span style={{ fontSize: '11px', color: '#52525B', textTransform: 'uppercase', fontWeight: 700 }}>Parsed Metadata JSON</span>
                                <pre className="mono" style={{
                                  margin: '6px 0 0 0',
                                  fontSize: '12px',
                                  color: '#10B981',
                                  backgroundColor: 'rgba(0,0,0,0.8)',
                                  padding: '12px',
                                  borderRadius: '8px',
                                  maxHeight: '140px',
                                  overflowY: 'auto',
                                  border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                  {JSON.stringify(signal.rawJson, null, 2)}
                                </pre>
                              </div>
                            </div>

                            {/* Right: LLM Divergence Evaluation & Baseline Match */}
                            <div style={{
                              padding: '20px',
                              borderRadius: '12px',
                              backgroundColor: 'rgba(5, 5, 5, 0.6)',
                              border: '1px solid rgba(0, 229, 255, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxShadow: 'inset 0 0 30px rgba(255,68,0,0.05)',
                            }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#A5B4FC', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Matched Strategic Policy Baseline
                                  </span>
                                  <span style={{ fontSize: '11px', fontWeight: 800, color: severityStyle.color }}>
                                    Drift Score: {signal.driftScore.toFixed(2)}
                                  </span>
                                </div>

                                <div style={{
                                  padding: '12px 16px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                  fontSize: '14px',
                                  fontWeight: 700,
                                  color: '#FFFFFF',
                                  marginBottom: '16px',
                                }}>
                                  {signal.matchedBaselineTitle}
                                </div>

                                <span style={{ fontSize: '11px', fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  LLM Cognitive Divergence Reasoning
                                </span>
                                <p style={{
                                  margin: '8px 0 0 0',
                                  fontSize: '13px',
                                  color: '#D1D5DB',
                                  lineHeight: '1.6',
                                  backgroundColor: severityStyle.bg,
                                  borderLeft: `3px solid ${severityStyle.color}`,
                                  padding: '12px 16px',
                                  borderRadius: '0 8px 8px 0',
                                  fontWeight: 500
                                }}>
                                  {signal.llmReasoning}
                                </p>
                              </div>

                              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => {
                                    if (onTriggerNudge && onShowToast) {
                                      onTriggerNudge(signal.department, `[ALERT] Automated Nudge sent to sender: Policy violation detected.`);
                                      onShowToast(`[SUCCESS] Slack Nudge Sent via Webhook`);
                                    }
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(0, 229, 255, 0.15)',
                                    color: '#38BDF8',
                                    border: '1px solid rgba(0, 229, 255, 0.4)',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: '6px'
                                  }}
                                >
                                  <Zap size={14} /> Dispatch Intervention
                                </motion.button>
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  style={{
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#A1A1AA',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Dismiss
                                </motion.button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
