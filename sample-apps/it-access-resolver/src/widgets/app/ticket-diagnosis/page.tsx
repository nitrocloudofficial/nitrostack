'use client';

import React, { useState, useEffect } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DiagnosisResult {
  rootCause: 'none' | 'not_in_group' | 'no_license' | 'network_issue' | 'account_suspended' | 'unknown';
  detail: string;
  fixable: boolean;
}

interface IdentityCheckResult {
  found?: boolean;
  employeeId?: string;
  name?: string;
  status?: string;
  groups?: string[];
  department?: string;
  error?: string;
}

interface GroupCheckResult {
  found?: boolean;
  employeeId?: string;
  toolName?: string;
  requiredGroup?: string | null;
  inGroup?: boolean;
}

interface LicenseCheckResult {
  found?: boolean;
  toolName?: string;
  totalSeats?: number;
  usedSeats?: number;
  seatsAvailable?: number;
  requiresGroup?: string;
}

interface NetworkCheckResult {
  found?: boolean;
  employeeId?: string;
  vpnConnected?: boolean;
  deviceTrusted?: boolean;
  lastHandshake?: string;
  errorCode?: string;
}

interface DiagnosisOutput {
  ticketId: string;
  status: string;
  checks: {
    identity: IdentityCheckResult;
    groupMembership: GroupCheckResult;
    licenseAvailability: LicenseCheckResult;
    networkStatus: NetworkCheckResult;
  };
  diagnosis: DiagnosisResult;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROOT_CAUSE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  none:              { icon: '✅', label: 'Systems Healthy & Resolved (Closed)', color: '#10b981' },
  not_in_group:      { icon: '👥', label: 'Missing Group Access', color: '#f59e0b' },
  no_license:        { icon: '🔑', label: 'No License Seat',      color: '#8b5cf6' },
  network_issue:     { icon: '📡', label: 'VPN / Network Issue',  color: '#3b82f6' },
  account_suspended: { icon: '🔒', label: 'Account Not Active',   color: '#ef4444' },
  unknown:           { icon: '⚠️', label: 'Unrecognized / Resource Not Found', color: '#ef4444' },
};

// ─── CheckRow ─────────────────────────────────────────────────────────────────

function CheckRow({
  icon, label, pass, detail, isDark,
}: {
  icon: string; label: string; pass: boolean | null; detail: string; isDark: boolean;
}) {
  const color = pass === null ? '#6b7280' : pass ? '#10b981' : '#ef4444';
  const bg    = pass === null ? 'rgba(107,114,128,0.1)' : pass ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
  const tick  = pass === null ? '—' : pass ? '✓' : '✗';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, background: bg, marginBottom: 8 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#f1f5f9' : '#0f172a' }}>{label}</div>
        <div style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#64748b', marginTop: 2 }}>{detail}</div>
      </div>
      <span style={{ fontSize: 14, fontWeight: 700, color, flexShrink: 0, marginTop: 2 }}>{tick}</span>
    </div>
  );
}

// ─── Inner Component (only rendered client-side) ──────────────────────────────

