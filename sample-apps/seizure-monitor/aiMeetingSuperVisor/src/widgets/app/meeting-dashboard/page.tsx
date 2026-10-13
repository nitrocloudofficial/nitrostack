'use client';

import { useEffect, useState } from 'react';
import { ListMeetingsOutput, Meeting } from '../../types/tool-data.js';

const STATUS_COLOR: Record<Meeting['status'], string> = {
  scheduled: '#3D5A80',
  in_progress: '#C98A2C',
  completed: '#4B6B4B',
  missed: '#A6432F',
  rescheduled: '#C98A2C'
};

export default function MeetingDashboard() {
  const [data, setData] = useState<ListMeetingsOutput | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'toolOutput') {
        setData(event.data.data as ListMeetingsOutput);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!data) {
    return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading meetings…</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, maxWidth: 560 }}>
      <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#666', marginBottom: 12 }}>
        Meetings
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.meetings.map((m) => (
          <div key={m.id} style={{ border: '1px solid #e5e5e5', borderRadius: 4, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: 14 }}>{m.title}</strong>
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: STATUS_COLOR[m.status]
                }}
              >
                ● {m.status.replace('_', ' ')}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
              {new Date(m.scheduled_start).toLocaleString()}
            </div>
            {m.keynotes && m.keynotes.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 16, fontSize: 12, color: '#444' }}>
                {m.keynotes.map((k, i) => (
                  <li key={i}>
                    {k.text}
                    {k.owner ? ` — ${k.owner}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {data.meetings.length === 0 && <div style={{ fontSize: 13, color: '#888' }}>No meetings yet.</div>}
      </div>
    </div>
  );
}
