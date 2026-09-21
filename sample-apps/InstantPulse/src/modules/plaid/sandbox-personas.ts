import type { PersonaId, RiskBand } from '../../common/types/instantpulse.types.js';

/**
 * Reproducible demo businesses.
 *
 * A pitch where the verdict changes between run-throughs is a pitch you cannot
 * rehearse, so every persona is generated from a seeded PRNG: the same persona
 * always yields the same ledger, the same metrics and the same band.
 *
 * One generator feeds both paths — it emits Plaid's `user_custom` override
 * payload when sandbox keys are present, and the normalized ledger directly
 * when they are not. Identical numbers either way.
 */

export type TransactionKind =
  | 'customer_payment'
  | 'payroll'
  | 'rent'
  | 'loan'
  | 'supplier'
  | 'utilities'
  | 'software'
  | 'tax'
  | 'nsf_fee'
  | 'owner_draw'
  | 'anomalous_wire';

export interface GeneratedTransaction {
  date: string;
  /** Plaid convention: positive = money leaving the account. */
  amount: number;
  description: string;
  kind: TransactionKind;
}

export interface PersonaProfile {
  id: PersonaId;
  label: string;
  narrative: string;
  expectedBand: RiskBand | 'varies';
  institutionId: string;
  institutionName: string;
  /** Plaid's stock sandbox user; no generated ledger. */
  usesStockSandboxUser: boolean;
  accountName: string;
  params: PersonaParams;
}

interface PersonaParams {
  seed: number;
  startingBalance: number;
  baseMonthlyRevenue: number;
  /** Target coefficient of variation on monthly revenue. */
  revenueVolatility: number;
  /** Compounding month-over-month growth (negative = decline). */
  monthlyTrend: number;
  /** Total outflow as a multiple of inflow. Above 1.0 means burning cash. */
  expenseRatio: number;
  monthlyLoanPayment: number;
  nsfEvents: number;
  anomalousWires: number;
  accountTenureDays: number;
  depositsPerMonth: number;
}

const PLATYPUS = { id: 'ins_109508', name: 'First Platypus Bank' };
const GINGHAM = { id: 'ins_109509', name: 'First Gingham Credit Union' };
const TATTERSALL = { id: 'ins_109510', name: 'Tattersall Federal Credit Union' };
const HOUNDSTOOTH = { id: 'ins_109511', name: 'Houndstooth Bank' };

export const PERSONAS: Record<PersonaId, PersonaProfile> = {
  healthy: {
    id: 'healthy',
    label: 'Northwind Supply Co.',
    narrative:
      'Established B2B distributor. Two and a half years of banking history, steady recurring ' +
      'customer deposits, comfortable cash buffer and light debt service. Should clear automatically.',
    expectedBand: 'GREEN',
    institutionId: PLATYPUS.id,
    institutionName: PLATYPUS.name,
    usesStockSandboxUser: false,
    accountName: 'Business Checking',
    params: {
      seed: 1042,
      startingBalance: 78_400,
      baseMonthlyRevenue: 62_000,
      revenueVolatility: 0.09,
      monthlyTrend: 0.021,
      expenseRatio: 0.71,
      monthlyLoanPayment: 1_850,
      nsfEvents: 0,
      anomalousWires: 0,
      accountTenureDays: 910,
      depositsPerMonth: 11,
    },
  },

  volatile: {
    id: 'volatile',
    label: 'Bellwether Events LLC',
    narrative:
      'Seasonal events business. Revenue swings hard month to month, cash buffer is thin and debt ' +
      'service is heavy. Genuinely borderline — the case a human officer should actually look at.',
    expectedBand: 'YELLOW',
    institutionId: GINGHAM.id,
    institutionName: GINGHAM.name,
    usesStockSandboxUser: false,
    accountName: 'Business Checking',
    params: {
      seed: 2087,
      startingBalance: 34_000,
      baseMonthlyRevenue: 41_000,
      revenueVolatility: 0.46,
      monthlyTrend: -0.012,
      expenseRatio: 0.85,
      monthlyLoanPayment: 4_400,
      nsfEvents: 1,
      anomalousWires: 2,
      accountTenureDays: 430,
      depositsPerMonth: 7,
    },
  },

  distressed: {
    id: 'distressed',
    label: 'Kestrel Auto Detailing',
    narrative:
      'Young business burning cash. Barely three months of history, outflow exceeds inflow, repeated ' +
      'NSF fees and unexplained large wires. Should be declined with explicit reasons.',
    expectedBand: 'RED',
    institutionId: TATTERSALL.id,
    institutionName: TATTERSALL.name,
    usesStockSandboxUser: false,
    accountName: 'Business Checking',
    params: {
      seed: 3311,
      startingBalance: 24_000,
      baseMonthlyRevenue: 12_500,
      revenueVolatility: 0.64,
      monthlyTrend: -0.058,
      expenseRatio: 1.19,
      monthlyLoanPayment: 3_400,
      nsfEvents: 5,
      anomalousWires: 3,
      accountTenureDays: 96,
      depositsPerMonth: 5,
    },
  },

  default: {
    id: 'default',
    label: "Plaid's stock sandbox user",
    narrative:
      "Plaid's built-in user_good account. Useful for proving the integration talks to the real " +
      'sandbox rather than to our generator — its ledger is short, so expect a data-coverage flag.',
    expectedBand: 'varies',
    institutionId: HOUNDSTOOTH.id,
    institutionName: HOUNDSTOOTH.name,
    usesStockSandboxUser: true,
    accountName: 'Plaid Checking',
    params: {
      seed: 7,
      startingBalance: 0,
      baseMonthlyRevenue: 0,
      revenueVolatility: 0,
      monthlyTrend: 0,
      expenseRatio: 0,
      monthlyLoanPayment: 0,
      nsfEvents: 0,
      anomalousWires: 0,
      accountTenureDays: 0,
      depositsPerMonth: 0,
    },
  },
};

