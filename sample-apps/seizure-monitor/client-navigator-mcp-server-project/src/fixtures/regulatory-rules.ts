/**
 * REGULATORY RULES FIXTURE
 * 
 * Hardcoded regulatory basis for Claim Navigator.
 * All rules carry source, asOfDate, and confidence level.
 * 
 * PRIMARY SOURCES:
 * - RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025
 *   Compliance date: 31 March 2026
 * - Banking Laws (Amendment) Act, 2025
 * - Shakti Yezdani v Jayanand Jayant Salgaonkar, Supreme Court, 14 December 2023 (2023 INSC 1076)
 * - Sarbati Devi v Usha Devi (1984) 1 SCC 424
 * - Court Fees Act 1870 and state Acts
 */

export interface RegulatoryRule {
  id: string;
  title: string;
  description: string;
  source: string;
  asOfDate: string; // ISO date
  confidence: 'regulatory' | 'institution_policy' | 'estimate';
}

export interface CourtFeeRow {
  stateCode: string;
  stateName: string;
  ratePercent: number;
  capInr: number;
  source: string;
  asOfDate: string;
  confidence: 'estimate';
}

export interface ThresholdRow {
  assetType: string;
  institutionType: string;
  thresholdInr: number;
  source: string;
  asOfDate: string;
  confidence: 'regulatory' | 'institution_policy';
}

/**
 * R1: Nominee claim — banks settle on claim form + death certificate + ID proof alone.
 * No succession certificate, no probate, no indemnity bond, REGARDLESS OF AMOUNT.
 */
