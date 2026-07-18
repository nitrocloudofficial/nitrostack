import React, { useState, useEffect } from 'react';
import ComplaintCard from '../components/ComplaintCard';
import { api } from '../services/api';
import { AlertCircle, PlusCircle } from 'lucide-react';

export default function Complaints({ activeStudent }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Hostel');
  const [description, setDescription] = useState('');
  const [alert, setAlert] = useState(null);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints(activeStudent);
      setComplaints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [activeStudent]);

  const handleResolve = async (complaintId) => {
    try {
      await api.resolveComplaint(complaintId);
      setAlert({ type: 'success', msg: `Complaint ${complaintId} has been marked resolved.` });
      loadComplaints();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to resolve complaint: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleFileComplaint = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      await api.fileComplaint(activeStudent, category, description);
      setAlert({ type: 'success', msg: 'Your complaint has been successfully registered.' });
      setDescription('');
      setShowForm(false);
      loadComplaints();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to file complaint: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Retrieving complaint logs...</div>;
  }

  return (
    <div className="page-container">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Grievance System</h2>
          <p style={styles.sub}>Submit academic, hostel, library, or finance complaints.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="aura-button" style={styles.btn}>
          <PlusCircle size={16} style={{ marginRight: '8px' }} />
          File Grievance
        </button>
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

      {showForm && (
        <form onSubmit={handleFileComplaint} style={styles.form} className="glass-panel">
          <h3 style={styles.formTitle}>New Grievance Filing</h3>
          <div style={styles.formGroup}>
            <label style={styles.label}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={styles.select}
            >
              <option value="Hostel">Hostel & Housing</option>
              <option value="Academic">Academic Schedule</option>
              <option value="Library">Library Operations</option>
              <option value="Finance">Finance Payments</option>
              <option value="General">General / Other</option>
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Detailed Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context regarding the complaint..."
              style={styles.textarea}
              required
            />
          </div>

          <div style={styles.formActions}>
            <button type="button" onClick={() => setShowForm(false)} className="aura-button-secondary">
              Cancel
            </button>
            <button type="submit" className="aura-button">
              File Official Complaint
            </button>
          </div>
        </form>
      )}

      {complaints.length === 0 ? (
        <div style={styles.empty}>No grievances on record. Excellent!</div>
      ) : (
        <div className="card-grid">
          {complaints.map((c, idx) => (
            <ComplaintCard key={idx} complaint={c} onResolve={handleResolve} />
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
  sub: {
    fontSize: '0.85rem',
    color: 'var(--txt-soft)',
    marginTop: '4px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
  },
  form: {
    padding: '24px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formTitle: {
    fontSize: '1.1rem',
    color: 'var(--txt-bright)',
    marginBottom: '4px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
    fontWeight: '600',
  },
  select: {
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '10px',
    color: 'var(--txt-bright)',
    outline: 'none',
  },
  textarea: {
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '12px',
    color: 'var(--txt-bright)',
    minHeight: '100px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
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
