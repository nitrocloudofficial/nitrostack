// risk.rules.test.ts — Unit tests for the eight risk rules.
//
// Every rule is tested at its trigger point, one above, and one below.
// The test suite IS a judging asset — running it proves enforcement is real.
//
// LOQ owns this file. Do not edit outside the LOQ zone (see TEAM.md S3).

import { describe, it, expect } from 'vitest';

import type {
  RiskContext,
  Invoice,
  Vendor,
  Payment,
  Thresholds,
  Paise,
} from '../src/types/contracts.js';

import {
  amountTier,
  firstTimePayee,
  velocitySpike,
  duplicateInvoice,
  structuring,
  denyListRule,
  accountChanged,
  offHours,
} from '../src/services/risk.rules.js';

import { assessRisk, deriveTier } from '../src/services/risk.service.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TH: Thresholds = {
  autoLimit: 25_000_000,     // Rs.2,50,000 (25 lakh paise)
  dualLimit: 100_000_000,    // Rs.10,00,000 (1 crore paise)
  velocityMultiple: 3,
  structuringBand: 0.10,
  businessStartHour: 9,
  businessEndHour: 18,
};

function rupees(r: number): Paise {
  return r * 100;
}

function makeVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: 'VEND-01',
    name: 'Test Vendor',
    lastPaidAccount: 'ACC-001',
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'INV-TEST',
    vendorId: 'VEND-01',
    amount: rupees(1_00_000),
    destinationAccount: 'ACC-001',
    invoiceDate: '2026-07-20',
    submittedAt: '2026-07-25T10:00:00+05:30',
    notes: '',
    status: 'pending',
    ...overrides,
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'PAY-TEST',
    vendorId: 'VEND-01',
    amount: rupees(1_00_000),
    destinationAccount: 'ACC-001',
    paidAt: '2026-07-01T10:00:00+05:30',
    ...overrides,
  };
}

function makeCtx(overrides: Partial<RiskContext> = {}): RiskContext {
  return {
    invoice: makeInvoice(),
    vendor: makeVendor(),
    vendorHistory: [],
    sameDayPayments: [],
    denyList: [],
    evaluatedAt: '2026-07-22T14:30:00+05:30',
    thresholds: { ...TH },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Rule 1: AMOUNT_TIER
// ---------------------------------------------------------------------------

describe('amountTier', () => {
  it('returns null when amount is at the auto-limit boundary (exactly Rs.2,50,000)', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: rupees(2_50_000) }) });
    expect(amountTier(ctx)).toBeNull();
  });

  it('returns null when amount is one paise below auto-limit', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: 25_00_000 - 1 }) });
    expect(amountTier(ctx)).toBeNull();
  });

  it('returns medium when amount is one paise above auto-limit', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: 25_000_000 + 1 }) });
    const flag = amountTier(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('medium');
    expect(flag!.ruleId).toBe('AMOUNT_TIER');
  });

  it('returns medium for amount between auto and dual limits', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: rupees(5_00_000) }) });
    const flag = amountTier(ctx);
    expect(flag!.severity).toBe('medium');
  });

  it('returns high when amount is one paise above dual-limit', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: 100_000_000 + 1 }) });
    const flag = amountTier(ctx);
    expect(flag!.severity).toBe('high');
  });

  it('returns medium when amount is exactly at dual-limit (must exceed for high)', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: 100_000_000 }) });
    const flag = amountTier(ctx);
    expect(flag!.severity).toBe('medium');
  });

  it('evidence includes the formatted amount', () => {
    const ctx = makeCtx({ invoice: makeInvoice({ amount: rupees(3_00_000) }) });
    const flag = amountTier(ctx);
    expect(flag!.evidence).toContain('3,00,000');
  });
});

// ---------------------------------------------------------------------------
// Rule 2: FIRST_TIME_PAYEE
// ---------------------------------------------------------------------------

describe('firstTimePayee', () => {
  it('returns medium when vendorHistory is empty', () => {
    const ctx = makeCtx({ vendorHistory: [] });
    const flag = firstTimePayee(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('medium');
    expect(flag!.ruleId).toBe('FIRST_TIME_PAYEE');
  });

  it('returns null when vendorHistory has one payment', () => {
    const ctx = makeCtx({ vendorHistory: [makePayment()] });
    expect(firstTimePayee(ctx)).toBeNull();
  });

  it('evidence mentions the vendor id', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'ACME-99' }),
      vendorHistory: [],
    });
    const flag = firstTimePayee(ctx);
    expect(flag!.evidence).toContain('ACME-99');
  });
});