export const R1_NOMINEE_CLAIM: RegulatoryRule = {
  id: 'R1',
  title: 'Nominee Claim Settlement',
  description:
    'Where a valid nominee or survivorship clause exists, banks settle on claim form + death certificate + ID proof ALONE. No succession certificate, no probate, no indemnity bond, REGARDLESS OF AMOUNT.',
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * R2: Simplified procedure below threshold.
 * Threshold = INR 1,500,000 for banks other than co-operative banks, INR 500,000 for co-operative banks.
 * Below-threshold documents: claim form, death certificate, ID proof, indemnity bond, legal heir certificate or affidavit, no-objection/disclaimer letter from other heirs where applicable.
 */
export const R2_SIMPLIFIED_PROCEDURE: RegulatoryRule = {
  id: 'R2',
  title: 'Simplified Procedure Below Threshold',
  description:
    'Where there is no nominee, a simplified procedure applies below the threshold. Threshold = INR 1,500,000 for banks other than co-operative banks, INR 500,000 for co-operative banks. Banks may set higher limits. Below-threshold documents: claim form, death certificate, ID proof, indemnity bond, legal heir certificate or affidavit, and a no-objection/disclaimer letter from other heirs where applicable.',
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * R3: Above threshold, will exists, or claim disputed.
 * Succession certificate, probate, letter of administration or court order.
 */
export const R3_ABOVE_THRESHOLD: RegulatoryRule = {
  id: 'R3',
  title: 'Above Threshold or Disputed Claim',
  description:
    'Above threshold, or where a will exists, or where the claim is disputed: succession certificate, probate, letter of administration or court order.',
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * R4: Settlement timeline and delay compensation.
 * Banks must settle deposit claims within 15 calendar days of receiving complete documents.
 * Delay attributable to the bank attracts interest at Bank Rate + 4% per annum on the settlement amount for the delay period.
 * Locker/safe custody delays attract INR 5,000 per day.
 */
export const R4_SETTLEMENT_TIMELINE: RegulatoryRule = {
  id: 'R4',
  title: 'Settlement Timeline and Delay Compensation',
  description:
    'Banks must settle deposit claims within 15 calendar days of receiving complete documents. Delay attributable to the bank attracts interest at Bank Rate + 4% per annum on the settlement amount for the delay period. Locker/safe custody delays attract INR 5,000 per day.',
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * R5: Excluded from RBI Directions.
 * SCSS and PPF follow their own scheme rules.
 */
export const R5_EXCLUDED_SCHEMES: RegulatoryRule = {
  id: 'R5',
  title: 'Excluded Schemes',
  description:
    'Excluded from these Directions: SCSS and PPF, which follow their own scheme rules.',
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * Nominee is a custodian, not an owner.
 * Nomination is not a third mode of succession.
 */
export const NOMINEE_CUSTODIAN_RULE: RegulatoryRule = {
  id: 'NOMINEE_CUSTODIAN',
  title: 'Nominee as Custodian',
  description:
    'A nominee under the Companies Act 1956/2013 and the Depositories Act 1996 is a trustee/custodian, NOT the absolute owner. Nomination is not a third mode of succession. Follows Sarbati Devi v Usha Devi (1984) 1 SCC 424 for LIC policies.',
  source: 'Shakti Yezdani v Jayanand Jayant Salgaonkar, Supreme Court, 14 December 2023 (2023 INSC 1076); Sarbati Devi v Usha Devi (1984) 1 SCC 424',
  asOfDate: '2023-12-14',
  confidence: 'regulatory',
};

/**
 * Multiple nominations permitted.
 * Banking Laws (Amendment) Act, 2025 permits up to four nominations per bank customer, successive or simultaneous.
 */
export const MULTIPLE_NOMINATIONS_RULE: RegulatoryRule = {
  id: 'MULTIPLE_NOMINATIONS',
  title: 'Multiple Nominations Permitted',
  description:
    'Banking Laws (Amendment) Act, 2025 permits up to four nominations per bank customer, successive or simultaneous.',
  source: 'Banking Laws (Amendment) Act, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * Court fee for succession certificate.
 * Generally 2–3% of the value of movable assets, paid in judicial stamps at filing.
 * Several states apply a cap near INR 75,000.
 * This is an ESTIMATE, not law.
 */
export const COURT_FEE_TABLE: CourtFeeRow[] = [
  {
    stateCode: 'TN',
    stateName: 'Tamil Nadu',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Tamil Nadu Court Fees and Suits Valuation Act 1955 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'KA',
    stateName: 'Karnataka',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'MH',
    stateName: 'Maharashtra',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'DL',
    stateName: 'Delhi',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'GJ',
    stateName: 'Gujarat',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'UP',
    stateName: 'Uttar Pradesh',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'WB',
    stateName: 'West Bengal',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'AP',
    stateName: 'Andhra Pradesh',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'TS',
    stateName: 'Telangana',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'KL',
    stateName: 'Kerala',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'RJ',
    stateName: 'Rajasthan',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
  {
    stateCode: 'PB',
    stateName: 'Punjab',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  },
];

/**
 * Bank settlement thresholds.
 * R2 applies below these thresholds.
 */
export const BANK_THRESHOLDS: ThresholdRow[] = [
  {
    assetType: 'bank_savings',
    institutionType: 'bank',
    thresholdInr: 1500000,
    source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
    asOfDate: '2025-01-01',
    confidence: 'regulatory',
  },
  {
    assetType: 'bank_fd',
    institutionType: 'bank',
    thresholdInr: 1500000,
    source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
    asOfDate: '2025-01-01',
    confidence: 'regulatory',
  },
  {
    assetType: 'bank_savings',
    institutionType: 'cooperative_bank',
    thresholdInr: 500000,
    source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
    asOfDate: '2025-01-01',
    confidence: 'regulatory',
  },
  {
    assetType: 'bank_fd',
    institutionType: 'cooperative_bank',
    thresholdInr: 500000,
    source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
    asOfDate: '2025-01-01',
    confidence: 'regulatory',
  },
];

/**
 * Institution-policy thresholds for non-bank assets.
 * THESE ARE PLACEHOLDERS, NOT LAW.
 * Every row carries source "institution policy — placeholder, verify with provider" and confidence "institution_policy".
 */
export const INSTITUTION_POLICY_THRESHOLDS: ThresholdRow[] = [
  {
    assetType: 'life_insurance',
    institutionType: 'lic',
    thresholdInr: 500000,
    source: 'Institution policy — placeholder, verify with provider',
    asOfDate: '2025-01-01',
    confidence: 'institution_policy',
  },
  {
    assetType: 'demat_shares',
    institutionType: 'depository',
    thresholdInr: 500000,
    source: 'Institution policy — placeholder, verify with provider',
    asOfDate: '2025-01-01',
    confidence: 'institution_policy',
  },
  {
    assetType: 'mutual_fund',
    institutionType: 'mutual_fund',
    thresholdInr: 500000,
    source: 'Institution policy — placeholder, verify with provider',
    asOfDate: '2025-01-01',
    confidence: 'institution_policy',
  },
  {
    assetType: 'post_office',
    institutionType: 'post_office',
    thresholdInr: 100000,
    source: 'Institution policy — placeholder, verify with provider',
    asOfDate: '2025-01-01',
    confidence: 'institution_policy',
  },
  {
    assetType: 'nps',
    institutionType: 'nps',
    thresholdInr: 100000,
    source: 'Institution policy — placeholder, verify with provider',
    asOfDate: '2025-01-01',
    confidence: 'institution_policy',
  },
];

/**
 * Helper: Get court fee for a state.
 * Returns rate (percent) and cap (INR).
 * Default to 2.5% capped at 75,000 for unlisted states.
 */
export function getCourtFeeForState(stateCode: string): CourtFeeRow {
  const row = COURT_FEE_TABLE.find((r) => r.stateCode === stateCode);
  if (row) return row;
  return {
    stateCode: stateCode,
    stateName: 'Unknown State',
    ratePercent: 2.5,
    capInr: 75000,
    source: 'Court Fees Act 1870 (default estimate)',
    asOfDate: '2025-01-01',
    confidence: 'estimate',
  };
}

/**
 * Helper: Get threshold for an asset type.
 * Searches BANK_THRESHOLDS first, then INSTITUTION_POLICY_THRESHOLDS.
 */
export function getThresholdForAsset(
  assetType: string,
  institutionType: string,
  isCooperativeBank?: boolean
): ThresholdRow | null {
  if (assetType === 'bank_savings' || assetType === 'bank_fd') {
    const instType = isCooperativeBank ? 'cooperative_bank' : 'bank';
    return BANK_THRESHOLDS.find((r) => r.assetType === assetType && r.institutionType === instType) || null;
  }
  return INSTITUTION_POLICY_THRESHOLDS.find((r) => r.assetType === assetType && r.institutionType === institutionType) || null;
}
