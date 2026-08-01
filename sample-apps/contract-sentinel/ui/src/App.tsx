import { useEffect, useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Building2,
  Calendar,
  Scale,
  ChevronRight,
  CheckCircle2,
  Clock,
  Zap,
  Search,
  Plus,
  RefreshCw,
  X,
  Bot,
  Send,
  BarChart3,
  AlertOctagon,
  List,
  Bell,
  HelpCircle,
  Settings,
} from 'lucide-react';
import {
  fetchContracts,
  ingestContract,
  runSentinelCycle,
  type ContractCard,
  type PortfolioData,
} from './services/api';

/* ════════════════════════════════════════════════════════════════
   C Sentinel – Stitch Design (3-panel layout)
   Left Sidebar (280 px) · Main Content · Right Detail (380 px)
   ════════════════════════════════════════════════════════════════ */

export default function App() {
  /* ── State ─────────────────────────────────────────────────── */
  const [portfolio, setPortfolio]   = useState<PortfolioData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selectedFilter, setFilter] = useState<'all' | 'safe' | 'danger'>('all');
  const [searchTerm, setSearch]     = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCycleRunning, setCycle]  = useState(false);

  // Ingest modal
  const [modalOpen, setModalOpen]   = useState(false);
  const [isIngesting, setIngesting] = useState(false);
  const [ingestForm, setForm]       = useState({
    title: '', counterparty: '', contractType: 'Master Services Agreement',
    annualValue: '150000', currency: 'EUR', deadline: '2026-11-30', contractText: '',
  });

  // AI chat
  const [chatOpen, setChatOpen]     = useState(false);

  /* ── Data Loading ──────────────────────────────────────────── */
  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const data = await fetchContracts(selectedFilter);
      setPortfolio(data);
      if (!selectedId) {
        const first = data.columns.danger[0] || data.columns.safe[0];
        if (first) setSelectedId(first.id);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to Express REST API server');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [selectedFilter]);

  /* ── Handlers ──────────────────────────────────────────────── */
  const handleRunCycle = async () => {
    try { setCycle(true); await runSentinelCycle(false); await loadData(); }
    catch (err: any) { alert(`Sentinel cycle error: ${err.message}`); }
    finally { setCycle(false); }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestForm.title || !ingestForm.contractText) { alert('Please fill in title and contract text.'); return; }
    try {
      setIngesting(true);
      await ingestContract({
        title: ingestForm.title, counterparty: ingestForm.counterparty || 'Vendor Corp',
        contractType: ingestForm.contractType, contractText: ingestForm.contractText,
        annualValue: Number(ingestForm.annualValue) || 0, currency: ingestForm.currency,
        deadline: ingestForm.deadline,
      });
      setModalOpen(false);
      setForm({ title: '', counterparty: '', contractType: 'Master Services Agreement',
        annualValue: '150000', currency: 'EUR', deadline: '2026-11-30', contractText: '' });
      await loadData();
    } catch (err: any) { alert(`Ingest error: ${err.message}`); }
    finally { setIngesting(false); }
  };

  /* ── Derived ───────────────────────────────────────────────── */
  const allContracts: ContractCard[] = [
    ...(portfolio?.columns?.danger || []),
    ...(portfolio?.columns?.safe || []),
  ];
  const filtered = allContracts.filter(c => {
    const matchFilter = selectedFilter === 'all' || c.classification === selectedFilter;
    const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase())
      || c.counterparty.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });
  const s = portfolio?.summary || { total: 0, safe: 0, danger: 0, needsAttention: 0, averageScore: 0 };
  const dangerList = filtered.filter(c => c.classification === 'danger');
  const safeList   = filtered.filter(c => c.classification === 'safe');
  const selected   = allContracts.find(c => c.id === selectedId) || null;
  const expiringSoon = allContracts.filter(c => c.daysUntilDeadline != null && c.daysUntilDeadline <= 90).length;

  /* ── Render helpers ────────────────────────────────────────── */
  const renderContractCard = (c: ContractCard) => {
    const isDanger = c.classification === 'danger';
    const isSelected = c.id === selectedId;
    return (
      <div key={c.id} onClick={() => setSelectedId(c.id)}
        className={`contract-card ${isSelected ? 'selected' : ''}`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isDanger
              ? <AlertOctagon size={18} style={{ color: 'var(--primary)' }} />
              : <CheckCircle2 size={18} style={{ color: 'var(--secondary)' }} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--on-surface)' }}>
              {c.title}
            </p>
            <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--outline)' }}>
              {c.counterparty} · {c.currency} {c.annualValue?.toLocaleString() ?? 0}
            </p>
          </div>
          <span className={isDanger ? 'badge-danger' : 'badge-safe'}>
            {c.riskScore}/100
          </span>
        </div>
        {c.deadline && (
          <div className="flex items-center gap-1 mt-2 text-[10px]" style={{ color: 'var(--outline)' }}>
            <Clock size={12} />
            <span>{c.deadline}{c.daysUntilDeadline != null ? ` (${c.daysUntilDeadline}d)` : ''}</span>
          </div>
        )}
      </div>
    );
  };

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen overflow-hidden flex flex-col" style={{ background: '#0D0F12', color: 'var(--on-surface)' }}>

      {/* ═══════ TOP HEADER BAR ═══════ */}
      <header className="flex items-center justify-between px-5 py-3"
        style={{ background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)' }}>

        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--primary-container)' }}>
            <ShieldAlert size={20} style={{ color: 'var(--on-primary-container)' }} />
          </div>
          <div>
            <h1 className="font-display text-[15px] font-bold tracking-tight" style={{ color: 'var(--on-surface)' }}>
              C Sentinel
              <span className="badge-danger ml-2 text-[10px]">MCP Agent</span>
            </h1>
            <p className="text-[11px]" style={{ color: 'var(--outline)' }}>
              Perceive → Decide → Act
            </p>
          </div>
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex items-center gap-2 relative" style={{ width: 320 }}>
          <Search size={15} className="absolute left-3" style={{ color: 'var(--outline)' }} />
          <input type="text" placeholder="Search contracts, vendors, clauses..."
            value={searchTerm} onChange={e => setSearch(e.target.value)}
            className="form-input pl-9" />
        </div>

        {/* Right: Company badge + actions */}
        <div className="flex items-center gap-2">
          <div className="glass-card px-3 py-1.5 flex items-center gap-2 text-[11px]"
            style={{ color: 'var(--on-surface-variant)' }}>
            <Building2 size={14} style={{ color: 'var(--secondary)' }} />
            <span>Fintech Ltd · <strong style={{ color: 'var(--tertiary)' }}>Low Risk</strong></span>
          </div>
          <button className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--outline)' }} title="Notifications">
            <Bell size={18} />
          </button>
          <button className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--outline)' }} title="Help">
            <HelpCircle size={18} />
          </button>
          <button className="p-2 rounded-lg hover:opacity-80" style={{ color: 'var(--outline)' }} title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ═══════ BODY: 3-PANEL LAYOUT ═══════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ══════ LEFT SIDEBAR (280px) ══════ */}
        <aside className="w-[280px] flex-shrink-0 overflow-y-auto flex flex-col gap-4 p-4"
          style={{ background: 'var(--surface-dim)', borderRight: '1px solid var(--outline-variant)' }}>

          {/* Company Profile Card */}
          <div className="glass-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--secondary-container)' }}>
                <Building2 size={16} style={{ color: 'var(--on-secondary-container)' }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--on-surface)' }}>Fintech Ltd</p>
                <p className="text-[10px]" style={{ color: 'var(--outline)' }}>Ireland · Financial Services</p>
              </div>
            </div>
            <div className="text-[11px] space-y-1" style={{ color: 'var(--on-surface-variant)' }}>
              <div className="flex justify-between">
                <span>Risk Tolerance</span>
                <span className="badge-danger">Low</span>
              </div>
              <div className="flex justify-between">
                <span>Active Contracts</span>
                <span className="font-mono font-medium">{s.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Danger Threshold</span>
                <span className="font-mono font-medium">{portfolio?.dangerThreshold ?? 55}</span>
              </div>
            </div>
          </div>

          {/* Run Sentinel Cycle */}
          <button onClick={handleRunCycle} disabled={isCycleRunning}
            className="btn-primary pulse-crimson w-full justify-center text-[13px]">
            <Zap size={16} className={isCycleRunning ? 'animate-spin' : ''} />
            {isCycleRunning ? 'Running Cycle...' : 'Run Sentinel Cycle'}
          </button>

          {/* Ingest Button */}
          <button onClick={() => setModalOpen(true)}
            className="btn-ghost w-full justify-center flex items-center gap-2 text-[13px]">
            <Plus size={16} style={{ color: 'var(--secondary)' }} />
            Ingest & Analyze
          </button>

          {/* Contract View Nav */}
          <div>
            <p className="section-label px-1 mb-2">Contract View</p>
            <div className="space-y-1">
              {(['all', 'danger', 'safe'] as const).map(f => {
                const active = selectedFilter === f;
                const label = f === 'all' ? `All Contracts (${s.total})`
                  : f === 'danger' ? `Danger Zone (${s.danger})`
                  : `Safe Zone (${s.safe})`;
                const Icon = f === 'danger' ? AlertTriangle : f === 'safe' ? CheckCircle2 : List;
                const iconColor = f === 'danger' ? 'var(--primary)' : f === 'safe' ? 'var(--secondary)' : 'var(--outline)';
                return (
                  <button key={f} onClick={() => setFilter(f)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium transition"
                    style={{
                      background: active ? 'var(--surface-container-high)' : 'transparent',
                      color: active ? 'var(--on-surface)' : 'var(--on-surface-variant)',
                      border: active ? '1px solid var(--outline-variant)' : '1px solid transparent',
                    }}>
                    <Icon size={15} style={{ color: iconColor }} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-panel p-3 mt-auto">
            <p className="section-label mb-2">Quick Stats</p>
            <div className="text-[11px] space-y-1.5" style={{ color: 'var(--on-surface-variant)' }}>
              <div className="flex justify-between">
                <span>Avg Risk Score</span>
                <span className="font-mono font-medium" style={{ color: 'var(--tertiary)' }}>{s.averageScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Expiring Soon</span>
                <span className="font-mono font-medium" style={{ color: 'var(--primary)' }}>{expiringSoon}</span>
              </div>
              <div className="flex justify-between">
                <span>Reviews Total</span>
                <span className="font-mono font-medium">
                  {allContracts.reduce((sum, c) => sum + (c.reviewCount || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ══════ MAIN CONTENT ══════ */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Error Banner */}
          {error && (
            <div className="glass-panel flex items-center justify-between p-3" style={{ borderColor: 'rgba(146,0,39,0.5)' }}>
              <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--primary)' }}>
                <AlertTriangle size={16} /> {error}
              </div>
              <button onClick={loadData} className="btn-ghost text-[11px] px-3 py-1.5 flex items-center gap-1">
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-4 gap-4">
            {/* Total Portfolio */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="section-label">Total Tracked</span>
                <BarChart3 size={16} style={{ color: 'var(--outline)' }} />
              </div>
              <p className="font-display text-[28px] font-bold" style={{ color: 'var(--on-surface)' }}>
                {loading ? '—' : s.total}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--outline)' }}>Active agreements</p>
            </div>
            {/* Danger Zone */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="section-label" style={{ color: 'var(--primary)' }}>Danger Zone</span>
                <ShieldAlert size={16} style={{ color: 'var(--primary)' }} />
              </div>
              <p className="font-display text-[28px] font-bold" style={{ color: 'var(--primary)' }}>
                {loading ? '—' : s.danger}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--outline)' }}>Breach threshold</p>
            </div>
            {/* Expiring */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="section-label" style={{ color: 'var(--tertiary)' }}>Expiring Soon</span>
                <Clock size={16} style={{ color: 'var(--tertiary)' }} />
              </div>
              <p className="font-display text-[28px] font-bold" style={{ color: 'var(--tertiary)' }}>
                {loading ? '—' : expiringSoon}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--outline)' }}>Within 90 days</p>
            </div>
            {/* Avg Score */}
            <div className="kpi-card">
              <div className="flex items-center justify-between mb-2">
                <span className="section-label" style={{ color: 'var(--secondary)' }}>Avg Score</span>
                <CheckCircle2 size={16} style={{ color: 'var(--secondary)' }} />
              </div>
              <p className="font-display text-[28px] font-bold" style={{ color: 'var(--secondary)' }}>
                {loading ? '—' : `${s.averageScore}`}
              </p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--outline)' }}>Portfolio average</p>
            </div>
          </div>

          {/* ── Risk Board: Two Columns ── */}
          {loading && !portfolio ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: 'var(--outline)' }}>
              <RefreshCw size={22} className="animate-spin" style={{ color: 'var(--primary)' }} />
              <span className="text-[13px]">Fetching contracts from server…</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Danger Column */}
              <div className="risk-column">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={16} style={{ color: 'var(--primary)' }} />
                    <span className="section-label" style={{ color: 'var(--primary)' }}>
                      Danger Zone
                    </span>
                  </div>
                  <span className="badge-danger">{dangerList.length}</span>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
                  {dangerList.length === 0
                    ? <p className="text-[12px] text-center py-6" style={{ color: 'var(--outline)' }}>No danger contracts</p>
                    : dangerList.map(renderContractCard)}
                </div>
              </div>

              {/* Safe Column */}
              <div className="risk-column">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} style={{ color: 'var(--secondary)' }} />
                    <span className="section-label" style={{ color: 'var(--secondary)' }}>
                      Safe & Compliant
                    </span>
                  </div>
                  <span className="badge-safe">{safeList.length}</span>
                </div>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto pr-1">
                  {safeList.length === 0
                    ? <p className="text-[12px] text-center py-6" style={{ color: 'var(--outline)' }}>No safe contracts</p>
                    : safeList.map(renderContractCard)}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ══════ RIGHT DETAIL PANEL (380px) ══════ */}
        <aside className="detail-panel w-[380px] flex-shrink-0 overflow-y-auto p-5 space-y-4">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--outline)' }}>
              <ShieldAlert size={32} />
              <p className="text-[13px] text-center">Select a contract from the board<br />to view deep analysis</p>
            </div>
          ) : (
            <>
              {/* Contract Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selected.classification === 'danger'
                    ? <AlertOctagon size={18} style={{ color: 'var(--primary)' }} />
                    : <CheckCircle2 size={18} style={{ color: 'var(--secondary)' }} />}
                  <h2 className="font-display text-[16px] font-bold" style={{ color: 'var(--on-surface)' }}>
                    {selected.title}
                  </h2>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--outline)' }}>
                  {selected.counterparty} · {selected.contractType}
                </p>
              </div>

              {/* Score Card */}
              <div className="glass-panel p-4 flex items-center justify-between">
                <div>
                  <p className="section-label">Risk Score</p>
                  <p className="font-display text-[32px] font-bold"
                    style={{ color: selected.classification === 'danger' ? 'var(--primary)' : 'var(--secondary)' }}>
                    {selected.riskScore}<span className="text-[16px] font-normal" style={{ color: 'var(--outline)' }}>/100</span>
                  </p>
                </div>
                <span className={selected.classification === 'danger' ? 'badge-danger' : 'badge-safe'}
                  style={{ fontSize: '12px', padding: '4px 14px' }}>
                  {selected.classification === 'danger' ? 'DANGER' : 'SAFE'}
                </span>
              </div>

              {/* Metadata */}
              <div className="glass-panel p-4 space-y-2">
                <p className="section-label mb-2">Contract Details</p>
                <div className="text-[12px] space-y-2" style={{ color: 'var(--on-surface-variant)' }}>
                  <div className="flex justify-between">
                    <span>Annual Value</span>
                    <span className="font-mono" style={{ color: 'var(--on-surface)' }}>
                      {selected.currency} {selected.annualValue?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  {selected.deadline && (
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1"><Calendar size={12} /> Deadline</span>
                      <span className="font-mono" style={{ color: 'var(--tertiary)' }}>
                        {selected.deadline}{selected.daysUntilDeadline != null ? ` (${selected.daysUntilDeadline}d)` : ''}
                      </span>
                    </div>
                  )}
                  {selected.dangerThreshold && (
                    <div className="flex justify-between">
                      <span>Danger Threshold</span>
                      <span className="font-mono">{selected.dangerThreshold}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Driving Risk Clause */}
              {selected.drivingClause && (
                <div className="glass-panel p-4 space-y-2"
                  style={{ borderColor: selected.classification === 'danger' ? 'rgba(146,0,39,0.4)' : 'var(--outline-variant)' }}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} style={{ color: 'var(--primary)' }} />
                    <p className="section-label" style={{ color: 'var(--primary)' }}>
                      Driving Risk Clause
                    </p>
                  </div>
                  <p className="text-[11px] font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                    {selected.drivingClause.label}
                  </p>
                  <blockquote className="text-[12px] italic pl-3 py-1.5 rounded-r-lg"
                    style={{
                      color: 'var(--on-primary-container)',
                      borderLeft: '2px solid var(--primary)',
                      background: 'rgba(146,0,39,0.08)',
                    }}>
                    "{selected.drivingClause.clauseText || 'No clause text'}"
                  </blockquote>
                  {selected.drivingClause.rationale && (
                    <p className="text-[11px]" style={{ color: 'var(--outline)' }}>
                      <strong style={{ color: 'var(--on-surface-variant)' }}>Analysis:</strong>{' '}
                      {selected.drivingClause.rationale}
                    </p>
                  )}
                </div>
              )}

              {/* Benefits */}
              {(selected as any).benefits && Array.isArray((selected as any).benefits) && (
                <div className="glass-panel p-4 space-y-2">
                  <p className="section-label" style={{ color: 'var(--secondary)' }}>Benefits</p>
                  <ul className="text-[12px] space-y-1" style={{ color: 'var(--on-surface-variant)' }}>
                    {((selected as any).benefits as string[]).map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="mt-0.5" style={{ color: 'var(--secondary)' }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommended Action */}
              <div className="glass-panel p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Zap size={14} style={{ color: 'var(--secondary)' }} />
                  <p className="section-label" style={{ color: 'var(--secondary)' }}>Sentinel Recommendation</p>
                </div>
                <p className="text-[12px] font-medium" style={{ color: 'var(--on-surface)' }}>
                  {typeof selected.recommendedAction === 'object'
                    ? (selected.recommendedAction as any)?.label || 'Review required'
                    : selected.recommendedAction || 'Review required'}
                </p>
                {(() => {
                  const tp = typeof selected.recommendedAction === 'object'
                    ? (selected.recommendedAction as any)?.talkingPoints || []
                    : selected.talkingPoints || [];
                  if (tp.length === 0) return null;
                  return (
                    <ul className="text-[11px] space-y-1 pl-1" style={{ color: 'var(--on-surface-variant)' }}>
                      {tp.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <ChevronRight size={12} className="mt-0.5" style={{ color: 'var(--outline)' }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-1.5 pt-1 text-[10px]" style={{ color: 'var(--outline)' }}>
                <Scale size={12} className="mt-0.5 flex-shrink-0" />
                <span>{selected.disclaimer || portfolio?.disclaimer || 'Automated heuristic clause assessment. Not formal legal advice.'}</span>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ═══════ INGEST MODAL ═══════ */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 mb-4"
              style={{ borderBottom: '1px solid var(--outline-variant)' }}>
              <h3 className="font-display text-[15px] font-bold flex items-center gap-2"
                style={{ color: 'var(--on-surface)' }}>
                <Plus size={18} style={{ color: 'var(--secondary)' }} />
                Ingest & Analyze Contract
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:opacity-80"
                style={{ color: 'var(--outline)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleIngest} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] mb-1 font-medium" style={{ color: 'var(--outline)' }}>
                    Contract Title
                  </label>
                  <input type="text" required placeholder="e.g. Master Services Agreement"
                    value={ingestForm.title}
                    onChange={e => setForm({ ...ingestForm, title: e.target.value })}
                    className="form-input" />
                </div>
                <div>
                  <label className="block text-[11px] mb-1 font-medium" style={{ color: 'var(--outline)' }}>
                    Counterparty
                  </label>
                  <input type="text" placeholder="e.g. Acme Cloud Ltd"
                    value={ingestForm.counterparty}
                    onChange={e => setForm({ ...ingestForm, counterparty: e.target.value })}
                    className="form-input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] mb-1 font-medium" style={{ color: 'var(--outline)' }}>
                    Contract Type
                  </label>
                  <input type="text" value={ingestForm.contractType}
                    onChange={e => setForm({ ...ingestForm, contractType: e.target.value })}
                    className="form-input" />
                </div>
                <div>
                  <label className="block text-[11px] mb-1 font-medium" style={{ color: 'var(--outline)' }}>
                    Annual Value
                  </label>
                  <input type="number" value={ingestForm.annualValue}
                    onChange={e => setForm({ ...ingestForm, annualValue: e.target.value })}
                    className="form-input" />
                </div>
                <div>
                  <label className="block text-[11px] mb-1 font-medium" style={{ color: 'var(--outline)' }}>
                    Deadline
                  </label>
                  <input type="date" value={ingestForm.deadline}
                    onChange={e => setForm({ ...ingestForm, deadline: e.target.value })}
                    className="form-input" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] mb-1 font-medium" style={{ color: 'var(--outline)' }}>
                  Contract Clause Text
                </label>
                <textarea rows={4} required
                  placeholder="Paste agreement text or key risk clauses here..."
                  value={ingestForm.contractText}
                  onChange={e => setForm({ ...ingestForm, contractText: e.target.value })}
                  className="form-input" style={{ resize: 'vertical' }} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={isIngesting} className="btn-primary">
                  {isIngesting ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
                  {isIngesting ? 'Analyzing...' : 'Submit & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ FLOATING AI BUTTON ═══════ */}
      <button className="ai-fab" onClick={() => setChatOpen(!chatOpen)} title="Ask C Sentinel AI">
        {chatOpen ? <X size={22} /> : <Bot size={22} />}
      </button>

      {/* AI Chat Panel (slide-up) */}
      {chatOpen && (
        <div className="fixed bottom-20 right-6 z-50" style={{ width: 340 }}>
          <div className="glass-panel overflow-hidden flex flex-col" style={{ height: 400 }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>
              <div className="flex items-center gap-2">
                <Bot size={18} />
                <span className="font-display text-[13px] font-bold">C Sentinel AI</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="hover:opacity-80"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--primary-container)' }}>
                  <Bot size={13} style={{ color: 'var(--on-primary-container)' }} />
                </div>
                <div className="glass-card p-3 text-[12px]" style={{ color: 'var(--on-surface-variant)' }}>
                  Hello! I'm your contract sentinel AI. Ask me about any contract risk, clause analysis, or portfolio insights.
                </div>
              </div>
            </div>
            <div className="p-3" style={{ borderTop: '1px solid var(--outline-variant)' }}>
              <div className="flex gap-2">
                <input type="text" placeholder="Ask about contracts…"
                  className="form-input flex-1" />
                <button className="btn-primary px-3 py-2">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