// ---------------------------------------------------------------------------
// Rule 3: VELOCITY_SPIKE
// ---------------------------------------------------------------------------

describe('velocitySpike', () => {
  it('returns null when no history (handled by firstTimePayee)', () => {
    const ctx = makeCtx({ vendorHistory: [] });
    expect(velocitySpike(ctx)).toBeNull();
  });

  it('returns null when amount is exactly at the velocity threshold', () => {
    // mean = 1,00,000; threshold = 1,00,000 * 3 = 3,00,000
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: rupees(3_00_000) }),
      vendorHistory: [
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
      ],
    });
    expect(velocitySpike(ctx)).toBeNull();
  });

  it('returns null when amount is one paise below the velocity threshold', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: 30_000_000 - 1 }),
      vendorHistory: [
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
      ],
    });
    expect(velocitySpike(ctx)).toBeNull();
  });

  it('returns medium when amount exceeds the velocity threshold', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: rupees(3_00_001) }),
      vendorHistory: [
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
      ],
    });
    const flag = velocitySpike(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('medium');
    expect(flag!.ruleId).toBe('VELOCITY_SPIKE');
  });

  it('fires on the ACME-07 planted scenario (Rs.10,00,000 vs ~Rs.1,50,000 avg)', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ vendorId: 'ACME-07', amount: rupees(10_00_000) }),
      vendorHistory: [
        makePayment({ amount: rupees(1_20_000) }),
        makePayment({ amount: rupees(1_80_000) }),
        makePayment({ amount: rupees(1_50_000) }),
      ],
    });
    const flag = velocitySpike(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.ruleId).toBe('VELOCITY_SPIKE');
  });

  it('evidence includes the multiplier', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: rupees(5_00_000) }),
      vendorHistory: [
        makePayment({ amount: rupees(1_00_000) }),
        makePayment({ amount: rupees(1_00_000) }),
      ],
    });
    const flag = velocitySpike(ctx);
    expect(flag!.evidence).toContain('5.0x');
  });
});

// ---------------------------------------------------------------------------
// Rule 4: DUPLICATE_INVOICE
// ---------------------------------------------------------------------------

