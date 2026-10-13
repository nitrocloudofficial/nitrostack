'use client';
import { useEffect, useState } from 'react';

export default function ScheduleCard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') setData(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!data) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading schedule...</div>;

  return (
    <div style={{ padding: 24, background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        Your Schedule
      </h3>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {data.events?.length > 0 ? data.events.map((e: any, i: number) => (
            <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', paddingBottom: i !== data.events.length - 1 ? 16 : 0, borderBottom: i !== data.events.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
              <div style={{ minWidth: 80, color: 'var(--primary)', fontWeight: 600, fontSize: '0.95rem' }}>
                {e.start && !/^\d{4}-\d{2}-\d{2}$/.test(e.start)
                  ? new Date(e.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'All Day'}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.1rem', display: 'block', marginBottom: 4 }}>{e.title}</strong>
                {e.location && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  {e.location}
                </div>}
              </div>
            </div>
          )) : <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0' }}>No events scheduled.</div>}
        </div>
      </div>
    </div>
  );
}
