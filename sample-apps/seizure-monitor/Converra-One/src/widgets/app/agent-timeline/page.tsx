'use client';

import { AgentActivityWidget } from '../../agent/AgentActivityWidget';

export default function AgentTimelineWidgetPage() {
  return (
    <div style={{ padding: '24px', background: '#080c16', minHeight: '100vh', color: '#f8fafc' }}>
      <AgentActivityWidget />
    </div>
  );
}
