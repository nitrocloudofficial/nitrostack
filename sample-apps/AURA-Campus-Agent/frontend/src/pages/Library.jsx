import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BookOpen, Calendar, ArrowRightLeft, ArrowLeftRight } from 'lucide-react';

export default function Library({ activeStudent }) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookId, setBookId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [dueDate, setDueDate] = useState('2026-08-01');
  const [alert, setAlert] = useState(null);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const data = await api.getLibrary(activeStudent);
      setLoans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLibrary();
  }, [activeStudent]);

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!bookId.trim() || !bookTitle.trim()) return;

    try {
      // Validate library fine blocker
      const fineDues = loans.reduce((acc, l) => acc + l.fine, 0);
      if (fineDues > 0) {
        setAlert({
          type: 'error',
          msg: `Denied: You have unpaid library fines of ₹${fineDues}. Please clear dues before checking out books.`
        });
        setTimeout(() => setAlert(null), 6000);
        return;
      }

      await api.issueBook(activeStudent, bookId, bookTitle, dueDate);
      setAlert({ type: 'success', msg: `Successfully checked out book: '${bookTitle}'!` });
      setBookId('');
      setBookTitle('');
      loadLibrary();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to issue book: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  const handleReturn = async (bId) => {
    try {
      await api.returnBook(activeStudent, bId);
      setAlert({ type: 'success', msg: `Successfully returned book ${bId} and cleared outstanding fines.` });
      loadLibrary();
      setTimeout(() => setAlert(null), 5000);
    } catch (err) {
      setAlert({ type: 'error', msg: `Failed to return book: ${err.message}` });
      setTimeout(() => setAlert(null), 5000);
    }
  };

  if (loading) {
    return <div style={styles.loading}>Retrieving library catalogues...</div>;
  }

  const activeLoans = loans.filter((l) => !l.returned);
  const history = loans.filter((l) => l.returned);
  const totalFine = loans.reduce((acc, l) => acc + l.fine, 0);

  return (
    <div className="page-container">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Library Issue Desk</h2>
          <p style={styles.sub}>Check active book checkouts, clear library fines, and log returns.</p>
        </div>
        <div style={styles.fineBox} className="glass-panel">
          <span style={styles.fineLabel}>Library Fines:</span>
          <span style={{ 
            ...styles.fineVal, 
            color: totalFine > 0 ? '#ef4444' : '#10b981' 
          }}>
            ₹{totalFine.toLocaleString()}
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

      <div style={styles.grid}>
        {/* Book Checkout Panel */}
        <div style={styles.formCol} className="glass-panel">
          <div style={styles.sectionHeader}>
            <ArrowLeftRight size={18} color="#6366f1" />
            <h3 style={styles.sectionTitle}>Borrow New Book</h3>
          </div>

          <form onSubmit={handleIssue} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>Book Catalog ID</label>
              <input
                type="text"
                value={bookId}
                onChange={(e) => setBookId(e.target.value)}
                placeholder="e.g. B9013"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>Book Title</label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="e.g. Design Patterns"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.inputLabel}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <button type="submit" className="aura-button">
              Borrow Book
            </button>
          </form>
        </div>

        {/* Active Book List */}
        <div style={styles.listCol}>
          <h3 style={styles.listTitle}>Active Book Loans</h3>
          {activeLoans.length === 0 ? (
            <div style={styles.emptyList}>No active library checkouts.</div>
          ) : (
            <div style={styles.loanGrid}>
              {activeLoans.map((loan, idx) => (
                <div key={idx} style={styles.loanCard} className="glass-panel">
                  <div style={styles.loanHeader}>
                    <div style={styles.bookTitleArea}>
                      <BookOpen size={16} color="#818cf8" style={{ marginTop: '2px' }} />
                      <div>
                        <div style={styles.loanBookTitle}>{loan.book_title}</div>
                        <div style={styles.loanBookId}>Catalog ID: {loan.book_id}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleReturn(loan.book_id)} 
                      style={styles.returnBtn}
                    >
                      Return Book
                    </button>
                  </div>
                  <div style={styles.loanMeta}>
                    <div style={styles.loanMetaItem}>
                      <Calendar size={12} color="#6b7280" />
                      <span>Issued: {loan.issued_at}</span>
                    </div>
                    <div style={styles.loanMetaItem}>
                      <Calendar size={12} color="#6b7280" />
                      <span style={{ color: '#fca5a5' }}>Due: {loan.due_at}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History */}
          <h3 style={{ ...styles.listTitle, marginTop: '24px' }}>Return History Log</h3>
          {history.length === 0 ? (
            <div style={styles.emptyList}>No past logs.</div>
          ) : (
            <div style={styles.historyList}>
              {history.map((h, i) => (
                <div key={i} style={styles.historyRow} className="glass-panel">
                  <div style={styles.historyText}>
                    <span style={styles.historyTitle}>{h.book_title}</span>
                    <span style={styles.historyId}>({h.book_id})</span>
                  </div>
                  <span className="badge badge-success">Returned</span>
                </div>
              ))}
            </div>
          )}
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
  fineBox: {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fineLabel: {
    fontSize: '0.8rem',
    color: 'var(--txt-soft)',
    fontWeight: '600',
  },
  fineVal: {
    fontSize: '1.25rem',
    fontWeight: '800',
    fontFamily: "'Outfit', sans-serif",
  },
  grid: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  formCol: {
    flex: '1 1 360px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    alignSelf: 'start',
  },
  listCol: {
    flex: '2 1 480px',
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
  },
  input: {
    backgroundColor: 'var(--bg-deep)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '10px',
    color: 'var(--txt-bright)',
    outline: 'none',
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
  loanGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loanCard: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  bookTitleArea: {
    display: 'flex',
    gap: '10px',
  },
  loanBookTitle: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
  },
  loanBookId: {
    fontSize: '0.75rem',
    color: 'var(--txt-dim)',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  returnBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  loanMeta: {
    display: 'flex',
    gap: '16px',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    paddingTop: '8px',
  },
  loanMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--txt-soft)',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  historyRow: {
    padding: '10px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyText: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  historyTitle: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--txt-bright)',
  },
  historyId: {
    fontSize: '0.75rem',
    color: 'var(--txt-dim)',
    fontFamily: 'monospace',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '0.85rem',
    marginBottom: '20px',
  }
};
