'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK, useTheme, useWidgetState } from '@nitrostack/widgets';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiagnosisResult {
  rootCause: 'not_in_group' | 'no_license' | 'network_issue' | 'account_suspended' | 'unknown';
  detail: string;
  fixable: boolean;
}

interface Ticket {
  id: string;
  employeeId: string;
  issueText: string;
  status: 'open' | 'diagnosing' | 'resolved' | 'escalated';
  diagnosis?: DiagnosisResult;
  resolutionSteps: string[];
  createdAt: string;
  resolvedAt?: string;
}

type FilterKey = Ticket['status'] | 'all';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Ticket['status'], { label: string; color: string; bg: string; icon: string }> = {
  open:       { label: 'Open',       color: '#6366f1', bg: 'rgba(99,102,241,0.15)',  icon: '📋' },
  diagnosing: { label: 'Diagnosing', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  icon: '🔍' },
  resolved:   { label: 'Resolved (Closed)',   color: '#10b981', bg: 'rgba(16,185,129,0.15)',  icon: '✅' },
  escalated:  { label: 'Escalated',  color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   icon: '🚨' },
};

const ROOT_CAUSE_ICON: Record<string, string> = {
  not_in_group:      '👥',
  no_license:        '🔑',
  network_issue:     '📡',
  account_suspended: '🔒',
  unknown:           '❓',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Create Ticket Modal (uses callTool — zero credits) ───────────────────────

function CreateTicketModal({
  onClose, onCreated, isDark, card, border, text, muted,
}: {
  onClose: () => void;
  onCreated: (t: any) => void;
  isDark: boolean; card: string; border: string; text: string; muted: string;
}) {
  const { callTool } = useWidgetSDK();
  const [employeeId, setEmployeeId] = useState('');
  const [issueText, setIssueText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!employeeId.trim() || !issueText.trim()) {
      setError('Both fields are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await callTool('ticket_create_ticket', {
        employeeId: employeeId.trim(),
        issueText: issueText.trim(),
      });
      onCreated(result);
      onClose();
    } catch (e) {
      setError('Failed to create ticket. Please try again.');
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${border}`, background: isDark ? '#0f172a' : '#f8fafc',
    color: text, fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: card, borderRadius: 16, padding: 24,
          width: '100%', maxWidth: 400,
          border: `1px solid ${border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: text }}>🎫 New Support Ticket</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: muted }}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            Employee ID
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. E101"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
            Issue Description
          </label>
          <textarea
            style={{ ...inputStyle, height: 90, resize: 'vertical' as const }}
            placeholder="Describe the access problem…"
            value={issueText}
            onChange={e => setIssueText(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 14, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8 }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700,
              background: submitting ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', transition: 'opacity 0.15s',
            }}
          >
            {submitting ? '⏳ Creating…' : '✅ Create Ticket'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px', borderRadius: 10, border: `1px solid ${border}`,
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'transparent', color: muted,
            }}
          >
            Cancel
          </button>
        </div>

        <p style={{ margin: '14px 0 0', fontSize: 11, color: muted, textAlign: 'center' as const }}>
          ⚡ Uses <code style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: 4 }}>callTool</code> — zero Compose credits
        </p>
      </div>
    </div>
  );
}

// ─── Inner Dashboard Component ────────────────────────────────────────────────

