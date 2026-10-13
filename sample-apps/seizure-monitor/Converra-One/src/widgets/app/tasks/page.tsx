'use client';

import { TaskWidget } from '../../tasks/TaskWidget';

export default function TaskWidgetPage() {
  return (
    <div style={{ padding: '24px', background: '#080c16', minHeight: '100vh', color: '#f8fafc' }}>
      <TaskWidget />
    </div>
  );
}
