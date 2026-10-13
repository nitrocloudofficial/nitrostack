'use client';
import { useEffect, useState } from 'react';

export default function EmailList() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data.type === 'toolOutput') setData(event.data.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!data) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading emails...</div>;

  return (
    <div style={{ padding: 24, background: 'var(--bg-secondary)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Unread Academic Emails
        </h3>
        {data.emails?.length > 0 && <span className="badge badge-info">{data.emails.length} Unread</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.emails?.length > 0 ? data.emails.map((email: any, i: number) => (
          <div key={i} className="card" style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '1.1rem', flexShrink: 0
              }}>
                {email.sender?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email.subject}
                  </strong>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: 6, marginLeft: 8 }} />
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 6 }}>
                  From: {email.sender}
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {email.snippet}
                </p>
              </div>
            </div>
          </div>
        )) : <div className="card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.4 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          No unread academic emails. Inbox clear! 🎉
        </div>}
      </div>
    </div>
  );
}
