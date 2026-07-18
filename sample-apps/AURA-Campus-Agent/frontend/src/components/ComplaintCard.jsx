import React from 'react';
import { Calendar, Tag, CheckSquare } from 'lucide-react';

export default function ComplaintCard({ complaint, onResolve }) {
  const isOpen = complaint.status.toLowerCase() === 'open';

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <div style={styles.idArea}>
          <span style={styles.idLabel}>ID:</span>
          <span style={styles.idVal}>{complaint.complaint_id}</span>
        </div>
        <span className={`badge ${isOpen ? 'badge-warning' : 'badge-success'}`}>
          {complaint.status}
        </span>
      </div>

      <p style={styles.desc}>{complaint.description}</p>

      <div style={styles.footer}>
        <div style={styles.metaRow}>
          <Tag size={12} color="#9ca3af" />
          <span style={styles.metaText}>{complaint.category}</span>
        </div>
        <div style={styles.metaRow}>
          <Calendar size={12} color="#9ca3af" />
          <span style={styles.metaText}>
            {new Date(complaint.filed_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {isOpen && (
        <button 
          onClick={() => onResolve(complaint.complaint_id)} 
          style={styles.resolveBtn}
        >
          <CheckSquare size={14} style={{ marginRight: '6px' }} />
          Mark Resolved
        </button>
      )}
    </div>
  );
}

const styles = {
  card: {
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  idArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.8rem',
  },
  idLabel: {
    color: 'var(--txt-dim)',
    fontWeight: '500',
  },
  idVal: {
    color: 'var(--txt-bright)',
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  desc: {
    fontSize: '0.85rem',
    color: 'var(--txt-bright)',
    lineHeight: '1.5',
    margin: '4px 0',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '10px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  metaText: {
    fontSize: '0.75rem',
    color: 'var(--txt-soft)',
  },
  resolveBtn: {
    marginTop: '6px',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  }
};
