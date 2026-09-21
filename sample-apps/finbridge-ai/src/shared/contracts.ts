import { z } from '@nitrostack/core';

// Frozen contract file. DO NOT EDIT after commit.

export const SchemeId = z.union([
  z.literal('PMJDY'),
  z.literal('APY'),
  z.literal('PMJJBY'),
  z.literal('PMSBY'),
  z.literal('SSY'),
  z.literal('SCSS'),
  z.literal('NPS')
]);

export const Gender = z.enum(['male', 'female', 'other']);
export type Gender = z.infer<typeof Gender>;

export const FundCategory = z.enum(['equity', 'debt', 'hybrid', 'index']);
export type FundCategory = z.infer<typeof FundCategory>;

export const Occupation = z.enum(['salaried', 'self_employed', 'student', 'homemaker', 'retired', 'unemployed']);

export const BaseOutput = z.object({
  risk_note: z.string(),
  educational_only: z.literal(true)
});

export const Scheme = z.object({
  schemeId: SchemeId,
  schemeName: z.string(),
  ageMin: z.number().int(),
  ageMax: z.number().int().nullable(),  // AMENDED +4h (all four agreed): PMJDY and SCSS have no upper age limit
  incomeCeiling: z.number().nullable(),
  gender: Gender.optional().nullable(),
  requiresExistingBankAccount: z.boolean(),
  taxPayerStatus: z.enum(['required', 'optional', 'not_applicable', 'excluded']),
  // AMENDED +4h: empty array or omitted = no occupation restriction.
  // Without this the tool accepted `occupation` and silently ignored it.
  occupations: z.array(Occupation).optional().default([]),
  benefits: z.array(z.string()),
  documents: z.array(z.string()),
  applyLink: z.string().url()
});

// Tool input/output schemas
export const CheckSchemeEligibilityInput = z.object({
  age: z.number().int(),
  monthlyIncome: z.number(),
  gender: Gender,
  occupation: Occupation,
  hasBankAccount: z.boolean(),
  isTaxPayer: z.boolean()
});

export const SchemeSummary = z.object({
  schemeId: SchemeId,
  schemeName: z.string()
});

export const EligibilityResult = z.object({
  eligible: z.array(z.object({
    schemeId: SchemeId,
    schemeName: z.string(),
    reason: z.string()
  })),
  ineligible: z.array(z.object({
    schemeId: SchemeId,
    schemeName: z.string(),
    failedCondition: z.string()
  }))
}).merge(BaseOutput);

export const ProjectGrowthInput = z.object({
  monthlyAmount: z.number(),
  years: z.number().int(),
  fundCategory: FundCategory
});

export const ProjectGrowthOutput = z.object({
  lowEstimate: z.number(),
  highEstimate: z.number(),
  assumptions: z.array(z.string()),
  navSource: z.string()
}).merge(BaseOutput);

export const FinancialHealthInput = z.object({
  monthlyIncome: z.number(),
  monthlyExpenses: z.number(),
  savings: z.number(),
  monthlyDebtPayment: z.number(),
  emergencyFundMonths: z.number().int()
});

export const FinancialHealthOutput = z.object({
  score: z.number().int(),
  subScores: z.object({
    savingsRate: z.number(),
    emergencyFund: z.number(),
    debtRatio: z.number()
  }),
  suggestions: z.array(z.string())
}).merge(BaseOutput);

export const ExplainConceptInput = z.object({ term: z.string() });
export const ExplainConceptOutput = z.object({
  term: z.string(),
  explanation: z.string(),
  example: z.string()
}).merge(BaseOutput);

export type Scheme = z.infer<typeof Scheme>;
export type BaseOutput = z.infer<typeof BaseOutput>;

export type CheckSchemeEligibilityInput = z.infer<typeof CheckSchemeEligibilityInput>;
export type EligibilityResult = z.infer<typeof EligibilityResult>;
export type ProjectGrowthInput = z.infer<typeof ProjectGrowthInput>;
export type ProjectGrowthOutput = z.infer<typeof ProjectGrowthOutput>;
export type FinancialHealthInput = z.infer<typeof FinancialHealthInput>;
export type FinancialHealthOutput = z.infer<typeof FinancialHealthOutput>;
export type ExplainConceptInput = z.infer<typeof ExplainConceptInput>;
export type ExplainConceptOutput = z.infer<typeof ExplainConceptOutput>;
