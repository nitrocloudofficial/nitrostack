import React, { useState, useEffect } from 'react';
import { CheckSquare, AlertCircle, BookOpen, DollarSign, Briefcase } from 'lucide-react';
import StatCard from '../components/StatCard';
import { api } from '../services/api';

export default function Dashboard({ activeStudent, setCurrentPage }) {
  const [metrics, setMetrics] = useState({
    attendance: 0,
    complaints: 0,
    books: 0,
    fees: 0,
    cgpa: 0,
  });
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Must be defined before useEffect to avoid ReferenceError (const is not hoisted)
  const round = (value, precision) => {
    const multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
  };

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const student = await api.getProfile(activeStudent);
        setStudentName(student?.name || activeStudent);

        const attn = await api.getAttendance(activeStudent);
        const attnArr = Array.isArray(attn) ? attn : [];
        const avgAttn = attnArr.length
          ? round(attnArr.reduce((acc, r) => acc + (r.percentage || 0), 0) / attnArr.length, 1)
          : 0;

        const comps = await api.getComplaints(activeStudent);
        const compsArr = Array.isArray(comps) ? comps : [];
        const openComps = compsArr.filter((c) => c.status?.toLowerCase() === 'open').length;

        const lib = await api.getLibrary(activeStudent);
        const libArr = Array.isArray(lib) ? lib : [];
        const activeBooks = libArr.filter((b) => !b.returned).length;

        const fin = await api.getFinance(activeStudent);
        const finArr = Array.isArray(fin) ? fin : [];
        const outstandingFees = finArr.reduce((acc, r) => acc + ((r.amount_due || 0) - (r.amount_paid || 0)), 0);

        const place = await api.getPlacement(activeStudent);
        const cgpa = place?.cgpa ?? 0.0;

        setMetrics({
          attendance: avgAttn,
          complaints: openComps,
          books: activeBooks,
          fees: Math.max(0, outstandingFees),
          cgpa: cgpa
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
        setError('Backend not reachable. Please start the server.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [activeStudent]);

  if (loading) {
    return <div style={styles.loading}>Analyzing dashboard diagnostics...</div>;
  }

  return (
    <div className="page-container">
      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error} — Run <code>python -m uvicorn backend.main:app --port 8000</code> from the project root.
        </div>
      )}
      <div style={styles.welcomeRow}>
        <h2 style={styles.welcomeText}>Welcome Back, <span className="text-gradient">{studentName}</span>!</h2>
        <p style={styles.welcomeSub}>Here is a quick diagnostic summary of your campus operations account.</p>
      </div>


      <div style={styles.grid}>
        <div onClick={() => setCurrentPage('attendance')} style={styles.clickableCard}>
          <StatCard title="Overall Attendance" value={metrics.attendance} unit="%" icon={CheckSquare} color="#0284c7" />
        </div>
        <div onClick={() => setCurrentPage('complaints')} style={styles.clickableCard}>
          <StatCard title="Active Grievances" value={metrics.complaints} unit="Open" icon={AlertCircle} color="#0284c7" />
        </div>
        <div onClick={() => setCurrentPage('library')} style={styles.clickableCard}>
          <StatCard title="Books Issued" value={metrics.books} unit="Unreturned" icon={BookOpen} color="#0284c7" />
        </div>
        <div onClick={() => setCurrentPage('finance')} style={styles.clickableCard}>
          <StatCard title="Outstanding Dues" value={`₹${metrics.fees.toLocaleString()}`} icon={DollarSign} color="#0284c7" />
        </div>
        <div onClick={() => setCurrentPage('placements')} style={styles.clickableCard}>
          <StatCard title="Cumulative CGPA" value={metrics.cgpa} icon={Briefcase} color="#0284c7" />
        </div>
      </div>

      {/* Main console prompt shortcut */}
      <div style={styles.consolePromo} className="glass-panel">
        <div style={styles.promoContent}>
          <h3 style={styles.promoTitle}>Need operational approvals or audits?</h3>
          <p style={styles.promoText}>
            Instead of manually clicking through pages, launch the AURA Conversational Agent to compose operations (e.g. checking placement cutoffs or applying for leave outpasses) automatically in a single request.
          </p>
        </div>
        <button onClick={() => setCurrentPage('agent')} className="aura-button">
          Open Agent Console
        </button>
      </div>
    </div>
  );
}

const styles = {
  loading: {
    padding: '40px',
    color: 'var(--txt-soft)',
    textAlign: 'center',
    fontSize: '1rem',
  },
  welcomeRow: {
    marginBottom: '24px',
  },
  welcomeText: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--txt-bright)',
  },
  welcomeSub: {
    fontSize: '0.9rem',
    color: 'var(--txt-soft)',
    marginTop: '4px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  clickableCard: {
    cursor: 'pointer',
  },
  consolePromo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    gap: '20px',
    flexWrap: 'wrap',
  },
  promoContent: {
    flex: 1,
    minWidth: '280px',
  },
  promoTitle: {
    fontSize: '1.1rem',
    color: 'var(--txt-bright)',
    fontWeight: '700',
  },
  promoText: {
    fontSize: '0.85rem',
    color: 'var(--txt-soft)',
    marginTop: '6px',
    lineHeight: '1.5',
  },
  errorBanner: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#ef4444',
    fontSize: '0.88rem',
    lineHeight: '1.6',
  }
};
