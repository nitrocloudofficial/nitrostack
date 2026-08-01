'use client';

import { CalendarWidget } from '../../calendar/CalendarWidget';

export default function CalendarWidgetPage() {
  return (
    <div style={{ padding: '24px', background: '#080c16', minHeight: '100vh', color: '#f8fafc' }}>
      <CalendarWidget />
    </div>
  );
}
