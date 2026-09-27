export interface FinancialHealthInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  monthlyDebtPayment: number;
  emergencyFundMonths: number;
}

export interface FinancialHealthResult {
  score: number;
  subScores: { savingsRate: number; emergencyFund: number; debtRatio: number };
  suggestions: string[];
}

const EMERGENCY_FUND_TARGET_MONTHS = 6;
const DEBT_RATIO_FAILURE_THRESHOLD = 0.4;
const SAVINGS_RATE_TARGET = 0.3;
const WEIGHTS = { savingsRate: 0.4, emergencyFund: 0.3, debtRatio: 0.3 };

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreSavingsRate(income: number, expenses: number, debtPayment: number): number {
  const rate = (income - expenses - debtPayment) / income;
  return clampScore((rate / SAVINGS_RATE_TARGET) * 100);
}

export function scoreEmergencyFund(months: number): number {
  return clampScore((months / EMERGENCY_FUND_TARGET_MONTHS) * 100);
}

export function scoreDebtRatio(income: number, debtPayment: number): number {
  const ratio = debtPayment / income;
  return clampScore(100 - (ratio / DEBT_RATIO_FAILURE_THRESHOLD) * 100);
}

export function calculateFinancialHealth(input: FinancialHealthInput): FinancialHealthResult {
  const savingsRate = scoreSavingsRate(input.monthlyIncome, input.monthlyExpenses, input.monthlyDebtPayment);
  const emergencyFund = scoreEmergencyFund(input.emergencyFundMonths);
  const debtRatio = scoreDebtRatio(input.monthlyIncome, input.monthlyDebtPayment);

  const score = clampScore(
    savingsRate * WEIGHTS.savingsRate + emergencyFund * WEIGHTS.emergencyFund + debtRatio * WEIGHTS.debtRatio
  );

  const suggestions: string[] = [];

  if (input.monthlyExpenses + input.monthlyDebtPayment > input.monthlyIncome) {
    suggestions.push(
      'Your expenses and debt payments currently exceed your income — address this before setting savings or investment goals.'
    );
  } else if (savingsRate < 50) {
    suggestions.push(
      'Your monthly savings rate is low — review discretionary expenses to free up more income for savings and investing.'
    );
  }

  if (emergencyFund < 50) {
    suggestions.push(
      'You have less than 3 months of expenses in your emergency fund — aim to build toward 6 months before taking on more investment risk.'
    );
  }

  if (debtRatio < 50) {
    suggestions.push(
      'Your monthly debt payments take up a large share of your income — prioritize paying down high-interest debt first.'
    );
  }

  const expectedMonthsFromSavings = input.monthlyExpenses > 0 ? input.savings / input.monthlyExpenses : 0;
  if (Math.abs(expectedMonthsFromSavings - input.emergencyFundMonths) > 1) {
    suggestions.push(
      `Your stated savings imply roughly ${expectedMonthsFromSavings.toFixed(1)} months of expenses covered, versus the ${input.emergencyFundMonths} months provided — double-check this figure.`
    );
  }

  if (suggestions.length === 0) {
    suggestions.push(
      'Your financial fundamentals are strong — consider increasing investment contributions or exploring tax-advantaged schemes.'
    );
  }

  return { score, subScores: { savingsRate, emergencyFund, debtRatio }, suggestions };
}
