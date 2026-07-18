import React from 'react';
import { Calendar, Clock, UserPlus, CheckCircle } from 'lucide-react';

export default function EventCard({ event, studentId, onRegister }) {
  const isRegistered = event.registered_students?.includes(studentId);

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <h3 style={styles.title}>{event.title}</h3>
        <span style={styles.catBadge}>{event.category}</span>
      </div>

      <div style={styles.details}>
        <div style={styles.detailItem}>
          <Calendar size={14} color="#a855f7" />
          <span style={styles.detailText}>{event.date}</span>
        </div>
        <div style={styles.detailItem}>
          <Clock size={14} color="#06b6d4" />
          <span style={styles.detailText}>{event.time}</span>
        </div>
      </div>

      {isRegistered ? (
        <div style={styles.registeredBadge}>
          <CheckCircle size={14} color="#10b981" style={{ marginRight: '6px' }} />
          Registered
        </div>
      ) : (
        <button onClick={() => onRegister(event.event_id)} style={styles.registerBtn}>
          <UserPlus size={14} style={{ marginRight: '6px' }} />
          Register Event
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
    lineHeight: '1.4',
  },
  catBadge: {
    fontSize: '0.65rem',
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    margin: '4px 0',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detailText: {
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
  },
  registeredBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    color: '#10b981',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: 'var(--txt-bright)',
    borderRadius: '8px',
    padding: '10px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  }
};
