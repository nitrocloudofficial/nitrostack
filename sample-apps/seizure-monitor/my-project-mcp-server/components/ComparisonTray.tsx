'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { VerificationStamp } from './VerificationStamp';
import { formatCurrency } from '@/lib/utils';

type PolicyDetail = {
  id: string;
  name: string;
  insurer: string;
  premium: number; // monthly ₹
  deductible: number;
  coverageLimit: number;
  networkStatus: 'In-network' | 'Out-of-network';
  inclusions: string[];
  exclusions: string[];
  scannedAt: string;
};

const DEMO_POLICIES: PolicyDetail[] = [
  {
    id: 'star-comprehensive',
    name: 'Star Health — Comprehensive Plan',
    insurer: 'Star Health & Allied Insurance',
    premium: 1240,
    deductible: 5000,
    coverageLimit: 500000,
    networkStatus: 'In-network',
    inclusions: [
      'Inpatient hospitalisation',
      'Day-care procedures',
      'Pre- and post-hospitalisation (60 / 90 days)',
      'Ambulance charges up to ₹2,000',
    ],
    exclusions: [
      'Cosmetic or elective procedures',
      'Pre-existing conditions (24-month waiting period)',
      'Dental treatment',
    ],
    scannedAt: '2026-07-25T09:14:00.000Z',
  },
  {
    id: 'hdfc-optima',
    name: 'HDFC Ergo — Optima Secure',
    insurer: 'HDFC Ergo General Insurance',
    premium: 1580,
    deductible: 0,
    coverageLimit: 750000,
    networkStatus: 'Out-of-network',
    inclusions: [
      'Inpatient hospitalisation',
      'Restore benefit (100% reload on sum insured)',
      'Modern treatment methods',
      'Annual health check-up',
    ],
    exclusions: [
      'War or nuclear risk',
      'Self-inflicted injury',
      'Pre-existing conditions (36-month waiting period)',
    ],
    scannedAt: '2026-07-25T09:14:00.000Z',
  },
];

function formatScannedTime(iso: string): string {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 2) return 'just now';
  if (diff < 60) return `${diff} min ago`;
  return `${Math.round(diff / 60)} hr ago`;
}

/**
 * Comparison tray showing scanned alternate policies with expandable detail.
 * Clicking a policy card reveals a breakdown: premium, deductible, coverage
 * limit, inclusions, exclusions, and a VerificationStamp on the policy terms.
 */
export function ComparisonTray() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader title="Comparison Tray" subtitle="Scanned policies" />
      <CardBody className="space-y-3">
        <p className="text-sm text-slate">
          Alternate policies scanned from the patient&apos;s device. Click a card to compare terms.
        </p>
        {DEMO_POLICIES.map((policy) => {
          const isExpanded = expandedId === policy.id;
          const networkTone = policy.networkStatus === 'In-network' ? 'verified' : 'amber';

          return (
            <div
              key={policy.id}
              className={`rounded-lg border backdrop-blur-md transition-colors ${
                isExpanded ? 'border-slate-400/50 bg-white/45' : 'border-white/50 bg-white/30'
              }`}
            >
              {/* Collapsed / header row — always visible */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : policy.id)}
                aria-expanded={isExpanded}
                className="flex w-full items-start justify-between gap-3 rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-ink">{policy.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate">
                    Scanned {formatScannedTime(policy.scannedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <Badge tone={networkTone}>{policy.networkStatus}</Badge>
                  <span
                    aria-hidden
                    className={`text-xs font-medium text-slate transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  >
                    ▾
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="space-y-4 border-t border-white/40 px-4 pb-4 pt-3">
                  {/* Key numbers */}
                  <dl className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                        Monthly premium
                      </dt>
                      <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
                        {formatCurrency(policy.premium)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                        Deductible
                      </dt>
                      <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
                        {policy.deductible === 0 ? 'None' : formatCurrency(policy.deductible)}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate">
                        Coverage limit
                      </dt>
                      <dd className="mt-0.5 font-mono text-base font-semibold text-ink">
                        {formatCurrency(policy.coverageLimit)}
                      </dd>
                    </div>
                  </dl>

                  {/* Inclusions */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">
                      Included
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {policy.inclusions.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-slate">
                          <span
                            aria-hidden
                            className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-verified"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exclusions */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate">
                      Excluded
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {policy.exclusions.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-slate">
                          <span
                            aria-hidden
                            className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <VerificationStamp
                    status="verified"
                    verb="Cross-checked"
                    label="policy terms document"
                    compact
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
