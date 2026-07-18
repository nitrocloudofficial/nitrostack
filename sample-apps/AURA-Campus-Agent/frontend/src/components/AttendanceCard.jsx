import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function AttendanceCard({ record, onFlag }) {
  const isShortage = record.percentage < 75;

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <h3 style={styles.courseCode}>{record.course_code}</h3>
        <span className={`badge ${isShortage ? 'badge-error' : 'badge-success'}`}>
          {record.percentage}% Attended
        </span>
      </div>

      <div style={styles.metrics}>
        <div style={styles.metricItem}>
          <span style={styles.label}>Classes Attended</span>
          <span style={styles.value}>{record.classes_attended}</span>
        </div>
        <div style={styles.metricItem}>
          <span style={styles.label}>Total Held</span>
          <span style={styles.value}>{record.classes_held}</span>
        </div>
      </div>

      <div style={styles.progressBarBg}>
        <div style={{
          ...styles.progressBarFill,
          width: `${Math.min(100, record.percentage)}%`,
          backgroundColor: isShortage ? '#ef4444' : '#10b981'
        }} />
      </div>

      {isShortage ? (
        <div style={styles.warningContainer}>
          <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
          <span style={styles.warningText}>
            Attendance is below the 75% requirements. Rescheduling or flagging warning is advised.
          </span>
          <button 
            onClick={() => onFlag(record.course_code)} 
            style={styles.flagBtn}
          >
            Flag Shortage
          </button>
        </div>
      ) : (
        <div style={styles.successContainer}>
          <CheckCircle size={14} color="#10b981" />
          <span style={styles.successText}>Attendance safe. Eligible for examinations.</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseCode: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
  },
  metrics: {
    display: 'flex',
    gap: '24px',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '0.7rem',
    color: 'var(--txt-soft)',
  },
  value: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--txt-bright)',
  },
  progressBarBg: {
    height: '6px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  warningContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  warningText: {
    fontSize: '0.75rem',
    color: '#fca5a5',
    flex: 1,
  },
  flagBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: 'var(--txt-bright)',
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successText: {
    fontSize: '0.75rem',
    color: '#a7f3d0',
  }
};