function Diagnosis() {
  const theme = useTheme();
  const { getToolOutput, sendFollowUpMessage, callTool } = useWidgetSDK();
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [allTicketsList, setAllTicketsList] = useState<any[] | null>(null);

  function extractTickets(raw: any): any[] | null {
    let item = raw;
    if (item && (item.result || item.output || item.data)) {
      item = item.result || item.output || item.data;
    }
    if (item && Array.isArray(item.content) && item.content.length > 0) {
      try { item = JSON.parse(item.content[0].text); } catch (e) {}
    }
    if (item && typeof item === 'string') {
      try { item = JSON.parse(item); } catch (e) {}
    }
    if (Array.isArray(item)) return item;
    if (item && Array.isArray(item.allTickets)) return item.allTickets;
    return null;
  }

  const rawData = getToolOutput<DiagnosisOutput>();
  const [localData, setLocalData] = useState<DiagnosisOutput | null>(null);

  useEffect(() => {
    if (rawData && !localData) setLocalData(rawData);
  }, [rawData, localData]);

  const data = localData || rawData;
  const isDark = theme === 'dark';
  const surface = isDark ? '#0f172a' : '#f8fafc';
  const card    = isDark ? '#1e293b' : '#ffffff';
  const border  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const text    = isDark ? '#f1f5f9' : '#0f172a';
  const muted   = isDark ? '#94a3b8' : '#64748b';

  if (!data || !data.checks || !data.diagnosis) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: muted, fontFamily: 'system-ui, sans-serif', background: surface, minHeight: '100%' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        <p style={{ margin: 0, fontSize: 14 }}>Waiting for diagnosis results…</p>
      </div>
    );
  }

  const { ticketId, checks, diagnosis } = data;
  const rootCfg = ROOT_CAUSE_CONFIG[diagnosis.rootCause] ?? ROOT_CAUSE_CONFIG['unknown'];

  const identityPass = checks.identity.found !== false && checks.identity.status === 'active';
  const groupPass: boolean | null = checks.groupMembership.found === false ? null : (checks.groupMembership.inGroup ?? true);
  const licensePass: boolean | null = checks.licenseAvailability.found === false ? null : ((checks.licenseAvailability.seatsAvailable ?? 1) > 0);
  const networkPass: boolean | null = checks.networkStatus.found === false ? null : (checks.networkStatus.vpnConnected ?? true);

  return (
    <div style={{ background: surface, minHeight: '100%', fontFamily: "'Inter', system-ui, sans-serif", color: text }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${rootCfg.color} 0%, ${rootCfg.color}bb 100%)`, padding: '20px 24px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 28 }}>{rootCfg.icon}</span>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{rootCfg.label}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.85 }}>
              {ticketId} · {diagnosis.rootCause.replace(/_/g, ' ')}
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: 'rgba(255,255,255,0.2)', padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap' as const,
          }}>
            {diagnosis.fixable ? '🔧 Auto-fixable' : '🚨 Needs escalation'}
          </span>
        </div>
        <div style={{
          marginTop: 12, background: 'rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '8px 14px', fontSize: 13, backdropFilter: 'blur(4px)',
        }}>
          {diagnosis.detail}
        </div>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>

        {/* Diagnostic check rows */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 10 }}>
            Diagnostic Checks
          </div>
          <CheckRow icon="🪪" label="Identity & Account Status" isDark={isDark} pass={identityPass}
            detail={checks.identity.found === false
              ? 'Employee not found in directory'
              : `${checks.identity.name ?? checks.identity.employeeId} — status: ${checks.identity.status}`}
          />
          <CheckRow icon="👥" label="Group Membership" isDark={isDark} pass={groupPass}
            detail={checks.groupMembership.found === false
              ? 'Tool or employee not found'
              : checks.groupMembership.requiredGroup
                ? `Required: ${checks.groupMembership.requiredGroup} — ${checks.groupMembership.inGroup ? 'member ✓' : 'NOT a member ✗'}`
                : 'No group required for this tool'}
          />
          <CheckRow icon="🪑" label="License Availability" isDark={isDark} pass={licensePass}
            detail={checks.licenseAvailability.found === false
              ? 'Tool not found in license registry'
              : `${checks.licenseAvailability.seatsAvailable ?? 0} seat(s) available of ${checks.licenseAvailability.totalSeats ?? '?'} total`}
          />
          <CheckRow icon="📡" label="VPN / Network Status" isDark={isDark} pass={networkPass}
            detail={checks.networkStatus.found === false
              ? 'No network record found'
              : checks.networkStatus.vpnConnected
                ? `Connected · device trusted: ${checks.networkStatus.deviceTrusted}`
                : `Not connected · error: ${checks.networkStatus.errorCode ?? 'unknown'}`}
          />
        </div>

        {/* Root cause card */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 8 }}>Root Cause</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{rootCfg.icon}</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: rootCfg.color }}>{rootCfg.label}</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{diagnosis.detail}</div>
            </div>
          </div>
        </div>

        {/* Action buttons or Success/Escalation confirmation */}
        {(fixResult || (data.status === 'resolved' && diagnosis.rootCause !== 'unknown') || diagnosis.rootCause === 'none') ? (() => {
          const isResolved = (fixResult?.success === true) || (data.status === 'resolved' && !fixResult?.escalated) || (diagnosis.rootCause === 'none' && !fixResult?.escalated);
          const bg = isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
          const borderColor = isResolved ? '#10b981' : '#ef4444';
          const titleColor = isResolved ? '#10b981' : '#ef4444';
          return (
            <div style={{ background: bg, border: `1px solid ${borderColor}`, borderRadius: 12, padding: '18px', textAlign: 'center', color: text, marginBottom: 16 }}>
              <div style={{ fontSize: 26, marginBottom: 8, color: titleColor, fontWeight: 700 }}>
                {isResolved ? '🎉 Ticket Resolved & Closed!' : '🚨 Ticket Escalated to IT Admins!'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: titleColor }}>
                {isResolved 
                  ? `Ticket ${ticketId} has been resolved (closed) with all access confirmed.`
                  : `Ticket ${ticketId} requires human intervention and has been assigned to Level-2 Support.`}
              </div>
              <div style={{ fontSize: 12, color: muted, marginTop: 6 }}>
                {isResolved 
                  ? '✓ Automated repair action completed and SOC-2 audit log recorded.'
                  : `✓ Escalation recorded in SOC-2 audit log with reason: ${diagnosis.detail}`}
              </div>
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={async () => {
                    if (allTicketsList) {
                      setAllTicketsList(null);
                      return;
                    }
                    const existing = extractTickets(fixResult);
                    if (existing) {
                      setAllTicketsList(existing);
                      return;
                    }
                    if (callTool) {
                      try {
                        const res = await callTool('ticket_get_all_tickets', {});
                        const found = extractTickets(res);
                        if (found) setAllTicketsList(found);
                      } catch (e) {}
                    }
                  }}
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${border}`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: card, color: text }}
                >
                  {allTicketsList ? '✕ Hide Updated Tickets Backlog' : '📋 View Updated Tickets Backlog'}
                </button>
              </div>
            </div>
          );
        })() : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {diagnosis.fixable ? (
              <button
                disabled={fixing}
                onClick={async () => {
                  setFixing(true);
                  try {
                    if (callTool) {
                      const res = await callTool('ticket_apply_fix', { ticketId });
                      setFixResult(res);
                      const found = extractTickets(res);
                      if (found) setAllTicketsList(found);
                      try {
                        const toolToTest = checks.licenseAvailability?.toolName || checks.groupMembership?.toolName || 'Figma';
                        let refreshed: any = await callTool('ticket_run_full_diagnosis', { ticketId, toolName: toolToTest });
                        if (refreshed && (refreshed.result || refreshed.output || refreshed.data)) {
                          refreshed = refreshed.result || refreshed.output || refreshed.data;
                        }
                        if (refreshed && typeof refreshed === 'string') {
                          try { refreshed = JSON.parse(refreshed); } catch (e) {}
                        }
                        if (refreshed && refreshed.checks) {
                          setLocalData(refreshed);
                        }
                      } catch (e) {}
                    } else if (sendFollowUpMessage) {
                      sendFollowUpMessage(`Apply the fix for ticket ${ticketId}`);
                    }
                  } catch (e) {
                    try { sendFollowUpMessage?.(`Apply the fix for ticket ${ticketId}`); } catch (err) {}
                  } finally {
                    setFixing(false);
                  }
                }}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: fixing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, background: fixing ? '#94a3b8' : 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }}
              >
                {fixing ? '⏳ Applying Fix…' : '🔧 Apply Fix Now'}
              </button>
            ) : (
              <button
                disabled={fixing}
                onClick={async () => {
                  setFixing(true);
                  try {
                    if (callTool) {
                      const res = await callTool('ticket_apply_fix', { ticketId });
                      setFixResult(res);
                      const found = extractTickets(res);
                      if (found) setAllTicketsList(found);
                      try {
                        const toolToTest = checks.licenseAvailability?.toolName || checks.groupMembership?.toolName || 'Figma';
                        let refreshed: any = await callTool('ticket_run_full_diagnosis', { ticketId, toolName: toolToTest });
                        if (refreshed && (refreshed.result || refreshed.output || refreshed.data)) {
                          refreshed = refreshed.result || refreshed.output || refreshed.data;
                        }
                        if (refreshed && typeof refreshed === 'string') {
                          try { refreshed = JSON.parse(refreshed); } catch (e) {}
                        }
                        if (refreshed && refreshed.checks) {
                          setLocalData(refreshed);
                        }
                      } catch (e) {}
                    } else if (sendFollowUpMessage) {
                      sendFollowUpMessage(`Escalate ticket ${ticketId} — root cause is ${diagnosis.rootCause}, not auto-fixable`);
                    }
                  } catch (e) {
                    try { sendFollowUpMessage?.(`Escalate ticket ${ticketId}`); } catch (err) {}
                  } finally {
                    setFixing(false);
                  }
                }}
                style={{ flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none', cursor: fixing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, background: fixing ? '#94a3b8' : 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white' }}
              >
                {fixing ? '⏳ Escalating…' : '🚨 Escalate to IT Admin'}
              </button>
            )}
            <button
              onClick={async () => {
                if (allTicketsList) {
                  setAllTicketsList(null);
                  return;
                }
                if (callTool) {
                  try {
                    const res = await callTool('ticket_get_all_tickets', {});
                    const found = extractTickets(res);
                    if (found) setAllTicketsList(found);
                  } catch (e) {}
                }
              }}
              style={{ padding: '10px 16px', borderRadius: 10, border: `1px solid ${border}`, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', color: muted }}
            >
              {allTicketsList ? '✕ Hide All Tickets' : '📋 All Tickets'}
            </button>
          </div>
        )}

        {/* Real-time inline tickets backlog display when requested */}
        {allTicketsList && (
          <div style={{ marginTop: 24, borderTop: `1px solid ${border}`, paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: text, marginBottom: 12 }}>📋 Live Enterprise Helpdesk Backlog</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allTicketsList.map((t: any) => (
                <div key={t.id} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: t.status === 'resolved' ? 'rgba(16,185,129,0.15)' : t.status === 'open' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)', color: t.status === 'resolved' ? '#10b981' : t.status === 'open' ? '#6366f1' : '#f59e0b' }}>
                        {t.status === 'resolved' ? '✅ Resolved' : t.status === 'open' ? '📋 Open' : '🔍 Diagnosing'}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: text, fontFamily: 'monospace' }}>{t.id}</span>
                      <span style={{ fontSize: 12, color: muted }}>· {t.employeeId}</span>
                    </div>
                    <div style={{ fontSize: 12, color: text }}>{t.issueText}</div>
                    {t.resolutionSteps && t.resolutionSteps.length > 0 && (
                      <div style={{ fontSize: 11, color: '#10b981', marginTop: 6 }}>✓ {t.resolutionSteps[t.resolutionSteps.length - 1]}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page — SSR guard ─────────────────────────────────────────────────────────

export default function TicketDiagnosis() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <Diagnosis />;
}
