'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { DepartmentDrift } from '../data/mockData';
import { Search } from 'lucide-react';

interface HeatmapMatrixProps {
  departments: DepartmentDrift[];
  onInspectDepartment: (dept: DepartmentDrift) => void;
}

export const HeatmapMatrix: React.FC<HeatmapMatrixProps> = ({
  departments,
  onInspectDepartment,
}) => {
  const getStatusBadge = (status: DepartmentDrift['status']) => {
    switch (status) {
      case 'aligned':
        return { label: 'ALIGNED', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'moderate':
        return { label: 'MODERATE DRIFT', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' };
      case 'severe':
        return { label: 'SEVERE DRIFT', color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.15)', border: 'rgba(0, 229, 255, 0.4)' };
      default:
        return { label: 'UNKNOWN', color: '#A1A1AA', bg: 'rgba(161, 161, 170, 0.12)', border: 'rgba(161, 161, 170, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', flex: 1, alignContent: 'start' }}>
      {departments.map((dept, index) => {
        const badge = getStatusBadge(dept.status);
        const driftPercentage = Math.round(dept.driftScore * 100);

        return (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
            whileHover={{ y: -5, boxShadow: `0 12px 24px -10px rgba(0,0,0,0.9), 0 0 15px ${badge.color}30` }}
            className="glass-card"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {/* Dynamic Status Glow */}
            <div style={{
              position: 'absolute',
              top: 0, right: 0, bottom: 0, left: 0,
              boxShadow: `inset 0 0 40px ${badge.color}05`,
              borderRadius: '12px',
              pointerEvents: 'none'
            }} />

            {/* Top row with name and badge */}
            <div style={{ zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px',
                    color: '#FFFFFF',
                  }}>
                    {dept.code}
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>{dept.name}</h4>
                    <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 500 }}>Lead: {dept.lead}</span>
                  </div>
                </div>

                <span style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  backgroundColor: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  letterSpacing: '0.5px',
                  boxShadow: `0 0 10px ${badge.color}20`
                }}>
                  {badge.label}
                </span>
              </div>

              {/* Drift Score Meter & Percentage */}
              <div style={{
                margin: '16px 0',
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#A1A1AA', fontWeight: 600 }}>Current Drift Index</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: badge.color }}>
                    {dept.driftScore.toFixed(2)} <span style={{ fontSize: '11px', color: '#52525B', fontWeight: 600 }}>({driftPercentage}%)</span>
                  </span>
                </div>

                {/* Progress track */}
                <div style={{ height: '4px', width: '100%', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${driftPercentage}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                    style={{
                      height: '100%',
                      backgroundColor: badge.color,
                      boxShadow: `0 0 10px ${badge.color}`,
                    }} 
                  />
                </div>
              </div>

              {/* Top Drifting Sub-Topic */}
              <div style={{ marginBottom: '20px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#52525B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Top Drifting Sub-Topic
                </span>
                <p style={{
                  margin: '6px 0 0 0',
                  fontSize: '13px',
                  color: '#D1D5DB',
                  fontWeight: 500,
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  "{dept.topDriftTopic}"
                </p>
              </div>
            </div>

            {/* Bottom Row Footer & Inspect Button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', gap: '14px' }}>
                <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                  <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{dept.activeAlertsCount}</strong> alerts
                </span>
                <span style={{ fontSize: '12px', color: '#A1A1AA' }}>
                  <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{dept.cohesionIndex}%</strong> cohesion
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(0, 229, 255, 0.15)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onInspectDepartment(dept)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 229, 255, 0.1)',
                  border: '1px solid rgba(0, 229, 255, 0.2)',
                  color: '#38BDF8',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Inspect
                <Search size={14} />
              </motion.button>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
