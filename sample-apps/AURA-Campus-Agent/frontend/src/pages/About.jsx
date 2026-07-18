import React from 'react';
import { Info, Cpu, CheckSquare, Layers, ShieldAlert, Users, Award, BookOpen, HelpCircle } from 'lucide-react';

export default function About() {
  const mcpServers = [
    { name: 'Placement Server', desc: 'Validates CGPA, historical backlogs, and checks placement drive eligibility.', icon: Award, color: '#0284c7' },
    { name: 'Hostel Server', desc: 'Manages room bookings, warden notifications, and outpass requests.', icon: Layers, color: '#0284c7' },
    { name: 'Attendance Server', desc: 'Tracks class and course attendance, flagging attendance shortage warnings.', icon: CheckSquare, color: '#0284c7' },
    { name: 'Timetable Server', desc: 'Manages class schedules, lectures, and detects timetable conflicts.', icon: Cpu, color: '#0284c7' },
    { name: 'Complaints Server', desc: 'Files and reviews academic, hostel, and general campus grievances.', icon: ShieldAlert, color: '#0284c7' },
    { name: 'Library Server', desc: 'Tracks book availability, issued books, and unreturned items.', icon: BookOpen, color: '#0284c7' }
  ];

  return (
    <div className="page-container" style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <Info size={28} color="#0284c7" />
          <h2 style={styles.title}>About AURA Campus Agent</h2>
        </div>
        <p style={styles.sub}>
          AURA (Autonomous Utility & Operations Resource Agent) is an advanced orchestrator designed to streamline campus administration and student services.
        </p>
      </div>

      {/* Main card */}
      <div className="glass-panel" style={styles.introCard}>
        <h3 style={styles.sectionTitle}>Overview</h3>
        <p style={styles.paragraph}>
          Instead of navigating multiple administrative portals, AURA connects multiple specialized **Model Context Protocol (MCP)** tool servers. By coordinating these servers, AURA can execute complex, multi-step actions (such as validating placement eligibility based on attendance and library dues, or filing weekend outpasses) in a single conversational request.
        </p>
      </div>

      {/* Grid of MCP servers */}
      <h3 style={styles.subtitle}>Coordinated MCP Tool Servers</h3>
      <div style={styles.grid}>
        {mcpServers.map((server, idx) => {
          const Icon = server.icon;
          return (
            <div key={idx} className="glass-panel" style={styles.serverCard}>
              <div style={{ ...styles.iconWrap, background: `${server.color}15`, border: `1px solid ${server.color}30` }}>
                <Icon size={18} color={server.color} />
              </div>
              <div style={styles.serverInfo}>
                <h4 style={styles.serverName}>{server.name}</h4>
                <p style={styles.serverDesc}>{server.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Demo Flows */}
      <div className="glass-panel" style={styles.flowsCard}>
        <h3 style={styles.sectionTitle}>Flagship Orchestration Flows</h3>
        <ul style={styles.flowList}>
          <li style={styles.flowItem}>
            <strong>Flow A — Placement Check:</strong> Chains the Attendance, Library, Finance, and Placement servers to audit student accounts and verify eligibility for recruitment drives.
          </li>
          <li style={styles.flowItem}>
            <strong>Flow B — Hostel Outpass:</strong> Correlates leave policies, attendance warn-flags, and active hostel complaints to automatically process weekend outpasses.
          </li>
          <li style={styles.flowItem}>
            <strong>Flow C — Timetable Conflict Watchdog:</strong> Cross-references registered events and scheduled classes to proactively alert students of timetable conflicts.
          </li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    paddingBottom: '40px',
  },
  header: {
    marginBottom: '8px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    color: 'var(--txt-bright)',
  },
  sub: {
    fontSize: '0.9rem',
    color: 'var(--txt-soft)',
  },
  introCard: {
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: 'var(--txt-bright)',
    marginBottom: '10px',
  },
  paragraph: {
    fontSize: '0.9rem',
    color: 'var(--txt-soft)',
    lineHeight: '1.6',
  },
  subtitle: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--txt-bright)',
    marginTop: '12px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  serverCard: {
    padding: '16px',
    display: 'flex',
    gap: '14px',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  serverInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  serverName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--txt-bright)',
  },
  serverDesc: {
    fontSize: '0.78rem',
    color: 'var(--txt-soft)',
    lineHeight: '1.4',
  },
  flowsCard: {
    padding: '24px',
  },
  flowList: {
    marginTop: '12px',
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  flowItem: {
    fontSize: '0.85rem',
    color: 'var(--txt-soft)',
    lineHeight: '1.5',
  }
};
