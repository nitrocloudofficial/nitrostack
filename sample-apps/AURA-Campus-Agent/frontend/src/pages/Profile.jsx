import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Phone, Mail, MapPin, Calendar, Heart } from 'lucide-react';

export default function Profile({ activeStudent }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [alert, setAlert] = useState(null);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await api.getProfile(activeStudent);
      setProfile(data);
      setEmail(data.email || '');
      setPhone(data.phone || '');
      setAddress(data.address || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [activeStudent]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.updateProfile(activeStudent, { email, phone, address });
      setAlert({ type: 'success', msg: 'Profile details successfully updated!' });
      loadProfile();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to update profile: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Accessing registrar registers...</div>;
  }

  return (
    <div className="page-container">
      <div style={styles.header}>
        <h2 style={styles.title}>Student Identity Record</h2>
        <p style={styles.sub}>Review academic details and edit contact specifications.</p>
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

      <div style={styles.grid}>
        {/* Info Card */}
        <div style={styles.leftCol} className="glass-panel">
          <div style={styles.avatarRow}>
            <div style={styles.avatarLarge}>
              <User size={48} color="#818cf8" />
            </div>
            <div>
              <h3 style={styles.name}>{profile?.name}</h3>
              <p style={styles.rollNo}>{profile?.roll_no}</p>
            </div>
          </div>

          <div style={styles.academicDetails}>
            <div style={styles.detailItem}>
              <span style={styles.label}>Degree & Program:</span>
              <span style={styles.value}>{profile?.program}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Current Semester:</span>
              <span style={styles.value}>Semester {profile?.semester}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.label}>Hostel Room Assigned:</span>
              <span style={styles.value}>{profile?.hostel_room}</span>
            </div>
          </div>

          <div style={styles.metadataList}>
            <div style={styles.metaRow}>
              <Calendar size={14} color="#a855f7" />
              <span style={styles.metaLabel}>Date of Birth:</span>
              <span style={styles.metaValue}>{profile?.dob}</span>
            </div>
            <div style={styles.metaRow}>
              <Heart size={14} color="#ef4444" />
              <span style={styles.metaLabel}>Blood Group:</span>
              <span style={styles.metaValue}>{profile?.blood_group}</span>
            </div>
          </div>
        </div>

        {/* Edit Card */}
        <div style={styles.rightCol} className="glass-panel">
          <h3 style={styles.cardTitle}>Update Contact Information</h3>
          
          <form onSubmit={handleUpdate} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>
                <Mail size={12} style={{ marginRight: '6px' }} />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>
                <Phone size={12} style={{ marginRight: '6px' }} />
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>
                <MapPin size={12} style={{ marginRight: '6px' }} />
                Residential Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={styles.textarea}
                required
              />
            </div>

            <button type="submit" className="aura-button">
              Save Profile Changes
            </button>
          </form>
        </div>
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
  grid: {
    display: 'flex',
    gap: '24px',
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
  avatarRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '20px',
  },
  avatarLarge: {
    width: '72px',
    height: '72px',
    borderRadius: '16px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  name: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--txt-bright)',
  },
  rollNo: {
    fontSize: '0.85rem',
    color: '#6366f1',
    fontWeight: '700',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  academicDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '0.75rem',
    color: 'var(--txt-soft)',
  },
  value: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--txt-bright)',
  },
  metadataList: {
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
  },
  metaLabel: {
    color: 'var(--txt-soft)',
  },
  metaValue: {
    color: 'var(--txt-bright)',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: '1.1rem',
    color: 'var(--txt-bright)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
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
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '10px',
    color: 'var(--txt-bright)',
    outline: 'none',
  },
  textarea: {
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '12px',
    color: 'var(--txt-bright)',
    minHeight: '80px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.85rem',
    marginBottom: '20px',
  }
};