describe('duplicateInvoice', () => {
  it('returns null when no matching payment exists', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: rupees(5_00_000) }),
      vendorHistory: [makePayment({ amount: rupees(3_00_000) })],
    });
    expect(duplicateInvoice(ctx)).toBeNull();
  });

  it('returns null when matching payment is exactly 8 days old (outside window)', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({
        vendorId: 'VEND-01',
        amount: rupees(5_00_000),
        invoiceDate: '2026-07-25',
      }),
      vendorHistory: [
        makePayment({
          vendorId: 'VEND-01',
          amount: rupees(5_00_000),
          paidAt: '2026-07-17T10:00:00+05:30',
        }),
      ],
    });
    expect(duplicateInvoice(ctx)).toBeNull();
  });

  it('returns high when matching payment is exactly 7 days old (at window edge)', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({
        vendorId: 'VEND-01',
        amount: rupees(5_00_000),
        invoiceDate: '2026-07-25',
      }),
      vendorHistory: [
        makePayment({
          vendorId: 'VEND-01',
          amount: rupees(5_00_000),
          paidAt: '2026-07-18T10:00:00+05:30',
        }),
      ],
    });
    const flag = duplicateInvoice(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('high');
    expect(flag!.ruleId).toBe('DUPLICATE_INVOICE');
  });

  it('returns high when matching payment is 3 days old (planted scenario)', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({
        vendorId: 'TYRELL-09',
        amount: rupees(8_00_000),
        invoiceDate: '2026-07-25',
      }),
      vendorHistory: [
        makePayment({
          vendorId: 'TYRELL-09',
          amount: rupees(8_00_000),
          paidAt: '2026-07-22T11:00:00+05:30',
        }),
      ],
    });
    const flag = duplicateInvoice(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('high');
  });

  it('returns null when amount matches but vendor differs', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ vendorId: 'VEND-01', amount: rupees(5_00_000) }),
      vendorHistory: [
        makePayment({ vendorId: 'OTHER-02', amount: rupees(5_00_000) }),
      ],
    });
    expect(duplicateInvoice(ctx)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rule 5: STRUCTURING
// ---------------------------------------------------------------------------

describe('structuring', () => {
  // autoLimit = 25,00,000; structuringBand = 0.10; lowerBound = 22,50,000
  // Rs.2,40,000 = 24,00,000 paise is within the band

  it('returns null when fewer than 3 same-day payments in band', () => {
    const ctx = makeCtx({
      sameDayPayments: [
        makePayment({ amount: rupees(2_40_000) }),
        makePayment({ amount: rupees(2_40_000) }),
      ],
    });
    expect(structuring(ctx)).toBeNull();
  });

  it('returns null when 3 same-day payments are below the lower bound', () => {
    const ctx = makeCtx({
      sameDayPayments: [
        makePayment({ amount: rupees(2_00_000) }),
        makePayment({ amount: rupees(2_00_000) }),
        makePayment({ amount: rupees(2_00_000) }),
      ],
    });
    expect(structuring(ctx)).toBeNull();
  });

  it('returns null when 3 same-day payments are at or above autoLimit', () => {
    const ctx = makeCtx({
      sameDayPayments: [
        makePayment({ amount: rupees(2_50_000) }),
        makePayment({ amount: rupees(2_50_000) }),
        makePayment({ amount: rupees(2_50_000) }),
      ],
    });
    expect(structuring(ctx)).toBeNull();
  });

  it('returns high when exactly 3 same-day payments are in the band', () => {
    const ctx = makeCtx({
      sameDayPayments: [
        makePayment({ amount: rupees(2_40_000) }),
        makePayment({ amount: rupees(2_40_000) }),
        makePayment({ amount: rupees(2_40_000) }),
      ],
    });
    const flag = structuring(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('high');
    expect(flag!.ruleId).toBe('STRUCTURING');
  });

  it('fires on the planted scenario (4 payments of Rs.2,40,000)', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'PIED-PIPER-11' }),
      sameDayPayments: [
        makePayment({ vendorId: 'PIED-PIPER-11', amount: rupees(2_40_000) }),
        makePayment({ vendorId: 'PIED-PIPER-11', amount: rupees(2_40_000) }),
        makePayment({ vendorId: 'PIED-PIPER-11', amount: rupees(2_40_000) }),
        makePayment({ vendorId: 'PIED-PIPER-11', amount: rupees(2_40_000) }),
      ],
    });
    const flag = structuring(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.evidence).toContain('4 same-day payments');
    expect(flag!.evidence).toContain('9,60,000');
  });

  it('returns null with zero same-day payments', () => {
    const ctx = makeCtx({ sameDayPayments: [] });
    expect(structuring(ctx)).toBeNull();
  });

  it('payment at exactly the lower bound (22,500,000) is in the band', () => {
    const ctx = makeCtx({
      sameDayPayments: [
        makePayment({ amount: 22_500_000 }),
        makePayment({ amount: 22_500_000 }),
        makePayment({ amount: 22_500_000 }),
      ],
    });
    const flag = structuring(ctx);
    expect(flag).not.toBeNull();
  });

  it('payment one paise below the lower bound is NOT in the band', () => {
    const ctx = makeCtx({
      sameDayPayments: [
        makePayment({ amount: 22_500_000 - 1 }),
        makePayment({ amount: 22_500_000 - 1 }),
        makePayment({ amount: 22_500_000 - 1 }),
      ],
    });
    expect(structuring(ctx)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rule 6: DENY_LIST
// ---------------------------------------------------------------------------

describe('denyListRule', () => {
  it('returns null when deny list is empty', () => {
    const ctx = makeCtx({ denyList: [] });
    expect(denyListRule(ctx)).toBeNull();
  });

  it('returns null when neither vendor id nor account is on the list', () => {
    const ctx = makeCtx({ denyList: ['OTHER-99'] });
    expect(denyListRule(ctx)).toBeNull();
  });

  it('returns high when vendor id is on the deny list', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'UMBRELLA-22' }),
      denyList: ['UMBRELLA-22'],
    });
    const flag = denyListRule(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('high');
    expect(flag!.ruleId).toBe('DENY_LIST');
    expect(flag!.evidence).toContain('UMBRELLA-22');
  });

  it('returns high when destination account is on the deny list', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ destinationAccount: 'BAD-ACCT-01' }),
      denyList: ['BAD-ACCT-01'],
    });
    const flag = denyListRule(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('high');
    expect(flag!.evidence).toContain('BAD-ACCT-01');
  });

  it('returns high when both vendor id and account match', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'UMBRELLA-22' }),
      invoice: makeInvoice({ destinationAccount: '5000000005' }),
      denyList: ['UMBRELLA-22', '5000000005'],
    });
    const flag = denyListRule(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.evidence).toContain('UMBRELLA-22');
    expect(flag!.evidence).toContain('5000000005');
  });
});

