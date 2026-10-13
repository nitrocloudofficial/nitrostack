'use client';

import { PlatformStatusWidget } from '../../platform/PlatformStatusWidget';

export default function PlatformStatusWidgetPage() {
  return (
    <div style={{ padding: '24px', background: '#080c16', minHeight: '100vh', color: '#f8fafc' }}>
      <PlatformStatusWidget />
    </div>
  );
}
