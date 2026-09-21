import type { CashlessStatus } from '@/lib/types';
import { statusLabel } from '@/lib/utils';

const STYLES: Record<CashlessStatus, string> = {
  approved: 'badge-approved',
  denied: 'badge-denied',
  pending: 'badge-pending',
};

export function StatusBadge({ status }: { status: CashlessStatus }) {
  return <span className={STYLES[status]}>{statusLabel(status)}</span>;
}

export function ConsistencyBadge({ isConsistent }: { isConsistent: boolean }) {
  return (
    <span className={isConsistent ? 'badge-approved' : 'badge-warning'}>
      {isConsistent ? 'Consistent' : 'Inconsistencies found'}
    </span>
  );
}

export function PredatoryBadge() {
  return <span className="badge-denied">Predatory rate flagged</span>;
}