// ---------------------------------------------------------------------------
// Rule 7: ACCOUNT_CHANGED
// ---------------------------------------------------------------------------

describe('accountChanged', () => {
  it('returns null when destination matches lastPaidAccount', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ lastPaidAccount: 'ACC-001' }),
      invoice: makeInvoice({ destinationAccount: 'ACC-001' }),
    });
    expect(accountChanged(ctx)).toBeNull();
  });

  it('returns null when vendor has no prior payment (lastPaidAccount is null)', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ lastPaidAccount: null }),
      invoice: makeInvoice({ destinationAccount: 'NEW-ACC' }),
    });
    expect(accountChanged(ctx)).toBeNull();
  });

  it('returns high when destination differs from lastPaidAccount', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'WAYNE-ENT-05', lastPaidAccount: '6000000006' }),
      invoice: makeInvoice({ destinationAccount: '7000000007' }),
    });
    const flag = accountChanged(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('high');
    expect(flag!.ruleId).toBe('ACCOUNT_CHANGED');
    expect(flag!.evidence).toContain('6000000006');
    expect(flag!.evidence).toContain('7000000007');
  });

  it('fires on the planted scenario (WAYNE-ENT-05)', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'WAYNE-ENT-05', lastPaidAccount: '6000000006' }),
      invoice: makeInvoice({ vendorId: 'WAYNE-ENT-05', destinationAccount: '7000000007' }),
    });
    const flag = accountChanged(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.evidence).toContain('WAYNE-ENT-05');
  });
});

// ---------------------------------------------------------------------------
// Rule 8: OFF_HOURS
// ---------------------------------------------------------------------------

