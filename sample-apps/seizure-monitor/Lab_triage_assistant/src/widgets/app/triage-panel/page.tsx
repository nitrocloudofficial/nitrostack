'use client';

import { useEffect, useState } from 'react';
import { useTheme, useWidgetSDK } from '@nitrostack/widgets';
import { TriageResults, type FlagCriticalData, type Routing } from '../../components/TriageResults';

interface AppointmentData {
  followUpPlan: {
    sameDepartment: boolean;
    currentDoctorSpecialty: string | null;
    recommendedDepartment: string;
    followUpNote: string;
  };
  confirmationText?: string;
}

type WidgetData = FlagCriticalData | AppointmentData;

export default function TriagePanel() {
  const theme = useTheme();
  const isDark = theme === 'dark';
  const { isReady, getToolOutput, callTool, sendFollowUpMessage } = useWidgetSDK();
  const data = getToolOutput<WidgetData>();

  const triageData = data && 'flagged' in data ? data : null;
  const appointmentData = data && 'followUpPlan' in data ? data : null;

  const [routing, setRouting] = useState<Routing[] | null>(null);
  const [routingError, setRoutingError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);

  useEffect(() => {
    if (!isReady || !triageData || triageData.flagged.length === 0) return;

    let cancelled = false;
    setIsRouting(true);
    setRoutingError(null);

    callTool('route_specialist', { flagged: triageData.flagged })
      .then((res) => {
        if (cancelled) return;
        const parsed = (res.structuredContent as { routing: Routing[] } | undefined) ?? JSON.parse(res.result);
        setRouting(parsed.routing ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoutingError('Could not load specialist routing.');
      })
      .finally(() => {
        if (!cancelled) setIsRouting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, triageData, callTool]);

  const textColor = isDark ? '#f5f5f5' : '#111827';
  const mutedColor = isDark ? 'rgba(245,245,245,0.6)' : 'rgba(17,24,39,0.6)';
  const cardBg = isDark ? '#1f2430' : '#ffffff';
  const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  if (!isReady) {
    return <div style={{ padding: 24, color: textColor }}>Connecting to host...</div>;
  }

  if (!data) {
    return <div style={{ padding: 24, color: textColor }}>No triage data received.</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: textColor, maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {triageData && (
        <TriageResults data={triageData} routing={routing} isRouting={isRouting} routingError={routingError} isDark={isDark} />
      )}

      {appointmentData && (
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, borderBottom: `1px solid ${borderColor}` }}>
            Department Follow-up
          </div>
          {appointmentData.confirmationText && (
            <div style={{ padding: '12px 16px', fontSize: 13, color: mutedColor, borderBottom: `1px solid ${borderColor}` }}>
              {appointmentData.confirmationText}
            </div>
          )}
          <div style={{ padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
            {appointmentData.followUpPlan.sameDepartment ? 'Stick with the same department' : 'Consult a new department'}
          </div>
          <div style={{ padding: '0 16px 12px', fontSize: 13, color: mutedColor }}>
            Current doctor specialty: {appointmentData.followUpPlan.currentDoctorSpecialty ?? 'Unknown'}
          </div>
          <div style={{ padding: '0 16px 12px', fontSize: 13, color: mutedColor }}>
            Recommended department: {appointmentData.followUpPlan.recommendedDepartment}
          </div>
          <div style={{ padding: '0 16px 16px', fontSize: 13, color: textColor }}>
            {appointmentData.followUpPlan.followUpNote}
          </div>
        </div>
      )}

      {triageData && (
        <div
          style={{
            background: cardBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>Explain these results</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['English', 'Hindi', 'Tamil'].map((language) => (
              <button
                key={language}
                onClick={() =>
                  sendFollowUpMessage(
                    `Explain my lab results in ${language}, in calm plain language for someone with no medical background. Don't state a diagnosis, and end by recommending I discuss the results with a doctor.`
                  )
                }
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1px solid ${borderColor}`,
                  background: 'transparent',
                  color: textColor,
                  cursor: 'pointer'
                }}
              >
                {language}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: mutedColor, textAlign: 'center' }}>
        This is not a diagnosis. Please discuss these results with a doctor.
      </div>
    </div>
  );
}
