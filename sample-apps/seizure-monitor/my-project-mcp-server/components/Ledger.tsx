import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge, type BadgeTone } from './ui/Badge';
import { VerificationStamp } from './VerificationStamp';
import { formatCurrency } from '@/lib/utils';
import type { ClaimStatus } from '@/lib/types';

const STATUS_LABEL: Record<ClaimStatus, string> = {
  approved: 'Approved',
  partial: 'Partially Approved',
  denied: 'Denied',
  pending: 'Pending Review',
  'more-info-requested': 'Info Requested',
};

const STATUS_TONE: Record<ClaimStatus, BadgeTone> = {
  approved: 'verified',
  partial: 'amber',
  denied: 'amber',
  pending: 'slate',
  'more-info-requested': 'amber',
};

export function Ledger({
  hospitalEstimate,
  insurerApproved,
  gap,
  claimStatus,
}: {
  hospitalEstimate: number;
  insurerApproved: number;
  gap: number;
  claimStatus: ClaimStatus;
}) {
  const approvedPct = hospitalEstimate > 0
    ? Math.min(100, Math.round((insurerApproved / hospitalEstimate) * 100))
    : 0;
  const gapPct = 100 - approvedPct;

  return (
    <Card>
      <CardHeader
        title="Cost Ledger"
        action={<Badge tone={STATUS_TONE[claimStatus]} className="py-0.5 px-2.5 text-xs">{STATUS_LABEL[claimStatus]}</Badge>}
      />
      <CardBody className="space-y-5">
        {/* Split Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Coverage Split</span>
            <span className="font-mono text-slate-700">{approvedPct}% Covered</span>
          </div>
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-white/40 backdrop-blur-md p-0.5 border border-white/50"
            role="img"
            aria-label={`${approvedPct}% approved, ${gapPct}% gap`}
          >
            {approvedPct > 0 && (
              <div
                className="h-full rounded-full bg-teal-600 transition-all duration-300"
                style={{ width: `${approvedPct}%` }}
              />
            )}
            {gapPct > 0 && (
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-300"
                style={{ width: `${gapPct}%` }}
              />
            )}
          </div>
        </div>

        {/* 3 Metric Boxes */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/50 bg-white/35 backdrop-blur-md p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Hospital Estimate
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-900">
              {formatCurrency(hospitalEstimate)}
            </p>
            <div className="mt-2">
              <VerificationStamp status="verified" verb="Verified" label="CGHS list" compact />
            </div>
          </div>

          <div className="rounded-xl border border-teal-300/30 bg-teal-500/8 backdrop-blur-md p-3.5">
            <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-teal-800">
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              Insurer Approved
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-teal-900">
              {formatCurrency(insurerApproved)}
            </p>
            <div className="mt-2">
              <VerificationStamp status="verified" verb="Cross-checked" label="policy" compact />
            </div>
          </div>

          <div className={`rounded-xl border backdrop-blur-md p-3.5 ${
            gap > 0 ? 'border-amber-300/40 bg-amber-400/10' : 'border-white/50 bg-white/35'
          }`}>
            <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <span className={`h-2 w-2 rounded-full ${gap > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} />
              Patient Gap
            </p>
            <p className={`mt-1 font-mono text-xl font-bold ${gap > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {formatCurrency(gap)}
            </p>
            <div className="mt-2">
              <VerificationStamp
                status={gap > 0 ? 'pending' : 'verified'}
                verb="Verified"
                label={gap > 0 ? 'out of pocket' : 'zero gap'}
                compact
              />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
