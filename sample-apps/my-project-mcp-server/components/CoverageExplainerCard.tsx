import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge, type BadgeTone } from './ui/Badge';
import { VerificationStamp } from './VerificationStamp';
import { formatCurrency } from '@/lib/utils';
import type { CoverageExplainer, NetworkStatus } from '@/lib/types';

const NETWORK_LABEL: Record<NetworkStatus, string> = {
  'in-network': 'In-Network',
  'out-of-network': 'Out-of-Network',
  unknown: 'Network Unknown',
};

const NETWORK_TONE: Record<NetworkStatus, BadgeTone> = {
  'in-network': 'verified',
  'out-of-network': 'amber',
  unknown: 'slate',
};

export function CoverageExplainerCard({
  coverageExplainer,
}: {
  coverageExplainer: CoverageExplainer;
}) {
  const { covered, coverageLimit, waitingPeriodCleared, exclusionsApplicable, networkStatus } =
    coverageExplainer;

  return (
    <Card>
      <CardHeader
        title="Policy & Coverage"
        action={<Badge tone={NETWORK_TONE[networkStatus]} className="py-0.5 px-2.5 text-xs">{NETWORK_LABEL[networkStatus]}</Badge>}
      />
      <CardBody className="space-y-4">
        {/* Coverage Callout */}
        <div className={`flex items-center gap-3 rounded-xl border backdrop-blur-md p-3.5 ${
          covered ? 'border-teal-300/40 bg-teal-500/10 text-teal-900' : 'border-amber-300/40 bg-amber-400/10 text-amber-900'
        }`}>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            covered ? 'bg-teal-600 text-white' : 'bg-amber-600 text-white'
          }`}>
            {covered ? '✓' : '!'}
          </span>
          <p className="text-xs font-semibold">
            {covered
              ? `Covered up to ${formatCurrency(coverageLimit)} under policy terms.`
              : 'Procedure not covered under current policy.'}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/50 bg-white/35 backdrop-blur-md p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Waiting Period
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-800">
              {waitingPeriodCleared ? 'Cleared' : 'Applies to this claim'}
            </p>
          </div>

          <div className="rounded-xl border border-white/50 bg-white/35 backdrop-blur-md p-3.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Coverage Limit
            </p>
            <p className="mt-1 font-mono text-base font-bold text-slate-900">
              {formatCurrency(coverageLimit)}
            </p>
            <div className="mt-1">
              <VerificationStamp status="verified" verb="Verified" label="policy schedule" compact />
            </div>
          </div>
        </div>

        {/* Exclusions */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Policy Exclusions
            </p>
            <VerificationStamp status="verified" verb="Cross-checked" label="terms" compact />
          </div>
          {exclusionsApplicable.length === 0 ? (
            <p className="text-xs text-slate-500">None applicable.</p>
          ) : (
            <ul className="space-y-1.5">
              {exclusionsApplicable.map((exclusion) => (
                <li
                  key={exclusion}
                  className="flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-400/10 backdrop-blur-md px-3 py-2 text-xs text-amber-900"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  <span className="font-medium">{exclusion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
