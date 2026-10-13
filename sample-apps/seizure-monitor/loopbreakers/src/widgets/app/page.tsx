export default function HomePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#fff', backgroundColor: '#0f172a' }}>
      <h1>NexusOS Widget Server</h1>
      <p>Active UI Widgets:</p>
      <ul>
        <li><a href="/security-dashboard" style={{ color: '#38bdf8' }}>/security-dashboard</a></li>
        <li><a href="/compliance-dashboard" style={{ color: '#38bdf8' }}>/compliance-dashboard</a></li>
        <li><a href="/mail-dashboard" style={{ color: '#38bdf8' }}>/mail-dashboard</a></li>
        <li><a href="/enterprise-decision-center" style={{ color: '#38bdf8' }}>/enterprise-decision-center</a></li>
        <li><a href="/enterprise-crisis-command-center" style={{ color: '#38bdf8' }}>/enterprise-crisis-command-center</a></li>
      </ul>
    </div>
  );
}
