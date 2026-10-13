/**
 * SAMPLE FAMILY FIXTURE
 * 
 * Ramesh Kumar, Coimbatore, died intestate, survived by wife Lakshmi and two adult children.
 * Four assets chosen to produce four different routes, plus a fifth scenario for delay compensation.
 */

export interface SampleAsset {
  id: string;
  assetType: string;
  institutionType: string;
  institutionName: string;
  valueInr: number;
  nomineeStatus: 'valid' | 'none' | 'predeceased' | 'minor';
  nomineeName?: string;
  isCooperativeBank?: boolean;
  description: string;
  expectedRoute: string;
}

export interface SampleScenario {
  id: string;
  familyName: string;
  deceased: string;
  location: string;
  state: string;
  stateCode: string;
  religion: 'hindu' | 'christian' | 'parsi' | 'other';
  hasWill: boolean;
  spouse?: string;
  children: string[];
  assets: SampleAsset[];
  description: string;
}

/**
 * ASSET 1: SBI Savings Account
 * INR 240,000, valid spouse nominee (Lakshmi)
 * Expected route: NOMINEE_CLAIM, regulatory, 15 days, near-zero cost
 */
export const ASSET_1_SBI_SAVINGS: SampleAsset = {
  id: 'asset_1_sbi_savings',
  assetType: 'bank_savings',
  institutionType: 'bank',
  institutionName: 'State Bank of India (SBI), Coimbatore Main Branch',
  valueInr: 240000,
  nomineeStatus: 'valid',
  nomineeName: 'Lakshmi (spouse)',
  isCooperativeBank: false,
  description: 'SBI savings account with valid spouse nominee',
  expectedRoute: 'NOMINEE_CLAIM',
};

/**
 * ASSET 2: LIC Policy
 * INR 300,000, nominee (mother) predeceased
 * Expected route: LEGAL_HEIR_CERTIFICATE, institution policy
 */
export const ASSET_2_LIC_POLICY: SampleAsset = {
  id: 'asset_2_lic_policy',
  assetType: 'life_insurance',
  institutionType: 'lic',
  institutionName: 'Life Insurance Corporation of India (LIC)',
  valueInr: 300000,
  nomineeStatus: 'predeceased',
  nomineeName: 'Ramesh\'s mother (predeceased)',
  description: 'LIC endowment policy with predeceased nominee',
  expectedRoute: 'LEGAL_HEIR_CERTIFICATE',
};

/**
 * ASSET 3: EPF Balance
 * INR 450,000, no nominee
 * Expected route: EPFO_LEGAL_HEIR_CLAIM, Form 20 + Form 10D
 */
export const ASSET_3_EPF: SampleAsset = {
  id: 'asset_3_epf',
  assetType: 'epf',
  institutionType: 'epfo',
  institutionName: 'Employees\' Provident Fund Organisation (EPFO)',
  valueInr: 450000,
  nomineeStatus: 'none',
  description: 'EPF balance with no nominee',
  expectedRoute: 'EPFO_LEGAL_HEIR_CLAIM',
};

/**
 * ASSET 4: Demat Account (Shares)
 * INR 600,000, no nominee
 * Expected route: SUCCESSION_CERTIFICATE, ~2.5% court fee, 180–540 days
 */
export const ASSET_4_DEMAT_SHARES: SampleAsset = {
  id: 'asset_4_demat_shares',
  assetType: 'demat_shares',
  institutionType: 'depository',
  institutionName: 'NSDL Demat Account',
  valueInr: 600000,
  nomineeStatus: 'none',
  description: 'Demat account with shares, no nominee',
  expectedRoute: 'SUCCESSION_CERTIFICATE',
};

/**
 * SCENARIO 5: Delay Compensation Demo
 * Same SBI claim submitted 40 days ago with complete documents.
 * Bank Rate assumed 6.0%, delay = 40 - 15 = 25 days.
 * Compensation = (6.0 + 4) × 240,000 × (25 / 365) ≈ INR 6,575.
 */
export const DELAY_COMPENSATION_DEMO = {
  id: 'delay_compensation_demo',
  assetId: 'asset_1_sbi_savings',
  claimAmountInr: 240000,
  daysSinceCompleteDocumentsSubmitted: 40,
  isLockerClaim: false,
  currentBankRatePercent: 6.0,
  expectedIsBreached: true,
  expectedDaysOverdue: 25,
  expectedCompensationOwedInr: 6575, // approximate
  description: 'SBI claim submitted 40 days ago; bank breached 15-day deadline by 25 days',
};

/**
 * RAMESH KUMAR SCENARIO
 * Coimbatore, intestate, survived by wife Lakshmi and two adult children.
 * Four assets producing four different routes.
 */
export const RAMESH_KUMAR_SCENARIO: SampleScenario = {
  id: 'ramesh_kumar_scenario',
  familyName: 'Kumar',
  deceased: 'Ramesh Kumar',
  location: 'Coimbatore',
  state: 'Tamil Nadu',
  stateCode: 'TN',
  religion: 'hindu',
  hasWill: false,
  spouse: 'Lakshmi',
  children: ['Arjun Kumar', 'Priya Kumar'],
  assets: [ASSET_1_SBI_SAVINGS, ASSET_2_LIC_POLICY, ASSET_3_EPF, ASSET_4_DEMAT_SHARES],
  description:
    'Ramesh Kumar, Coimbatore, died intestate, survived by wife Lakshmi and two adult children. Four assets chosen to produce four different routes.',
};

/**
 * Helper: Get all sample scenarios.
 */
export function getAllSampleScenarios(): SampleScenario[] {
  return [RAMESH_KUMAR_SCENARIO];
}

/**
 * Helper: Get scenario by ID.
 */
export function getSampleScenarioById(id: string): SampleScenario | null {
  return getAllSampleScenarios().find((s) => s.id === id) || null;
}
