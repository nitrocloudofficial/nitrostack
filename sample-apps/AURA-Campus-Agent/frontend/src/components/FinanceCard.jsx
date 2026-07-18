import React, { useState } from 'react';
import { CreditCard, Calendar } from 'lucide-react';

export default function FinanceCard({ record, onPay }) {
  const [payAmount, setPayAmount] = useState('');
  const remaining = record.amount_due - record.amount_paid;
  const isPaid = remaining <= 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;
    onPay(record.fee_type, parseFloat(payAmount));
    setPayAmount('');
  };

  return (
    <div style={styles.card} className="glass-panel">
      <div style={styles.header}>
        <h3 style={styles.feeType}>{record.fee_type} Fees</h3>
        <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`}>
          {isPaid ? 'Fully Paid' : 'Pending'}
        </span>
      </div>

      <div style={styles.stats}>
        <div style={styles.statCol}>
          <span style={styles.label}>Amount Due</span>
          <span style={styles.amount}>₹{record.amount_due.toLocaleString()}</span>
        </div>
        <div style={styles.statCol}>
          <span style={styles.label}>Amount Paid</span>
          <span style={styles.amountPaid}>₹{record.amount_paid.toLocaleString()}</span>
        </div>
      </div>

      {!isPaid && (
        <div style={styles.actionSec}>
          <div style={styles.remaining}>
            <span style={styles.label}>Outstanding:</span>
            <span style={styles.remAmount}>₹{remaining.toLocaleString()}</span>
          </div>

          <form onSubmit={handleSubmit} style={styles.payForm}>
            <input
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Enter amount"
              style={styles.payInput}
              max={remaining}
              min={1}
            />
            <button type="submit" style={styles.payBtn}>
              <CreditCard size={14} style={{ marginRight: '6px' }} />
              Pay
            </button>
          </form>
        </div>
      )}

      <div style={styles.footer}>
        <Calendar size={12} color="#9ca3af" />
        <span style={styles.dueDateText}>Due Date: {record.due_date}</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeType: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  statCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  label: {
    fontSize: '0.7rem',
    color: 'var(--txt-soft)',
  },
  amount: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
  },
  amountPaid: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: '#10b981',
  },
  actionSec: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  remaining: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remAmount: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#f59e0b',
  },
  payForm: {
    display: 'flex',
    gap: '8px',
  },
  payInput: {
    flex: 1,
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    padding: '6px 10px',
    color: 'var(--txt-bright)',
    fontSize: '0.8rem',
    outline: 'none',
  },
  payBtn: {
    backgroundColor: '#6366f1',
    border: 'none',
    color: 'var(--txt-bright)',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    paddingTop: '10px',
  },
  dueDateText: {
    fontSize: '0.75rem',
    color: 'var(--txt-soft)',
  }
};