// ---------------------------------------------------------------------------
// Deterministic ledger generation
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, and identical across runs for a given seed. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller, so volatility behaves like real revenue rather than a uniform smear. */
function gaussian(rng: () => number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CUSTOMER_SOURCES = [
  'STRIPE PAYOUT',
  'SQUARE INC DEPOSIT',
  'ACH DEPOSIT SHOPIFY',
  'CUSTOMER PAYMENT INV',
  'WIRE IN - TRADE RECEIVABLE',
  'BILL PAY DEPOSIT',
];

const SUPPLIERS = [
  'UNITED WHOLESALE SUPPLY',
  'MERIDIAN LOGISTICS',
  'CROWNPOINT MATERIALS',
  'ATLAS PACKAGING CO',
];

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build a persona's ledger.
 *
 * Kept under Plaid's ~250-transaction custom-user ceiling: roughly 30 entries a
 * month across a 180-day window, which also keeps the JSON well under 55kb.
 */
export function generateLedger(
  persona: PersonaProfile,
  windowDays = 180,
  asOf: Date = new Date(),
): GeneratedTransaction[] {
  const p = persona.params;
  if (persona.usesStockSandboxUser) return [];

  const rng = makeRng(p.seed);
  const transactions: GeneratedTransaction[] = [];

  // Never fabricate more history than the business has actually banked.
  const effectiveDays = Math.min(windowDays, p.accountTenureDays);
  const windowStart = new Date(asOf.getTime() - effectiveDays * 86_400_000);

  // Real calendar months, not 30-day blocks.
  //
  // This matters more than it looks. Rent, payroll and loan payments fall on
  // fixed days of the *calendar* month, so laying them on rolling 30-day
  // periods lets them drift — some calendar months end up with two rent
  // payments and others with none. Any consumer that buckets by month then
  // sees wild swings that the business never actually had, and a healthy
  // applicant can be declined for negative cash flow that is purely an
  // artefact of the generator.
  const monthStarts: Date[] = [];
  const cursor = new Date(Date.UTC(windowStart.getUTCFullYear(), windowStart.getUTCMonth(), 1));
  while (cursor <= asOf) {
    monthStarts.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const months = monthStarts.length;

  /** A real date inside calendar month `m`, clamped to that month's length. */
  const dayInMonth = (monthIndex: number, day: number): string => {
    const start = monthStarts[Math.min(monthIndex, months - 1)];
    const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    return iso(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), Math.min(day, lastDay))));
  };

  for (let m = 0; m < months; m++) {
    const trendFactor = Math.pow(1 + p.monthlyTrend, m);
    const shock = 1 + gaussian(rng) * p.revenueVolatility;
    const monthlyRevenue = Math.max(400, p.baseMonthlyRevenue * trendFactor * shock);

    // --- Inflows: customer deposits, uneven in size ---------------------------
    const depositCount = Math.max(2, Math.round(p.depositsPerMonth * (0.75 + rng() * 0.5)));
    const weights = Array.from({ length: depositCount }, () => 0.4 + rng());
    const weightTotal = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < depositCount; i++) {
      const amount = (monthlyRevenue * weights[i]) / weightTotal;
      const source = CUSTOMER_SOURCES[Math.floor(rng() * CUSTOMER_SOURCES.length)];
      transactions.push({
        date: dayInMonth(m, Math.floor(rng() * 28) + 1),
        amount: -round2(amount), // negative = money in
        description: source === 'CUSTOMER PAYMENT INV' ? `${source}-${4000 + Math.floor(rng() * 900)}` : source,
        kind: 'customer_payment',
      });
    }

    // --- Outflows: fixed obligations first, then variable spend --------------
    const totalOutflow = monthlyRevenue * p.expenseRatio;
    const payrollTotal = totalOutflow * 0.42;
    const rent = totalOutflow * 0.14;
    const loan = p.monthlyLoanPayment;
    const utilities = totalOutflow * 0.04;
    const software = totalOutflow * 0.03;

    transactions.push(
      {
        date: dayInMonth(m, 5),
        amount: round2(payrollTotal / 2),
        description: 'GUSTO PAYROLL',
        kind: 'payroll',
      },
      {
        date: dayInMonth(m, 20),
        amount: round2(payrollTotal / 2),
        description: 'GUSTO PAYROLL',
        kind: 'payroll',
      },
      {
        date: dayInMonth(m, 1),
        amount: round2(rent),
        description: 'COMMERCIAL LEASE PAYMENT',
        kind: 'rent',
      },
      {
        date: dayInMonth(m, 8),
        amount: round2(loan),
        description: 'SBA LOAN PAYMENT',
        kind: 'loan',
      },
      {
        date: dayInMonth(m, 12),
        amount: round2(utilities),
        description: 'CITY UTILITIES AUTOPAY',
        kind: 'utilities',
      },
      {
        date: dayInMonth(m, 15),
        amount: round2(software),
        description: 'AWS CLOUD SERVICES',
        kind: 'software',
      },
    );

    const remaining = Math.max(0, totalOutflow - payrollTotal - rent - loan - utilities - software);
    const supplierCount = 8;
    const supplierWeights = Array.from({ length: supplierCount }, () => 0.4 + rng());
    const supplierWeightTotal = supplierWeights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < supplierCount; i++) {
      transactions.push({
        date: dayInMonth(m, Math.floor(rng() * 28) + 1),
        amount: round2((remaining * supplierWeights[i]) / supplierWeightTotal),
        description: SUPPLIERS[Math.floor(rng() * SUPPLIERS.length)],
        kind: 'supplier',
      });
    }
  }

  // --- Distress markers, spread across the window ---------------------------
  for (let i = 0; i < p.nsfEvents; i++) {
    const m = Math.floor((i / Math.max(1, p.nsfEvents)) * months);
    transactions.push({
      date: dayInMonth(Math.min(m, months - 1), Math.floor(rng() * 28) + 1),
      amount: 35,
      description: 'NSF FEE - RETURNED ITEM',
      kind: 'nsf_fee',
    });
  }

  // Large round-number wires are the classic "explain this" transaction — the
  // anomaly detector is built to catch exactly this shape. Sized relative to
  // revenue: a flat $40k wire would be unremarkable for one persona and
  // physically impossible for another.
  for (let i = 0; i < p.anomalousWires; i++) {
    const m = Math.floor((i / Math.max(1, p.anomalousWires)) * months);
    const factor = [0.18, 0.26, 0.34][i % 3];
    const amount = Math.round((p.baseMonthlyRevenue * factor) / 500) * 500;
    transactions.push({
      date: dayInMonth(Math.min(m, months - 1), Math.floor(rng() * 28) + 1),
      amount,
      description: 'OUTGOING WIRE TRANSFER',
      kind: 'anomalous_wire',
    });
  }

  // The first and last calendar months overhang the observation window, and no
  // transaction may be dated in the future.
  const from = iso(windowStart);
  const to = iso(asOf);

  return transactions
    .filter((t) => t.date >= from && t.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Render a persona as Plaid's `user_custom` override payload.
 * Passed as `override_password` on /sandbox/public_token/create.
 */
export function buildCustomUserConfig(persona: PersonaProfile, windowDays = 180): string {
  const ledger = generateLedger(persona, windowDays);

  return JSON.stringify({
    schema_version: '2',
    seed: String(persona.params.seed),
    override_accounts: [
      {
        type: 'depository',
        subtype: 'checking',
        starting_balance: persona.params.startingBalance,
        currency: 'USD',
        meta: {
          name: persona.accountName,
          official_name: `${persona.label} ${persona.accountName}`,
          limit: 0,
        },
        transactions: ledger.map((t) => ({
          date_transacted: t.date,
          date_posted: t.date,
          amount: t.amount,
          description: t.description,
          currency: 'USD',
        })),
      },
    ],
  });
}

export function listPersonas(): Array<Omit<PersonaProfile, 'params'> & { transactionCount: number }> {
  return Object.values(PERSONAS).map((p) => {
    const { params, ...rest } = p;
    return { ...rest, transactionCount: generateLedger(p).length };
  });
}
