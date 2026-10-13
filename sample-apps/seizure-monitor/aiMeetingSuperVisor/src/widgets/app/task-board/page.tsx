'use client';

import { useEffect, useState } from 'react';
import { ListTasksOutput, Task } from '../../types/tool-data.js';

const STATUS_COLOR: Record<Task['status'], string> = {
  proposed: '#3D5A80',
  accepted: '#4B6B4B',
  denied: '#A6432F',
  in_progress: '#C98A2C',
  done: '#888'
};

export default function TaskBoard() {
  const [data, setData] = useState<ListTasksOutput | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'toolOutput') {
        setData(event.data.data as ListTasksOutput);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!data) {
    return <div style={{ padding: 20, fontFamily: 'system-ui' }}>Loading tasks…</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16, maxWidth: 560 }}>
      <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: '#666', marginBottom: 12 }}>
        Tasks
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.tasks.map((t) => (
          <div key={t.id} style={{ border: '1px solid #e5e5e5', borderRadius: 4, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: 14 }}>{t.title}</strong>
              <span
                style={{
                  fontSize: 10,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  color: STATUS_COLOR[t.status]
                }}
              >
                ● {t.status}
              </span>
            </div>
            {t.description && <p style={{ fontSize: 12, color: '#555', marginTop: 4 }}>{t.description}</p>}
            <div style={{ fontSize: 11, color: '#888', marginTop: 6, display: 'flex', gap: 12 }}>
              {t.assigned_to && <span>Assigned: {t.assigned_to}</span>}
              {t.effort_estimate && <span>Est. {t.effort_estimate}</span>}
              {typeof t.clarity_score === 'number' && <span>Clarity {(t.clarity_score * 100).toFixed(0)}%</span>}
            </div>
            {t.status === 'denied' && t.denial_reason && (
              <div style={{ fontSize: 11, color: '#A6432F', marginTop: 4 }}>Denied: {t.denial_reason}</div>
            )}
          </div>
        ))}
        {data.tasks.length === 0 && <div style={{ fontSize: 13, color: '#888' }}>No tasks yet.</div>}
      </div>
    </div>
  );
}
