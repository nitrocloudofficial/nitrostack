import React, { useState, useEffect } from 'react';
import EventCard from '../components/EventCard';
import { api } from '../services/api';

export default function Events({ activeStudent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [activeStudent]);

  const handleRegister = async (eventId) => {
    try {
      await api.registerEvent(activeStudent, eventId);
      setAlert({ type: 'success', msg: 'Successfully registered for event RSVP! Verified schedule.' });
      loadEvents();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Registration failed: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Gathering campus calendar...</div>;
  }

  return (
    <div className="page-container">
      <div style={styles.header}>
        <h2 style={styles.title}>Campus Events & Extracurriculars</h2>
        <p style={styles.sub}>Register for workshops, hackathons, and sports activities.</p>
      </div>

      {alert && (
        <div style={{
          ...styles.alert,
          backgroundColor: alert.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          borderColor: alert.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          color: alert.type === 'success' ? '#a7f3d0' : '#fca5a5'
        }}>
          {alert.msg}
        </div>
      )}

      {events.length === 0 ? (
        <div style={styles.empty}>No upcoming activities scheduled.</div>
      ) : (
        <div className="card-grid">
          {events.map((e, idx) => (
            <EventCard 
              key={idx} 
              event={e} 
              studentId={activeStudent} 
              onRegister={handleRegister} 
            />
          ))}
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
  empty: {
    color: 'var(--txt-soft)',
    textAlign: 'center',
    padding: '40px',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.85rem',
    marginBottom: '20px',
  }
};
