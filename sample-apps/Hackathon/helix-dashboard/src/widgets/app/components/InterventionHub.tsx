'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterventionLog } from '../data/mockData';
import { Send, Activity, Clock, ShieldAlert, X, AlertTriangle, MessageSquare, Zap } from 'lucide-react';

interface InterventionHubProps {
  interventions: InterventionLog[];
  onDispatchNudge: (target: string, message: string) => void;
}

export const InterventionHub: React.FC<InterventionHubProps> = ({
  interventions,
  onDispatchNudge,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form State
  const [targetUnit, setTargetUnit] = useState<string>('Engineering - SecOps Lead');
  const [nudgeMessage, setNudgeMessage] = useState<string>('');

  const filteredInterventions = interventions.filter(
    (item) => statusFilter === 'All' || item.status === statusFilter
  );

  const getStatusBadge = (status: InterventionLog['status']) => {
    switch (status) {
      case 'Delivered':
        return { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.3)' };
      case 'Acknowledged':
        return { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
      case 'Actioned':
        return { color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Escalated':
        return { color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.15)', border: 'rgba(0, 229, 255, 0.3)' };
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nudgeMessage) return;

    onDispatchNudge(targetUnit, nudgeMessage);
    setNudgeMessage('');
    setIsModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }}>
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="live-pulse" style={{ backgroundColor: '#00E5FF', width: '12px', height: '12px' }} />
            Nudge & Intervention Hub
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#A1A1AA', fontWeight: 500 }}>
            Automated cognitive intervention logs & executive resolution pipeline
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 229, 255, 0.15)',
            color: '#38BDF8',
            border: '1px solid rgba(0, 229, 255, 0.4)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 229, 255, 0.15)',
          }}
        >
          <Zap size={16} />
          Dispatch Direct Nudge
        </motion.button>
      </motion.div>

      {/* Top Intervention Performance Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card" style={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', color: '#A1A1AA', textTransform: 'uppercase', fontWeight: 700 }}>24h Total Nudges</span>
            <MessageSquare size={16} color="#60A5FA" opacity={0.6} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#FFFFFF', marginTop: '8px' }}>
            45 <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>Dispatches</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card" style={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', color: '#A1A1AA', textTransform: 'uppercase', fontWeight: 700 }}>Intervention Success Rate</span>
            <Activity size={16} color="#10B981" opacity={0.6} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10B981', marginTop: '8px' }}>
            91.2% <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>(41 Actioned)</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card" style={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', color: '#A1A1AA', textTransform: 'uppercase', fontWeight: 700 }}>Mean Resolution Time</span>
            <Clock size={16} color="#8B5CF6" opacity={0.6} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#A78BFA', marginTop: '8px' }}>
            1.4 <span style={{ fontSize: '14px', color: '#6B7280', fontWeight: 600 }}>Hours</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="glass-card" style={{ padding: '20px', border: '1px solid rgba(255,68,0,0.2)', backgroundColor: 'rgba(255,68,0,0.02)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '11px', color: '#38BDF8', textTransform: 'uppercase', fontWeight: 700 }}>Active Escalations</span>
            <ShieldAlert size={16} color="#00E5FF" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#00E5FF', marginTop: '8px' }}>
            1 <span style={{ fontSize: '14px', color: '#EF4444', fontWeight: 600, opacity: 0.8 }}>Board Level</span>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#A1A1AA', marginRight: '8px', fontWeight: 600 }}>Status Filter:</span>
          {['All', 'Delivered', 'Acknowledged', 'Actioned', 'Escalated'].map((st) => (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: statusFilter === st ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid transparent',
                backgroundColor: statusFilter === st ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                color: statusFilter === st ? '#38BDF8' : '#9CA3AF',
                fontSize: '12px',
                fontWeight: statusFilter === st ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {st}
            </motion.button>
          ))}
        </div>

        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600 }}>
          Showing {filteredInterventions.length} log entry records
        </span>
      </div>

      {/* Action Logs Feed Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="glass-panel" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'grid',
          gridTemplateColumns: '80px 180px 100px 1fr 120px 110px',
          gap: '16px',
          fontSize: '11px',
          fontWeight: 800,
          color: '#52525B',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          <div>Timestamp</div>
          <div>Target Unit / Lead</div>
          <div>Channel</div>
          <div>Nudge Message Content</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Resolution</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence>
            {filteredInterventions.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '40px', textAlign: 'center', color: '#6B7280', fontSize: '13px', fontWeight: 500 }}>
                No intervention logs match the active filter.
              </motion.div>
            ) : (
              filteredInterventions.map((item, index) => {
                const badge = getStatusBadge(item.status);

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.5) }}
                    key={item.id}
                    style={{
                      padding: '16px 20px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                      display: 'grid',
                      gridTemplateColumns: '80px 180px 100px 1fr 120px 110px',
                      gap: '16px',
                      alignItems: 'center',
                      fontSize: '13px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ color: '#A1A1AA', fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                      {item.timestamp}
                    </div>

                    <div>
                      <div style={{ color: '#FFFFFF', fontWeight: 700 }}>{item.targetUnit}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontWeight: 500 }}>Baseline: {item.baselineCode}</div>
                    </div>

                    <div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#D1D5DB',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}>
                        {item.channel}
                      </span>
                    </div>

                    <div style={{ color: '#D1D5DB', lineHeight: '1.5', fontWeight: 500 }}>
                      {item.nudgeMessage}
                    </div>

                    <div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        display: 'inline-block',
                      }}>
                        {item.status}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#A1A1AA', fontWeight: 600 }}>
                      {item.resolutionTime}
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Dispatch Nudge Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                width: '500px',
                maxWidth: '90vw',
                backgroundColor: 'rgba(5, 5, 5, 0.9)',
                border: '1px solid rgba(0, 229, 255, 0.2)',
                borderRadius: '16px',
                padding: '30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,68,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={20} color="#38BDF8" />
                  Dispatch Direct Nudge
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#A1A1AA', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Target Department / Unit Lead
                  </label>
                  <select
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      marginTop: '8px',
                      outline: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    <option value="Engineering - Marcus Vance">Engineering - Marcus Vance</option>
                    <option value="Product - Elena Rostova">Product - Elena Rostova</option>
                    <option value="Legal - David Chen">Legal - David Chen</option>
                    <option value="Sales - Sarah Jenkins">Sales - Sarah Jenkins</option>
                    <option value="Marketing - Amara Okafor">Marketing - Amara Okafor</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Intervention Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Enter policy reminder or correction guidance to send via automated bot..."
                    value={nudgeMessage}
                    onChange={(e) => setNudgeMessage(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      marginTop: '8px',
                      outline: 'none',
                      resize: 'none',
                      lineHeight: '1.5',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(255,68,0,0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#A1A1AA',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 229, 255, 0.15)',
                      border: '1px solid rgba(0, 229, 255, 0.4)',
                      color: '#38BDF8',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(0, 229, 255, 0.15)',
                    }}
                  >
                    Dispatch Nudge Now <Send size={14} />
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
