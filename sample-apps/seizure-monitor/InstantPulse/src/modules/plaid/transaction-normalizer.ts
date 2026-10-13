import type {
  LiabilitySummary,
  NormalizedAccount,
  NormalizedTransaction,
} from '../../common/types/instantpulse.types.js';
import type { GeneratedTransaction } from './sandbox-personas.js';

/**
 * Plaid → InstantPulse translation.
 *
 * The one rule everything downstream depends on: after normalization,
 * `amount > 0` means money arrived. Plaid reports the opposite (positive =
 * money leaving), so the sign is inverted exactly once, here.
 *
 * Classification is keyword-based rather than category-based on purpose. The
 * generated sandbox ledger and a real Plaid response carry different category
 * taxonomies, but both carry a description — matching on that keeps the two
 * paths scoring identically.
 */

interface PlaidAccountLike {
  account_id: string;
  name: string;
  official_name?: string | null;
  type: string;
  subtype?: string | null;
  mask?: string | null;
  balances: {
    current?: number | null;
    available?: number | null;
    iso_currency_code?: string | null;
  };
}

interface PlaidTransactionLike {
  transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code?: string | null;
  date: string;
  name: string;
  merchant_name?: string | null;
  pending?: boolean;
  category?: string[] | null;
  personal_finance_category?: { primary?: string; detailed?: string } | null;
}

export function normalizeAccounts(accounts: PlaidAccountLike[]): NormalizedAccount[] {
  return accounts.map((a) => ({
    accountId: a.account_id,
    name: a.name,
    officialName: a.official_name ?? undefined,
    type: a.type,
    subtype: a.subtype ?? undefined,
    mask: a.mask ?? undefined,
    currentBalance: a.balances.current ?? 0,
    availableBalance: a.balances.available ?? undefined,
    isoCurrencyCode: a.balances.iso_currency_code ?? 'USD',
  }));
}

