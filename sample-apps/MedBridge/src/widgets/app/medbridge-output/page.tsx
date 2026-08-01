'use client';

import { type CSSProperties, useState } from 'react';
import { useWidgetSDK, useTheme } from '@nitrostack/widgets';

interface ToolOutputData {
  patientId?: string;
  drug?: string;
  safe?: boolean;
  checkedSources?: string[];
  conflicts?: Array<string | {
    field?: string;
    severity?: string;
    description?: string;
    sources?: Array<{ source?: string; value?: string; asOf?: string }>;
    source?: string;
    allergyOnFile?: string;
    asOf?: string;
    recommendation?: string;
  }>;
  agreed?: Array<string | { field?: string; value?: string; citations?: Array<{ source?: string; asOf?: string }> }>;
  entries?: Array<{
    patientId: string;
    timestamp: string;
    actor?: string;
    accessedBy?: string;
    tool: string;
    reason: string;
  }>;
  summaryText?: string;
}

const sectionStyle: CSSProperties = {
  marginBottom: '20px',
  padding: '20px',
  borderRadius: '16px',
  background: 'rgba(255,255,255,0.08)',
};

const labelStyle: CSSProperties = {
  fontWeight: 700,
  marginBottom: '8px',
  display: 'block',
};

export default function MedBridgeOutput() {
  const theme = useTheme();
  const { getToolOutput, callTool } = useWidgetSDK();
  const data = getToolOutput<ToolOutputData>();

  if (!data) {
    return (
      <div style={{ padding: '24px', color: theme === 'dark' ? '#fff' : '#111' }}>
        Loading tool output...
      </div>
    );
  }

  const isDark = theme === 'dark';
  const containerStyle: React.CSSProperties = {
    padding: '20px',
    color: isDark ? '#f8fafc' : '#111827',
    background: isDark ? '#0f172a' : '#f8fafc',
    minHeight: '100vh',
  };
  const cardBackground = isDark ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const textColor = isDark ? '#f8fafc' : '#111827';
  const accentColor = isDark ? '#60a5fa' : '#2563eb';

  // Widget interactive state for in-widget doctor registration and report sharing
  const [doctorName, setDoctorName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [contact, setContact] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');

  const renderConflictRows = () => {
    if (!Array.isArray(data.conflicts) || data.conflicts.length === 0) {
      return null;
    }

    const firstConflict = data.conflicts[0];
    const hasStructuredField = typeof firstConflict === 'object' && firstConflict !== null && 'field' in firstConflict;
    const hasAllergyRow = typeof firstConflict === 'object' && firstConflict !== null && 'source' in firstConflict && 'allergyOnFile' in firstConflict;

    if (hasStructuredField) {
      return (
        <div style={sectionStyle}>
          <div style={labelStyle}>Reconciliation conflicts</div>
          {data.conflicts.map((conflict, index) => {
            if (typeof conflict !== 'object' || conflict === null) {
              return (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div>{String(conflict)}</div>
                </div>
              );
            }
            const sources = Array.isArray(conflict.sources) ? conflict.sources : [];
            return (
              <div key={index} style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, color: accentColor }}>{conflict.field ?? 'Conflict'}</div>
                {conflict.severity && (
                  <div style={{ opacity: 0.85, marginBottom: '8px' }}>Severity: {conflict.severity}</div>
                )}
                {conflict.description && <div style={{ marginBottom: '8px' }}>{conflict.description}</div>}
                {sources.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Source</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Value</th>
                        <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>As of</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sources.map((source, rowIndex) => (
                        <tr key={rowIndex}>
                          <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{source.source ?? 'Unknown'}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{source.value ?? 'N/A'}</td>
                          <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{source.asOf ?? 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (hasAllergyRow) {
      return (
        <div style={sectionStyle}>
          <div style={labelStyle}>Drug allergy conflicts</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Source</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Allergy</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {data.conflicts.map((conflict, rowIndex) => (
                <tr key={rowIndex}>
                  <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{(conflict as any).source ?? 'Unknown'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{(conflict as any).allergyOnFile ?? 'N/A'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{(conflict as any).asOf ?? 'Unknown'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{(conflict as any).recommendation ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div style={sectionStyle}>
        <div style={labelStyle}>Conflicts</div>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {data.conflicts.map((conflict, index) => (
            <li key={index} style={{ marginBottom: '10px', lineHeight: 1.6 }}>
              {typeof conflict === 'string' ? conflict : JSON.stringify(conflict)}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const buildReportText = () => {
    let lines: string[] = [];
    if (data.patientId) lines.push(`Patient: ${data.patientId}`);
    if (data.summaryText) lines.push('', 'Summary:', data.summaryText);
    if (data.agreed && data.agreed.length) {
      lines.push('', 'Agreed findings:');
      lines.push(...data.agreed);
    }
    if (data.conflicts && data.conflicts.length) {
      lines.push('', 'Conflicts:');
      // conflicts may be structured objects or strings
      for (const c of data.conflicts as any[]) {
        if (typeof c === 'string') lines.push(`- ${c}`);
        else if (c.field) {
          lines.push(`- ${c.field}: ${c.description ?? ''}`);
          if (Array.isArray(c.sources)) lines.push(`  sources: ${c.sources.map((s: any) => `${s.source} (${s.asOf}): ${s.value}`).join('; ')}`);
        } else if (c.source) {
          lines.push(`- ${c.source}: ${c.allergyOnFile ?? ''} (${c.asOf})`);
        } else {
          lines.push(`- ${JSON.stringify(c)}`);
        }
      }
    }
    if (data.entries && data.entries.length) {
      lines.push('', 'Recent access:');
      lines.push(...data.entries.map((e) => `${e.timestamp} • ${e.tool} • ${e.actor ?? e.accessedBy ?? 'unknown'} • ${e.reason}`));
    }
    return lines.join('\n');
  };

  const downloadPdf = async () => {
    // Client-side PDF generation using jsPDF
    const { jsPDF } = await import('jspdf');
    const text = buildReportText();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const wrapWidth = pageWidth - margin * 2;
    const lines = doc.splitTextToSize(text, wrapWidth);
    let y = 40;
    doc.setFontSize(12);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 40;
      }
      doc.text(line, margin, y);
      y += 14;
    }
    doc.save(`${data.patientId ?? 'medbridge'}-reconciliation.pdf`);
  };

  const shareByEmail = () => {
    const subject = encodeURIComponent(`MedBridge reconciliation — ${data.patientId ?? ''}`);
    const body = encodeURIComponent(buildReportText());
    // open mail client
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Doctor registration UI
  const registerDoctor = async () => {
    try {
      setBusy(true);
      setMessage(null);
      const res = await callTool('medbridge_register_doctor_session', { doctorName, hospitalName, registrationId, contact });
      if (res?.value) {
        setSessionId(res.value.sessionId);
        setMessage('Doctor session created. Session ID stored in-widget.');
      }
    } catch (err: any) {
      setMessage(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };


  const createReport = async () => {
    if (!data.patientId || !sessionId) {
      setMessage('Patient ID and doctor session required.');
      return;
    }
    try {
      setBusy(true);
      setMessage(null);
      const res = await callTool('medbridge_generate_reconciliation_report', { patientId: data.patientId, doctorSessionId: sessionId, reason: 'Generated from widget' });
      if (res?.value) {
        const rpt = res.value;
        setCurrentReportId(rpt.reportId);
        // offer download of returned markdown as PDF
        const { jsPDF } = await import('jspdf');
        const mdText = rpt.markdown ?? JSON.stringify(rpt, null, 2);
        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const margin = 40;
        const pageWidth = doc.internal.pageSize.getWidth();
        const wrapWidth = pageWidth - margin * 2;
        const lines = doc.splitTextToSize(mdText, wrapWidth);
        let y = 40;
        doc.setFontSize(12);
        for (const line of lines) {
          if (y > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage();
            y = 40;
          }
          doc.text(line, margin, y);
          y += 14;
        }
        doc.save(`${data.patientId ?? 'medbridge'}-${rpt.reportId}.pdf`);
        setMessage(`Report ${rpt.reportId} generated and downloaded.`);
      }
    } catch (err: any) {
      setMessage(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  const shareReportByServerEmail = async () => {
    if (!currentReportId) {
      setMessage('Generate a report first before sending it via server email.');
      return;
    }
    try {
      setBusy(true);
      setMessage(null);
      const recipient = recipientEmail.trim() || undefined;
      const res = await callTool('medbridge_share_report', { reportId: currentReportId, recipientEmail: recipient, message: 'Sharing your MedBridge reconciliation report.' });
      if (res?.value) {
        setMessage(`Report ${res.value.reportId} shared via server email${recipient ? ` to ${recipient}` : ''}.`);
      }
    } catch (err: any) {
      setMessage(String(err?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: '26px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: accentColor }}>MedBridge Tool Output</h1>
          <p style={{ opacity: 0.8, marginTop: '8px' }}>
            Structured output for patient reconciliation, drug safety checks, and consent audit logs.
          </p>

          <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
            <button onClick={downloadPdf} style={{ padding: '8px 12px', borderRadius: 8, background: accentColor, color: '#fff', border: 'none', cursor: 'pointer' }}>Download PDF</button>
            <button onClick={shareByEmail} style={{ padding: '8px 12px', borderRadius: 8, background: 'transparent', border: `1px solid ${accentColor}`, color: accentColor, cursor: 'pointer' }}>Share via Email</button>
          </div>

          {/* Inline doctor registration UI */}
          <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input placeholder="Doctor name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, minWidth: 150 }} />
            <input placeholder="Hospital" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, minWidth: 150 }} />
            <input placeholder="Registration ID" value={registrationId} onChange={(e) => setRegistrationId(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, minWidth: 150 }} />
            <input placeholder="Contact (email)" value={contact} onChange={(e) => setContact(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, minWidth: 180 }} />
            <button onClick={registerDoctor} disabled={busy} style={{ padding: '8px 12px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer' }}>Register</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={createReport} disabled={busy || !sessionId} style={{ padding: '8px 12px', borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>Generate & Download Report (PDF)</button>
          </div>

          {currentReportId && (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  placeholder="Recipient email (optional)"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  style={{ flex: '1 1 220px', padding: '8px 10px', borderRadius: 8, minWidth: 200 }}
                />
                <button onClick={shareReportByServerEmail} disabled={busy || !currentReportId} style={{ padding: '8px 12px', borderRadius: 8, background: '#0ea5e9', color: '#fff', border: 'none', cursor: 'pointer' }}>Send Report via Server Email</button>
              </div>
              <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#475569' }}>
                {currentReportId ? `Report ID: ${currentReportId}` : ''} You can send to the patient email if no recipient is provided.
              </div>
            </div>
          )}

          {message && <div style={{ marginTop: 12, color: isDark ? '#fde68a' : '#92400e' }}>{message}</div>}
        </div>

        {data.patientId && (
          <div style={{ ...sectionStyle, background: cardBackground }}>
            <div style={labelStyle}>Patient</div>
            <div style={{ fontSize: '16px', color: textColor }}>{data.patientId}</div>
          </div>
        )}

        {data.drug && (
          <div style={{ ...sectionStyle, background: cardBackground }}>
            <div style={labelStyle}>Drug check</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: isDark ? '#1f2937' : '#eef2ff' }}>
                <div style={{ opacity: 0.78, marginBottom: '6px' }}>Drug</div>
                <div style={{ fontWeight: 700 }}>{data.drug}</div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '12px', background: data.safe ? '#ecfdf5' : '#fee2e2' }}>
                <div style={{ opacity: 0.78, marginBottom: '6px' }}>Safe</div>
                <div style={{ fontWeight: 700, color: data.safe ? '#15803d' : '#b91c1c' }}>{data.safe ? 'Yes' : 'No'}</div>
              </div>
              {data.checkedSources && (
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: isDark ? '#1f2937' : '#eef2ff' }}>
                  <div style={{ opacity: 0.78, marginBottom: '6px' }}>Checked sources</div>
                  <div>{data.checkedSources.join(', ')}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {data.agreed && data.agreed.length > 0 && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Agreements</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {data.agreed.map((item, index) => (
                <li key={index} style={{ marginBottom: '10px', lineHeight: 1.6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {renderConflictRows()}

        {data.entries && data.entries.length > 0 && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Access log</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Timestamp</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Tool</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, index) => (
                  <tr key={index}>
                    <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{entry.timestamp}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{entry.tool}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{entry.actor ?? entry.accessedBy}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.summaryText && (
          <div style={{ ...sectionStyle, background: isDark ? '#111827' : '#f8fafc' }}>
            <div style={labelStyle}>Summary</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: 1.6, color: textColor }}>
              {data.summaryText}
            </pre>
          </div>
        )}

        {!data.drug && !data.entries && !data.agreed && (!data.conflicts || data.conflicts.length === 0) && data.summaryText == null && (
          <div style={sectionStyle}>
            <div style={labelStyle}>Raw payload</div>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '13px', lineHeight: 1.6, color: textColor }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
