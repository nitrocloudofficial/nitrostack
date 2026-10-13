'use client';
import { useEffect, useState } from 'react';

export default function DailyBrief() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') setData(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!data) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Generating your daily brief...</div>;

  return (
    <div style={{ padding: 24, background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(to right, var(--primary), var(--primary-hover))', color: 'white', border: 'none' }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>Daily Brief</h2>
        <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>{data.summary}</p>
      </div>
      
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Top Priorities</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.priorities?.map((p: string, i: number) => (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{i + 1}</div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="card">
          <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            📅 Today's Schedule
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.schedule?.events?.length > 0 ? data.schedule.events.map((e: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 60, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>{e.start ? new Date(e.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'All Day'}</div>
                <div style={{ flex: 1, paddingLeft: 12, borderLeft: '2px solid var(--primary)' }}>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', fontSize: '1rem' }}>{e.title}</strong>
                  {e.location && <small style={{ color: 'var(--text-muted)' }}>📍 {e.location}</small>}
                </div>
              </div>
            )) : <div style={{ color: 'var(--text-muted)' }}>No events scheduled for today.</div>}
          </div>
        </div>

        <div className="card">
          <h4 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            ✅ Tasks
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.tasks?.tasks?.length > 0 ? data.tasks.tasks.map((t: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="checkbox" readOnly style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} />
                <span style={{ color: 'var(--text-primary)' }}>{t.title}</span>
              </div>
            )) : <div style={{ color: 'var(--text-muted)' }}>No pending tasks.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
