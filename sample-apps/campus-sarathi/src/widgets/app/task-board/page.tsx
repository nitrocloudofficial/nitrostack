'use client';
import { useEffect, useState } from 'react';

export default function TaskBoard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') setData(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!data) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading tasks...</div>;

  return (
    <div style={{ padding: 24, background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Pending Tasks</h3>
        <button className="btn-primary">+ New Task</button>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        {data.tasks?.length > 0 ? data.tasks.map((t: any, i: number) => (
          <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input 
              type="checkbox" 
              readOnly 
              style={{ width: 20, height: 20, accentColor: 'var(--primary)', cursor: 'pointer' }} 
            />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)', display: 'block' }}>
                {t.title}
              </strong>
              {t.due && (
                <small style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  Due: {t.due}
                </small>
              )}
            </div>
            <span className="badge badge-warning">Pending</span>
          </div>
        )) : <div style={{ color: 'var(--text-muted)' }}>No pending tasks. You're all caught up!</div>}
      </div>
    </div>
  );
}
