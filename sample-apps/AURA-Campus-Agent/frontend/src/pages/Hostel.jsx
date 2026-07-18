import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Home, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function Hostel({ activeStudent }) {
  const [hostel, setHostel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('2026-07-20');
  const [toDate, setToDate] = useState('2026-07-22');
  const [reason, setReason] = useState('Family Function');
  const [alert, setAlert] = useState(null);

  const loadHostel = async () => {
    setLoading(true);
    try {
      const data = await api.getHostel(activeStudent);
      setHostel(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHostel();
  }, [activeStudent]);

  const handleApplyOutpass = async (e) => {
    e.preventDefault();
    try {
      // Outpass validation check (simulate client policy checks)
      const attendance = await api.getAttendance(activeStudent);
      const avg = attendance.length 
        ? attendance.reduce((acc, r) => acc + r.percentage, 0) / attendance.length 
        : 100;
        
      if (avg < 75) {
        setAlert({ 
          type: 'error', 
          msg: `Denied: Leave policy requires overall attendance >= 75%. Your average attendance is ${Math.round(avg)}%.` 
        });
        setTimeout(() => setAlert(null), 6000);
        return;
      }

      if (hostel.dues > 0) {
        setAlert({ 
          type: 'error', 
          msg: `Denied: You have outstanding hostel dues of ₹${hostel.dues}. Clear dues before applying.` 
        });
        setTimeout(() => setAlert(null), 6000);
        return;
      }

      await api.fileOutpass(activeStudent, fromDate, toDate, reason);
      setAlert({ type: 'success', msg: 'Outpass Approved! Successfully filed request in Hostel system.' });
      loadHostel();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to file outpass: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Retrieving hostel records...</div>;
  }

  const activeLeaves = hostel?.leave_requests || [];

  return (
    <div className="page-container">
      <div style={styles.header}>
        <h2 style={styles.title}>Hostel & Outpass Management</h2>
        <p style={styles.sub}>Check room status, review outpass policies, and file leave requests.</p>
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

      <div style={styles.dashboardRow}>
        {/* Room Info */}
        <div style={styles.leftCol} className="glass-panel">
          <div style={styles.sectionHeader}>
            <Home size={18} color="#6366f1" />
            <h3 style={styles.sectionTitle}>Room Assignment</h3>
          </div>
          
          <div style={styles.roomDetails}>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Hall of Residence</span>
              <span style={styles.detailVal}>{hostel?.room_no !== "Unassigned" ? "Boys Hostel 3 (BH3)" : "Unassigned"}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Room Number</span>
              <span style={styles.detailVal}>{hostel?.room_no}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Hostel Fee Dues</span>
              <span style={{ 
                ...styles.detailVal, 
                color: hostel?.dues > 0 ? '#f59e0b' : '#10b981' 
              }}>
                ₹{hostel?.dues.toLocaleString()}
              </span>
            </div>
          </div>

          <div style={styles.policyCard}>
            <div style={styles.policyTitle}>
              <ShieldCheck size={14} color="#10b981" />
              <span>Outpass Approval Criteria</span>
            </div>
            <p style={styles.policyText}>
              Leaves are auto-approved provided you have overall attendance &gt;= 75%, and have no hostel dues or pending discipline complaints.
            </p>
          </div>
        </div>

        {/* Apply leave */}
        <div style={styles.rightCol} className="glass-panel">
          <div style={styles.sectionHeader}>
            <Calendar size={18} color="#a855f7" />
            <h3 style={styles.sectionTitle}>Apply Weekend Outpass</h3>
          </div>

          <form onSubmit={handleApplyOutpass} style={styles.form}>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.inputLabel}>From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.inputLabel}>To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Family Function / Medical Leave"
                style={styles.input}
                required
              />
            </div>

            <button type="submit" className="aura-button">
              File Leave Outpass
            </button>
          </form>
        </div>
      </div>

      <div style={styles.listSection} className="glass-panel">
        <h3 style={styles.listTitle}>Leave Application History</h3>
        {activeLeaves.length === 0 ? (
          <div style={styles.emptyList}>No leave outpasses requested.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Request ID</th>
                <th style={styles.th}>From</th>
                <th style={styles.th}>To</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeLeaves.map((l, i) => (
                <tr key={i} style={styles.tr}>
                  <td style={styles.tdId}>{l.id}</td>
                  <td style={styles.td}>{l.from}</td>
                  <td style={styles.td}>{l.to}</td>
                  <td style={styles.td}>{l.reason || 'Personal Work'}</td>
                  <td style={styles.td}>
                    <span className="badge badge-success">{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
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
  dashboardRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  leftCol: {
    flex: '1 1 360px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightCol: {
    flex: '2 1 480px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    color: 'var(--txt-bright)',
  },
  roomDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  detailLabel: {
    color: 'var(--txt-soft)',
  },
  detailVal: {
    color: 'var(--txt-bright)',
    fontWeight: '600',
  },
  policyCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
    border: '1px solid rgba(99, 102, 241, 0.12)',
    borderRadius: '10px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  policyTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#818cf8',
    textTransform: 'uppercase',
  },
  policyText: {
    fontSize: '0.75rem',
    color: 'var(--txt-soft)',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  inputLabel: {
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '10px',
    color: 'var(--txt-bright)',
    outline: 'none',
  },
  listSection: {
    padding: '24px',
  },
  listTitle: {
    fontSize: '1.1rem',
    color: 'var(--txt-bright)',
    marginBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px',
  },
  emptyList: {
    color: 'var(--txt-soft)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  thRow: {
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  th: {
    padding: '12px',
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid rgba(255,255,255,0.03)',
  },
  td: {
    padding: '12px',
    fontSize: '0.85rem',
    color: 'var(--txt-bright)',
  },
  tdId: {
    padding: '12px',
    fontSize: '0.85rem',
    color: 'var(--txt-bright)',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.85rem',
    marginBottom: '20px',
  }
};
