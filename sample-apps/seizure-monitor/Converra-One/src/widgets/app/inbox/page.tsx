'use client';

import { UnifiedInboxWidget } from '../../inbox/UnifiedInboxWidget';

export default function InboxWidgetPage() {
  return (
    <div style={{ padding: '24px', background: '#080c16', minHeight: '100vh', color: '#f8fafc' }}>
      <UnifiedInboxWidget />
    </div>
  );
}
