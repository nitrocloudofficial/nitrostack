import React from 'react';
const MAP = { PAID: 'bg-aurora-ok', VOID: 'bg-aurora-signal', OPEN: 'bg-aurora-slate' };
export default function StatusPill({ status }) {
  return <span className={`${MAP[status] || 'bg-aurora-mist'} text-aurora-cloud px-2 rounded-card`}>{status}</span>;
}
