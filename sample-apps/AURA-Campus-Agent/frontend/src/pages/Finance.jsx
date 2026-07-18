import React, { useState, useEffect } from 'react';
import FinanceCard from '../components/FinanceCard';
import { api } from '../services/api';

export default function Finance({ activeStudent }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const loadFinance = async () => {
    setLoading(true);
    try {
      const data = await api.getFinance(activeStudent);
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinance();
  }, [activeStudent]);

  const handlePay = async (feeType, amount) => {
    try {
      await api.payFees(activeStudent, feeType, amount);
      setAlert({ type: 'success', msg: `Successfully registered payment of ₹${amount.toLocaleString()} for ${feeType} fees!` });
      loadFinance();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to pay fees: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Querying financial ledgers...</div>;
  }

  const outstanding = records.reduce((acc, r) => acc + (r.amount_due - r.amount_paid), 0);

  return (
    <div className="page-container">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Financial Fee Ledger</h2>
          <p style={styles.sub}>Check outstanding course fees, hostel dues, and simulate payments.</p>
        </div>
        <div style={styles.dueBox} className="glass-panel">
          <span style={styles.dueLabel}>Total Outstanding Dues:</span>
          <span style={{ 
            ...styles.dueVal, 
            color: outstanding > 0 ? '#f59e0b' : '#10b981' 
          }}>
            ₹{outstanding.toLocaleString()}
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
        <div style={styles.empty}>No fee accounts linked to this student context.</div>
      ) : (
        <div className="card-grid">
          {records.map((r, idx) => (
            <FinanceCard key={idx} record={r} onPay={handlePay} />
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
  dueBox: {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dueLabel: {
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
    fontWeight: '600',
  },
  dueVal: {
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
