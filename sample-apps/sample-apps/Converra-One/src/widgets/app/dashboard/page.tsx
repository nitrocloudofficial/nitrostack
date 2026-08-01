'use client';

import { DashboardWidget } from '../../dashboard/DashboardWidget';

export default function DashboardWidgetPage() {
  return (
    <div style={{ padding: '24px', background: '#080c16', minHeight: '100vh', color: '#f8fafc' }}>
      <DashboardWidget />
    </div>
  );
}
