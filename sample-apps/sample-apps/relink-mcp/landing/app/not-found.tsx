export default function NotFound() {
  return (
    <div style={{ padding: '80px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>The page you are looking for does not exist.</p>
      <a href="/" className="btn-primary" style={{ display: 'inline-flex' }}>
        Return Home
      </a>
    </div>
  );
}
