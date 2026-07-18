import React, { useState, useEffect } from 'react';
import AttendanceCard from '../components/AttendanceCard';
import { api } from '../services/api';

export default function Attendance({ activeStudent }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendance(activeStudent);
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [activeStudent]);

  const handleFlag = async (courseCode) => {
    try {
      const res = await api.flagAttendance(activeStudent, courseCode);
      setAlert({ type: 'success', msg: `Successfully flagged shortage in ${courseCode}! An academic complaint has been filed.` });
      loadAttendance();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to flag shortage: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Querying course registries...</div>;
  }

  const average = records.length 
    ? Math.round(records.reduce((acc, r) => acc + r.percentage, 0) / records.length) 
    : 100;

  return (
    <div className="page-container">
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Academic Attendance</h2>
          <p style={styles.subTitle}>Check status and register shortage warning flags.</p>
        </div>
        <div style={styles.summaryBadge} className="glass-panel">
          <span style={styles.avgLabel}>Overall Attendance:</span>
          <span style={{ 
            ...styles.avgVal, 
            color: average >= 75 ? '#10b981' : '#ef4444' 
          }}>
            {average}%
          </span>
        </div>
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

      {records.length === 0 ? (
        <div style={styles.empty}>No registered courses found for this student context.</div>
      ) : (
        <div className="card-grid">
          {records.map((r, i) => (
            <AttendanceCard key={i} record={r} onFlag={handleFlag} />
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
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '1.5rem',
    color: 'var(--txt-bright)',
  },
  subTitle: {
    fontSize: '0.85rem',
    color: 'var(--txt-soft)',
    marginTop: '4px',
  },
  summaryBadge: {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  avgLabel: {
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
    fontWeight: '600',
  },
  avgVal: {
    fontSize: '1.25rem',
    fontWeight: '800',
    fontFamily: "'Outfit', sans-serif",
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
