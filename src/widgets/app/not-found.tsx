'use client';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0e1a, #111827)',
      color: '#e2e8f0',
    }}>
      <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404 – Page Not Found</h1>
      <p style={{ fontSize: '18px', marginBottom: '24px' }}>
        The requested dashboard route could not be located.
      </p>
      <a href="/aegis-dashboard" style={{
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        borderRadius: '8px',
        color: 'white',
        textDecoration: 'none',
        fontWeight: '600',
      }}>
        Go to Aegis Dashboard
      </a>
    </div>
  );
}
