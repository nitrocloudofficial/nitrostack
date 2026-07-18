import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Briefcase, Award, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function Placements({ activeStudent }) {
  const [placement, setPlacement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const cutoffs = [
    { name: 'Google', minCgpa: 8.0, maxBacklogs: 0, CTC: '32 LPA' },
    { name: 'Microsoft', minCgpa: 7.8, maxBacklogs: 0, CTC: '28 LPA' },
    { name: 'Uber', minCgpa: 8.0, maxBacklogs: 0, CTC: '35 LPA' },
    { name: 'TCS', minCgpa: 6.0, maxBacklogs: 2, CTC: '4.5 LPA' },
    { name: 'Infosys', minCgpa: 6.0, maxBacklogs: 2, CTC: '4.2 LPA' }
  ];

  const loadPlacement = async () => {
    setLoading(true);
    try {
      const data = await api.getPlacement(activeStudent);
      setPlacement(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlacement();
  }, [activeStudent]);

  const handleApply = async (companyName) => {
    try {
      // Direct validation
      const attn = await api.getAttendance(activeStudent);
      const avg = attn.length ? attn.reduce((acc, r) => acc + r.percentage, 0) / attn.length : 100;
      if (avg < 75) {
        setAlert({ 
          type: 'error', 
          msg: `Application Blocked: Overall attendance (${Math.round(avg)}%) is below 75%. You are barred from recruitment drives.` 
        });
        setTimeout(() => setAlert(null), 6000);
        return;
      }

      const fin = await api.getFinance(activeStudent);
      const outstandingFees = fin.reduce((acc, r) => acc + (r.amount_due - r.amount_paid), 0);
      if (outstandingFees > 0) {
        setAlert({ 
          type: 'error', 
          msg: `Application Blocked: You have outstanding fee dues of ₹${outstandingFees.toLocaleString()}. Clear accounts first.` 
        });
        setTimeout(() => setAlert(null), 6000);
        return;
      }

      const res = await api.applyPlacement(activeStudent, companyName);
      if (res.status === 'Rejected') {
        setAlert({ type: 'error', msg: `Application Rejected: ${res.message}` });
      } else {
        setAlert({ type: 'success', msg: `Application for ${companyName} submitted successfully!` });
        loadPlacement();
      }
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to apply: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Accessing recruitment drives...</div>;
  }

  const registeredApplications = placement?.applications || [];

  return (
    <div className="page-container">
      <div style={styles.header}>
        <h2 style={styles.title}>Campus Placement Officer</h2>
        <p style={styles.sub}>Track CGPA criteria, review eligibility benchmarks, and apply for recruitment drives.</p>
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

      <div style={styles.topSection}>
        {/* Profile Card */}
        <div style={styles.profileCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <Award size={18} color="#6366f1" />
            <h3 style={styles.cardTitle}>Student Profile Metrics</h3>
          </div>
          
          <div style={styles.profileGrid}>
            <div style={styles.metric}>
              <span style={styles.mLabel}>Cumulative CGPA</span>
              <span style={styles.mVal}>{placement?.cgpa}</span>
            </div>
            <div style={styles.metric}>
              <span style={styles.mLabel}>Active Backlogs</span>
              <span style={{ 
                ...styles.mVal, 
                color: placement?.backlogs > 0 ? '#ef4444' : '#10b981' 
              }}>
                {placement?.backlogs}
              </span>
            </div>
          </div>
          
          {placement?.backlogs > 0 && (
            <div style={styles.warningAlert}>
              <AlertCircle size={14} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>You have active academic backlogs, which may restrict your eligibility for elite companies.</span>
            </div>
          )}
        </div>

        {/* Applications List */}
        <div style={styles.appsCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <FileText size={18} color="#a855f7" />
            <h3 style={styles.cardTitle}>My Submissions</h3>
          </div>
          
          {registeredApplications.length === 0 ? (
            <div style={styles.emptyApps}>No placement applications submitted yet.</div>
          ) : (
            <div style={styles.appsList}>
              {registeredApplications.map((app, i) => (
                <div key={i} style={styles.appRow} className="glass-panel">
                  <div style={styles.appInfo}>
                    <span style={styles.appName}>{app}</span>
                    <span style={styles.appLabel}>Recruitment Drive</span>
                  </div>
                  <div style={styles.appStatus}>
                    <CheckCircle2 size={14} color="#10b981" />
                    <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: '700' }}>Submitted</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recruiter Cutoffs */}
      <div style={styles.tableSection} className="glass-panel">
        <h3 style={styles.tableSectionTitle}>Active Recruitment Drives & Eligibility Check</h3>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Company Name</th>
              <th style={styles.th}>Min CGPA</th>
              <th style={styles.th}>Max Backlogs</th>
              <th style={styles.th}>CTC Package</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {cutoffs.map((company, idx) => {
              const eligible = placement?.cgpa >= company.minCgpa && placement?.backlogs <= company.maxBacklogs;
              const alreadyApplied = registeredApplications.includes(company.name);
              
              return (
                <tr key={idx} style={styles.tr}>
                  <td style={styles.tdName}>
                    <Briefcase size={14} color="#818cf8" style={{ marginRight: '8px' }} />
                    {company.name}
                  </td>
                  <td style={styles.td}>{company.minCgpa}</td>
                  <td style={styles.td}>{company.maxBacklogs}</td>
                  <td style={styles.td}>{company.CTC}</td>
                  <td style={styles.td}>
                    {alreadyApplied ? (
                      <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: '600' }}>Applied</span>
                    ) : (
                      <button
                        onClick={() => handleApply(company.name)}
                        style={{
                          ...styles.applyBtn,
                          opacity: eligible ? 1 : 0.4,
                          cursor: eligible ? 'pointer' : 'not-allowed',
                          backgroundColor: eligible ? '#6366f1' : 'rgba(255,255,255,0.05)',
                          color: eligible ? '#ffffff' : '#6b7280'
                        }}
                        disabled={!eligible}
                      >
                        {eligible ? 'Apply Now' : 'Ineligible'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
  topSection: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  profileCard: {
    flex: '1 1 360px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  appsCard: {
    flex: '1 1 360px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px',
  },
  cardTitle: {
    fontSize: '1rem',
    color: 'var(--txt-bright)',
  },
  profileGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    margin: '10px 0',
  },
  metric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  mLabel: {
    fontSize: '0.75rem',
    color: 'var(--txt-soft)',
  },
  mVal: {
    fontSize: '1.5rem',
    fontWeight: '800',
    color: 'var(--txt-bright)',
    fontFamily: "'Outfit', sans-serif",
  },
  warningAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    border: '1px solid rgba(239, 68, 68, 0.1)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '0.75rem',
  },
  emptyApps: {
    color: 'var(--txt-dim)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '20px',
  },
  appsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '130px',
    overflowY: 'auto',
  },
  appRow: {
    padding: '8px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  appName: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
  },
  appLabel: {
    fontSize: '0.65rem',
    color: 'var(--txt-soft)',
  },
  appStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tableSection: {
    padding: '24px',
  },
  tableSectionTitle: {
    fontSize: '1.1rem',
    color: 'var(--txt-bright)',
    marginBottom: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '12px',
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
  tdName: {
    padding: '12px',
    fontSize: '0.85rem',
    color: 'var(--txt-bright)',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
  },
  applyBtn: {
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '0.75rem',
    fontWeight: '700',
    transition: 'all 0.2s',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.85rem',
    marginBottom: '20px',
  }
};
