import React from 'react';
import { Clock, MapPin, User } from 'lucide-react';

export default function TimetableCard({ item }) {
  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <h3 style={styles.courseCode}>{item.course_code}</h3>
        <span style={styles.dayBadge}>{item.day}</span>
      </div>

      <div style={styles.body}>
        <div style={styles.infoRow}>
          <Clock size={14} color="#a855f7" />
          <span style={styles.infoText}>{item.start_time} - {item.end_time}</span>
        </div>

        <div style={styles.infoRow}>
          <MapPin size={14} color="#06b6d4" />
          <span style={styles.infoText}>{item.room}</span>
        </div>

        <div style={styles.infoRow}>
          <User size={14} color="#6366f1" />
          <span style={styles.infoText}>{item.faculty}</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseCode: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
    fontFamily: "'Outfit', sans-serif",
  },
  dayBadge: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoText: {
    fontSize: '0.8rem',
    color: 'var(--txt-bright)',
  }
};