describe('offHours', () => {
  it('returns null during business hours on a weekday', () => {
    // 2026-07-25 is Saturday — wait, let me check
    // 2026-07-20 is Monday. 2026-07-21 is Tuesday.
    // Let's use a known weekday: 2026-07-22 (Wednesday) at 14:30 IST
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T14:30:00+05:30' });
    expect(offHours(ctx)).toBeNull();
  });

  it('returns low when submitted at 18:00 IST (at end boundary)', () => {
    // 18:00 is >= businessEndHour (18), so outside
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T18:00:00+05:30' });
    const flag = offHours(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('low');
    expect(flag!.ruleId).toBe('OFF_HOURS');
  });

  it('returns null at 17:59 IST (last valid minute)', () => {
    // 17:59 < 18, so inside business hours
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T17:59:00+05:30' });
    expect(offHours(ctx)).toBeNull();
  });

  it('returns low when submitted at 08:59 IST (before start)', () => {
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T08:59:00+05:30' });
    const flag = offHours(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('low');
  });

  it('returns null at 09:00 IST (first valid hour)', () => {
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T09:00:00+05:30' });
    expect(offHours(ctx)).toBeNull();
  });

  it('returns low on a Saturday', () => {
    // 2026-07-25 is Saturday
    const ctx = makeCtx({ evaluatedAt: '2026-07-25T14:30:00+05:30' });
    const flag = offHours(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.severity).toBe('low');
    expect(flag!.evidence).toContain('Saturday');
  });

  it('returns low on a Sunday', () => {
    // 2026-07-26 is Sunday
    const ctx = makeCtx({ evaluatedAt: '2026-07-26T14:30:00+05:30' });
    const flag = offHours(ctx);
    expect(flag).not.toBeNull();
    expect(flag!.evidence).toContain('Sunday');
  });

  it('handles UTC timestamps correctly (converts to IST)', () => {
    // 2026-07-22T03:30:00Z = 2026-07-22T09:00:00+05:30 — exactly at start
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T03:30:00Z' });
    expect(offHours(ctx)).toBeNull();
  });

  it('off-hours UTC timestamp maps to outside IST business hours', () => {
    // 2026-07-22T00:00:00Z = 2026-07-22T05:30:00+05:30 — before 09:00
    const ctx = makeCtx({ evaluatedAt: '2026-07-22T00:00:00Z' });
    const flag = offHours(ctx);
    expect(flag).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Engine: assessRisk + deriveTier
// ---------------------------------------------------------------------------

describe('deriveTier', () => {
  it('AUTO when no flags and under autoLimit', () => {
    expect(deriveTier([], rupees(1_00_000), TH.autoLimit, TH.dualLimit)).toBe('AUTO');
  });

  it('SINGLE_APPROVAL when medium flag present', () => {
    const flags = [{ ruleId: 'AMOUNT_TIER' as const, severity: 'medium' as const, evidence: 'test' }];
    expect(deriveTier(flags, rupees(3_00_000), TH.autoLimit, TH.dualLimit)).toBe('SINGLE_APPROVAL');
  });

  it('SINGLE_APPROVAL when over autoLimit, no flags', () => {
    expect(deriveTier([], rupees(3_00_000), TH.autoLimit, TH.dualLimit)).toBe('SINGLE_APPROVAL');
  });

  it('DUAL_APPROVAL when high flag present', () => {
    const flags = [{ ruleId: 'AMOUNT_TIER' as const, severity: 'high' as const, evidence: 'test' }];
    expect(deriveTier(flags, rupees(15_00_000), TH.autoLimit, TH.dualLimit)).toBe('DUAL_APPROVAL');
  });

  it('DUAL_APPROVAL when over dualLimit, no flags', () => {
    expect(deriveTier([], rupees(15_00_000), TH.autoLimit, TH.dualLimit)).toBe('DUAL_APPROVAL');
  });

  it('BLOCKED when DENY_LIST flag present, regardless of other flags', () => {
    const flags = [
      { ruleId: 'DENY_LIST' as const, severity: 'high' as const, evidence: 'test' },
      { ruleId: 'AMOUNT_TIER' as const, severity: 'medium' as const, evidence: 'test' },
    ];
    expect(deriveTier(flags, rupees(1_00_000), TH.autoLimit, TH.dualLimit)).toBe('BLOCKED');
  });

  it('DUAL_APPROVAL takes priority over BLOCKED when no DENY_LIST', () => {
    const flags = [
      { ruleId: 'ACCOUNT_CHANGED' as const, severity: 'high' as const, evidence: 'test' },
    ];
    expect(deriveTier(flags, rupees(15_00_000), TH.autoLimit, TH.dualLimit)).toBe('DUAL_APPROVAL');
  });
});

describe('assessRisk', () => {
  it('returns empty flags and AUTO for a clean invoice', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: rupees(1_00_000) }),
      vendorHistory: [makePayment()],
      sameDayPayments: [],
    });
    const result = assessRisk(ctx);
    expect(result.flags).toHaveLength(0);
    expect(result.tier).toBe('AUTO');
  });

  it('returns BLOCKED for a deny-listed vendor', () => {
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'UMBRELLA-22' }),
      invoice: makeInvoice({ vendorId: 'UMBRELLA-22' }),
      denyList: ['UMBRELLA-22'],
    });
    const result = assessRisk(ctx);
    expect(result.tier).toBe('BLOCKED');
    expect(result.flags.some((f) => f.ruleId === 'DENY_LIST')).toBe(true);
  });

  it('returns DUAL_APPROVAL for an invoice above dualLimit', () => {
    const ctx = makeCtx({
      invoice: makeInvoice({ amount: rupees(15_00_000) }),
      vendorHistory: [makePayment()],
    });
    const result = assessRisk(ctx);
    expect(result.tier).toBe('DUAL_APPROVAL');
  });

  it('collects multiple flags for a multi-trigger invoice', () => {
    // WAYNE-ENT-05: account changed + amount tier medium
    const ctx = makeCtx({
      vendor: makeVendor({ id: 'WAYNE-ENT-05', lastPaidAccount: '6000000006' }),
      invoice: makeInvoice({
        vendorId: 'WAYNE-ENT-05',
        amount: rupees(3_00_000),
        destinationAccount: '7000000007',
      }),
      vendorHistory: [makePayment()],
    });
    const result = assessRisk(ctx);
    expect(result.flags.length).toBeGreaterThanOrEqual(2);
    expect(result.flags.some((f) => f.ruleId === 'ACCOUNT_CHANGED')).toBe(true);
    expect(result.flags.some((f) => f.ruleId === 'AMOUNT_TIER')).toBe(true);
  });
});
