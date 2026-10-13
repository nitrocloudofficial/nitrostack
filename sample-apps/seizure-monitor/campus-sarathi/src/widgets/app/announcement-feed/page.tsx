'use client';
import { useEffect, useState } from 'react';

export default function AnnouncementFeed() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') setData(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!data) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading announcements...</div>;

  return (
    <div style={{ padding: 24, background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <h3 style={{ marginBottom: 24, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Campus Announcements</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {data.announcements?.length > 0 ? data.announcements.map((a: any, i: number) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{a.title}</strong>
              {a.priority === 'high' && <span className="badge badge-error">High Priority</span>}
              {a.priority === 'normal' && <span className="badge badge-info">Normal</span>}
            </div>
            <p style={{ margin: '8px 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.content}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <small style={{ color: 'var(--text-muted)' }}>{a.date}</small>
              <button className="btn-secondary">Read More</button>
            </div>
          </div>
        )) : <div style={{ color: 'var(--text-muted)' }}>No announcements found.</div>}
      </div>
    </div>
  );
}