export function normalizeTransactions(transactions: PlaidTransactionLike[]): NormalizedTransaction[] {
  return transactions
    .map((t) => {
      // The single sign inversion. Plaid: positive = money out.
      const amount = -t.amount;
      const category = t.category ?? [];
      const pfc = t.personal_finance_category?.primary;

      return {
        id: t.transaction_id,
        accountId: t.account_id,
        date: t.date,
        amount,
        direction: amount >= 0 ? ('inflow' as const) : ('outflow' as const),
        name: t.name,
        merchantName: t.merchant_name ?? undefined,
        category,
        primaryCategory: pfc || category[0] || inferCategory(t.name),
        pending: t.pending ?? false,
        isoCurrencyCode: t.iso_currency_code ?? 'USD',
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Convert the generated ledger straight to normalized form (offline path). */
export function ledgerToNormalized(
  ledger: GeneratedTransaction[],
  accountId: string,
): NormalizedTransaction[] {
  return ledger.map((t, index) => {
    const amount = -t.amount;
    return {
      id: `sim_${accountId}_${index}`,
      accountId,
      date: t.date,
      amount,
      direction: amount >= 0 ? ('inflow' as const) : ('outflow' as const),
      name: t.description,
      category: [inferCategory(t.description)],
      primaryCategory: inferCategory(t.description),
      pending: false,
      isoCurrencyCode: 'USD',
    };
  });
}

// Plaid types every `account_id` on a liability as nullable, so these mirror
// that rather than fighting it — entries without one are skipped below.
interface PlaidLiabilitiesLike {
  credit?: Array<{
    account_id?: string | null;
    last_statement_balance?: number | null;
    minimum_payment_amount?: number | null;
    aprs?: Array<{ apr_percentage?: number | null }> | null;
    is_overdue?: boolean | null;
  }> | null;
  student?: Array<{
    account_id?: string | null;
    outstanding_interest_amount?: number | null;
    minimum_payment_amount?: number | null;
    interest_rate_percentage?: number | null;
    is_overdue?: boolean | null;
  }> | null;
  mortgage?: Array<{
    account_id?: string | null;
    next_monthly_payment?: number | null;
    interest_rate?: { percentage?: number | null } | null;
    past_due_amount?: number | null;
  }> | null;
}

export function normalizeLiabilities(
  liabilities: PlaidLiabilitiesLike | null | undefined,
  accounts: NormalizedAccount[],
): LiabilitySummary[] {
  if (!liabilities) return [];
  const balanceOf = (id: string) =>
    Math.abs(accounts.find((a) => a.accountId === id)?.currentBalance ?? 0);

  const out: LiabilitySummary[] = [];

  for (const c of liabilities.credit ?? []) {
    if (!c.account_id) continue;
    out.push({
      kind: 'credit',
      accountId: c.account_id,
      outstanding: c.last_statement_balance ?? balanceOf(c.account_id),
      minimumPayment: c.minimum_payment_amount ?? undefined,
      apr: c.aprs?.[0]?.apr_percentage ?? undefined,
      isOverdue: Boolean(c.is_overdue),
    });
  }

  for (const s of liabilities.student ?? []) {
    if (!s.account_id) continue;
    out.push({
      kind: 'student',
      accountId: s.account_id,
      outstanding: balanceOf(s.account_id),
      minimumPayment: s.minimum_payment_amount ?? undefined,
      apr: s.interest_rate_percentage ?? undefined,
      isOverdue: Boolean(s.is_overdue),
    });
  }

  for (const m of liabilities.mortgage ?? []) {
    if (!m.account_id) continue;
    out.push({
      kind: 'mortgage',
      accountId: m.account_id,
      outstanding: balanceOf(m.account_id),
      minimumPayment: m.next_monthly_payment ?? undefined,
      apr: m.interest_rate?.percentage ?? undefined,
      isOverdue: (m.past_due_amount ?? 0) > 0,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Classification — shared by both data paths
// ---------------------------------------------------------------------------

const NSF_PATTERNS = /\b(nsf|non[- ]?sufficient|insufficient funds|overdraft|returned item|return fee)\b/i;
const DEBT_PATTERNS =
  /\b(loan|sba|lending club|fundbox|ondeck|kabbage|bluevine|merchant cash advance|mca|installment|repayment|note payable|credit card payment|amex payment|line of credit)\b/i;
const PAYROLL_PATTERNS = /\b(payroll|gusto|adp|paychex|rippling|wages|salary)\b/i;
const HIGH_RISK_PATTERNS =
  /\b(casino|betting|wager|sportsbook|lottery|crypto|coinbase|binance|kraken|payday loan|pawn)\b/i;
const WIRE_PATTERNS = /\b(wire transfer|outgoing wire|wire out|international transfer)\b/i;

export function isNsfFee(t: NormalizedTransaction): boolean {
  return NSF_PATTERNS.test(t.name) || NSF_PATTERNS.test(t.merchantName ?? '');
}

export function isDebtService(t: NormalizedTransaction): boolean {
  return t.direction === 'outflow' && DEBT_PATTERNS.test(`${t.name} ${t.merchantName ?? ''}`);
}

export function isPayroll(t: NormalizedTransaction): boolean {
  return t.direction === 'outflow' && PAYROLL_PATTERNS.test(`${t.name} ${t.merchantName ?? ''}`);
}

export function isHighRiskMerchant(t: NormalizedTransaction): boolean {
  return HIGH_RISK_PATTERNS.test(`${t.name} ${t.merchantName ?? ''} ${t.primaryCategory}`);
}

export function isWire(t: NormalizedTransaction): boolean {
  return WIRE_PATTERNS.test(`${t.name} ${t.merchantName ?? ''}`);
}

function inferCategory(description: string): string {
  const d = description.toLowerCase();
  if (NSF_PATTERNS.test(d)) return 'BANK_FEES';
  if (PAYROLL_PATTERNS.test(d)) return 'PAYROLL';
  if (DEBT_PATTERNS.test(d)) return 'LOAN_PAYMENTS';
  if (/lease|rent/.test(d)) return 'RENT_AND_UTILITIES';
  if (/utilit|electric|water|gas company/.test(d)) return 'RENT_AND_UTILITIES';
  if (/aws|cloud|quickbooks|software|saas|subscription/.test(d)) return 'GENERAL_SERVICES';
  if (/wire/.test(d)) return 'TRANSFER_OUT';
  if (/stripe|square|shopify|deposit|payment inv|receivable|bill pay/.test(d)) return 'INCOME';
  if (/supply|wholesale|logistics|materials|packaging/.test(d)) return 'GENERAL_MERCHANDISE';
  if (/tax|irs/.test(d)) return 'GOVERNMENT_AND_NON_PROFIT';
  return 'OTHER';
}
