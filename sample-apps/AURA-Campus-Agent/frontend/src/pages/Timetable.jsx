import React, { useState, useEffect } from 'react';
import TimetableCard from '../components/TimetableCard';
import { api } from '../services/api';

export default function Timetable({ activeStudent }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimetable() {
      setLoading(true);
      try {
        const data = await api.getTimetable(activeStudent);
        setSchedule(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTimetable();
  }, [activeStudent]);

  if (loading) {
    return <div style={styles.loading}>Resolving timetable schedules...</div>;
  }

  // Group by day of week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  return (
    <div className="page-container">
      <div style={styles.header}>
        <h2 style={styles.title}>Weekly Class Timetable</h2>
        <p style={styles.sub}>Synchronized with student course enrollment data.</p>
      </div>

      {schedule.length === 0 ? (
        <div style={styles.empty}>No class schedule registered. Enrolled in no active courses.</div>
      ) : (
        <div style={styles.timetableGrid}>
          {days.map((day) => {
            const classesForDay = schedule.filter((item) => item.day.toLowerCase() === day.toLowerCase());
            return (
              <div key={day} style={styles.dayCol} className="glass-panel">
                <h3 style={styles.dayTitle}>{day}</h3>
                <div style={styles.cardsList}>
                  {classesForDay.length === 0 ? (
                    <span style={styles.freeDay}>No Classes Scheduled</span>
                  ) : (
                    classesForDay.map((item, i) => (
                      <TimetableCard key={i} item={item} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  loading: {
    padding: '40px',
    color: 'var(--txt-soft)',
    textAlign: 'center',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '1.5rem',
    color: 'var(--txt-bright)',
  },
  sub: {
    fontSize: '0.85rem',
    color: 'var(--txt-soft)',
    marginTop: '4px',
  },
  timetableGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    alignItems: 'start',
  },
  dayCol: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  dayTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '8px',
  },
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  freeDay: {
    fontSize: '0.75rem',
    color: 'var(--txt-dim)',
    textAlign: 'center',
    padding: '12px 0',
    fontStyle: 'italic',
  },
  empty: {
    color: 'var(--txt-soft)',
    textAlign: 'center',
    padding: '40px',
  }
};