function Dashboard() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage, callTool, requestFullscreen, requestInline } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ filter: FilterKey; selected: string | null; fullscreen: boolean }>(
    () => ({ filter: 'all', selected: null, fullscreen: false }),
  );
  const [localTickets, setLocalTickets] = useState<Ticket[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const serverOutput = getToolOutput<any>();

  // Extract ticket list regardless of which tool triggered this dashboard (get_all_tickets, create_ticket, apply_fix, or get_ticket)
  useEffect(() => {
    let output = serverOutput;
    if (output && (output.result || output.output || output.data)) {
      output = output.result || output.output || output.data;
    }
    if (output && Array.isArray(output.content) && output.content.length > 0) {
      try { output = JSON.parse(output.content[0].text); } catch (e) {}
    }
    if (output && typeof output === 'string') {
      try { output = JSON.parse(output); } catch (e) {}
    }
    if (!output) return;
    if (Array.isArray(output)) {
      setLocalTickets(output);
    } else if (output && Array.isArray(output.allTickets)) {
      setLocalTickets(output.allTickets);
    } else if (output && output.id && output.status && !output.allTickets) {
      setLocalTickets([output]);
    } else if (output && output.ticket) {
      setLocalTickets([output.ticket]);
    }
  }, [serverOutput]);

  const tickets = localTickets;
  const isDark = theme === 'dark';
  const surface = isDark ? '#0f172a' : '#f8fafc';
  const card    = isDark ? '#1e293b' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text    = isDark ? '#f1f5f9' : '#0f172a';
  const muted   = isDark ? '#94a3b8' : '#64748b';

  const activeFilter: FilterKey = state?.filter ?? 'all';
  const selectedId: string | null = state?.selected ?? null;
  const isFullscreen: boolean = state?.fullscreen ?? false;

  if (!tickets || !Array.isArray(tickets)) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: muted, fontFamily: 'system-ui, sans-serif', background: surface, minHeight: '100%' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎫</div>
        <p style={{ margin: 0, fontSize: 14 }}>Loading tickets…</p>
      </div>
    );
  }

  const counts: Record<FilterKey, number> = {
    all:       tickets.length,
    open:      tickets.filter(t => t.status === 'open').length,
    diagnosing:tickets.filter(t => t.status === 'diagnosing').length,
    resolved:  tickets.filter(t => t.status === 'resolved').length,
    escalated: tickets.filter(t => t.status === 'escalated').length,
  };

  const filtered = activeFilter === 'all' ? tickets : tickets.filter(t => t.status === activeFilter);
  const FILTERS: FilterKey[] = ['all', 'open', 'diagnosing', 'resolved', 'escalated'];

  function handleTicketCreated(rawRes: any) {
    let res = rawRes;
    if (res && (res.result || res.output || res.data)) {
      res = res.result || res.output || res.data;
    }
    if (res && Array.isArray(res.content) && res.content.length > 0) {
      try { res = JSON.parse(res.content[0].text); } catch (e) {}
    }
    if (res && typeof res === 'string') {
      try { res = JSON.parse(res); } catch (e) {}
    }

    if (res && Array.isArray(res.allTickets)) {
      setLocalTickets(res.allTickets);
    } else if (res && res.id && res.status) {
      setLocalTickets(prev => {
        const exists = (prev ?? []).some(t => t.id === res.id);
        return exists ? (prev ?? []).map(t => t.id === res.id ? res : t) : [...(prev ?? []), res];
      });
    }
  }

  function toggleFullscreen() {
    if (isFullscreen) {
      requestInline?.();
      setState({ ...state, fullscreen: false, selected: null });
    } else {
      requestFullscreen?.();
      setState({ ...state, fullscreen: true, selected: null });
    }
  }

  return (
    <div style={{ background: surface, minHeight: '100%', fontFamily: "'Inter', system-ui, sans-serif", color: text, position: 'relative' }}>

      {/* Create Ticket Modal */}
      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreated={handleTicketCreated}
          isDark={isDark} card={card} border={border} text={text} muted={muted}
        />
      )}

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '16px 20px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>IT Access Resolver</h2>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} · live dashboard</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Create Ticket button — callTool, zero credits */}
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: 12,
                fontWeight: 600, backdropFilter: 'blur(4px)',
              }}
            >
              ＋ New Ticket
            </button>
            {/* Fullscreen toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              style={{
                padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', fontSize: 14,
              }}
            >
              {isFullscreen ? '⊡' : '⛶'}
            </button>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 16px', overflowX: 'auto', borderBottom: `1px solid ${border}` }}>
        {FILTERS.map(f => {
          const cfg = f !== 'all' ? STATUS_CONFIG[f] : null;
          const isActive = activeFilter === f;
          return (
            <button
              key={f}
              onClick={() => setState({ ...state, filter: f, selected: null })}
              style={{
                padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap' as const,
                background: isActive ? (cfg?.color ?? '#6366f1') : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'),
                color: isActive ? 'white' : muted, transition: 'all 0.15s',
              }}
            >
              {cfg?.icon ?? '📊'} {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          );
        })}
      </div>

      {/* Ticket list */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: muted, fontSize: 14 }}>
            No tickets in this category.
            {activeFilter === 'all' && (
              <div style={{ marginTop: 12 }}>
                <button onClick={() => setShowCreate(true)} style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ＋ Create First Ticket
                </button>
              </div>
            )}
          </div>
        )}

        {filtered.map(ticket => {
          const cfg = STATUS_CONFIG[ticket.status];
          const isSelected = selectedId === ticket.id;
          return (
            <div
              key={ticket.id}
              onClick={() => setState({ ...state, selected: isSelected ? null : ticket.id })}
              style={{
                background: card, border: `1px solid ${isSelected ? cfg.color : border}`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: isSelected ? `0 0 0 2px ${cfg.color}33` : '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 10 }}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: muted, fontFamily: 'monospace' }}>{ticket.id}</span>
                    <span style={{ fontSize: 11, color: muted }}>· {ticket.employeeId}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: text }}>{ticket.issueText}</p>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${border}`, paddingTop: 14 }}>
                  {ticket.diagnosis && (
                    <div style={{ marginBottom: 12, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Diagnosis</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: 20 }}>{ROOT_CAUSE_ICON[ticket.diagnosis.rootCause] ?? '❓'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: text }}>{ticket.diagnosis.rootCause.replace(/_/g, ' ')}</div>
                          <div style={{ fontSize: 12, color: muted }}>{ticket.diagnosis.detail}</div>
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: ticket.diagnosis.fixable ? '#10b981' : '#ef4444',
                          background: ticket.diagnosis.fixable ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                          padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap' as const,
                        }}>
                          {ticket.diagnosis.fixable ? 'Auto-fixable' : 'Needs escalation'}
                        </span>
                      </div>
                    </div>
                  )}

                  {ticket.resolutionSteps.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: muted, marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>Steps taken</div>
                      {ticket.resolutionSteps.map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: text, marginBottom: 4 }}>
                          <span style={{ color: '#10b981', flexShrink: 0 }}>✓</span><span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: muted, marginBottom: 12 }}>
                    Created {formatDate(ticket.createdAt)}
                    {ticket.resolvedAt ? ` · Closed ${formatDate(ticket.resolvedAt)}` : ''}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {ticket.status === 'open' && (
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (callTool) {
                            try {
                              let toolName = 'Slack';
                              if (ticket.issueText.toLowerCase().includes('figma')) toolName = 'Figma';
                              else if (ticket.issueText.toLowerCase().includes('shared')) toolName = 'SharedDrive';
                              else if (ticket.issueText.toLowerCase().includes('vpn')) toolName = 'VPN';
                              await callTool('ticket_run_full_diagnosis', { ticketId: ticket.id, toolName });
                              const res = await callTool('ticket_get_all_tickets', {});
                              handleTicketCreated(res);
                            } catch (err) {}
                          } else {
                            try { sendFollowUpMessage?.(`Run full diagnosis on ticket ${ticket.id} for the tool mentioned in the issue`); } catch (err) {}
                          }
                        }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#6366f1', color: 'white' }}
                      >🔍 Diagnose</button>
                    )}
                    {ticket.status === 'diagnosing' && ticket.diagnosis?.fixable && (
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (callTool) {
                            try {
                              const res = await callTool('ticket_apply_fix', { ticketId: ticket.id });
                              handleTicketCreated(res);
                            } catch (err) {}
                          } else {
                            try { sendFollowUpMessage?.(`Apply the fix for ticket ${ticket.id}`); } catch (err) {}
                          }
                        }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#10b981', color: 'white' }}
                      >🔧 Apply Fix</button>
                    )}
                    {ticket.status === 'diagnosing' && ticket.diagnosis && !ticket.diagnosis.fixable && (
                      <button
                        onClick={async e => {
                          e.stopPropagation();
                          if (callTool) {
                            try {
                              const res = await callTool('ticket_apply_fix', { ticketId: ticket.id });
                              handleTicketCreated(res);
                            } catch (err) {}
                          } else {
                            try { sendFollowUpMessage?.(`Escalate ticket ${ticket.id} to IT admin`); } catch (err) {}
                          }
                        }}
                        style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#ef4444', color: 'white' }}
                      >🚨 Escalate</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page — SSR guard ─────────────────────────────────────────────────────────

export default function TicketDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <Dashboard />;
}
