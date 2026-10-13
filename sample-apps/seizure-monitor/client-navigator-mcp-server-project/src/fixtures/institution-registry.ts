/**
 * INSTITUTION REGISTRY FIXTURE
 * 
 * Nine silos of institutions where Indians hold assets after death.
 * Each entry carries: name, regulator, what it holds, claim portal, nominee process,
 * non-nominee process, typical duration, statutory deadline if any, source, asOfDate, confidence.
 */

export interface InstitutionEntry {
  id: string;
  name: string;
  regulator: string;
  whatItHolds: string;
  claimPortal: string | null;
  nomineeProcess: string;
  nonNomineeProcess: string;
  typicalDurationDays: { min: number; max: number };
  statutoryDeadlineDays: number | null;
  source: string;
  asOfDate: string; // ISO date
  confidence: 'regulatory' | 'institution_policy' | 'estimate';
}

/**
 * SILO 1: Scheduled Banks (RBI-regulated)
 */
export const SCHEDULED_BANKS: InstitutionEntry = {
  id: 'scheduled_banks',
  name: 'Scheduled Banks (SBI, HDFC, ICICI, Axis, etc.)',
  regulator: 'Reserve Bank of India (RBI)',
  whatItHolds: 'Savings accounts, fixed deposits, recurring deposits, safe deposit lockers',
  claimPortal: null,
  nomineeProcess:
    'Claim form + death certificate + ID proof. Settlement within 15 calendar days per RBI Directions 2025.',
  nonNomineeProcess:
    'Below INR 1.5 crore: simplified procedure (claim form, death certificate, ID proof, indemnity bond, legal heir certificate or affidavit, no-objection letter from other heirs). Above INR 1.5 crore: succession certificate or probate.',
  typicalDurationDays: { min: 15, max: 45 },
  statutoryDeadlineDays: 15,
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * SILO 2: Co-operative Banks (RBI-regulated, lower threshold)
 */
export const COOPERATIVE_BANKS: InstitutionEntry = {
  id: 'cooperative_banks',
  name: 'Co-operative Banks',
  regulator: 'Reserve Bank of India (RBI)',
  whatItHolds: 'Savings accounts, fixed deposits, recurring deposits',
  claimPortal: null,
  nomineeProcess:
    'Claim form + death certificate + ID proof. Settlement within 15 calendar days per RBI Directions 2025.',
  nonNomineeProcess:
    'Below INR 50 lakh: simplified procedure. Above INR 50 lakh: succession certificate or probate.',
  typicalDurationDays: { min: 15, max: 45 },
  statutoryDeadlineDays: 15,
  source: 'RBI (Settlement of Claims in respect of Deceased Customers of Banks) Directions, 2025',
  asOfDate: '2025-01-01',
  confidence: 'regulatory',
};

/**
 * SILO 3: Life Insurance (LIC and private insurers, IRDAI-regulated)
 */
export const LIFE_INSURANCE: InstitutionEntry = {
  id: 'life_insurance',
  name: 'Life Insurance (LIC, HDFC Life, ICICI Prudential, SBI Life, etc.)',
  regulator: 'Insurance Regulatory and Development Authority of India (IRDAI)',
  whatItHolds: 'Life insurance policies, endowment policies, term policies',
  claimPortal: 'Varies by insurer; typically online claim portal',
  nomineeProcess:
    'Claim form + death certificate + policy document + ID proof. Nominee receives as custodian per Sarbati Devi (1984) 1 SCC 424.',
  nonNomineeProcess:
    'Legal heir certificate or succession certificate + claim form + death certificate. Insurer may require indemnity bond.',
  typicalDurationDays: { min: 30, max: 60 },
  statutoryDeadlineDays: null,
  source: 'IRDAI regulations and institution policy',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 4: EPFO (Employees' Provident Fund, Ministry of Labour-regulated)
 */
export const EPFO: InstitutionEntry = {
  id: 'epfo',
  name: 'Employees\' Provident Fund Organisation (EPFO)',
  regulator: 'Ministry of Labour and Employment',
  whatItHolds: 'Provident fund balance, pension (if applicable)',
  claimPortal: 'EPFO portal (https://www.epfindia.gov.in)',
  nomineeProcess:
    'Form 20 (nomination form) + Form 10D (claim form) + death certificate + ID proof. Employer attestation required.',
  nonNomineeProcess:
    'Form 10D + legal heir certificate or succession certificate + death certificate. Employer attestation required.',
  typicalDurationDays: { min: 30, max: 90 },
  statutoryDeadlineDays: null,
  source: 'EPFO regulations',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 5: Depositories (CDSL and NSDL, SEBI-regulated)
 */
export const DEPOSITORIES: InstitutionEntry = {
  id: 'depositories',
  name: 'Depositories (CDSL, NSDL) — Demat Shares and Securities',
  regulator: 'Securities and Exchange Board of India (SEBI)',
  whatItHolds: 'Demat shares, mutual funds held in demat form, bonds, government securities',
  claimPortal: 'Depository participant (DP) portal; varies by DP',
  nomineeProcess:
    'Claim form + death certificate + ID proof + demat account statement. Nominee receives as custodian per Shakti Yezdani (2023 INSC 1076).',
  nonNomineeProcess:
    'Legal heir certificate or succession certificate + claim form + death certificate + demat account statement.',
  typicalDurationDays: { min: 30, max: 90 },
  statutoryDeadlineDays: null,
  source: 'SEBI regulations and depository rules',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 6: Mutual Fund RTAs (Registrar and Transfer Agents, AMFI-regulated)
 */
export const MUTUAL_FUND_RTAS: InstitutionEntry = {
  id: 'mutual_fund_rtas',
  name: 'Mutual Fund RTAs (Registrar and Transfer Agents)',
  regulator: 'Association of Mutual Funds in India (AMFI) / SEBI',
  whatItHolds: 'Mutual fund units held in physical or electronic form',
  claimPortal: 'RTA portal; varies by RTA (e.g. CAMS, Karvy, Equifax)',
  nomineeProcess:
    'Claim form + death certificate + ID proof + folio statement. Nominee receives as custodian.',
  nonNomineeProcess:
    'Legal heir certificate or succession certificate + claim form + death certificate + folio statement.',
  typicalDurationDays: { min: 30, max: 60 },
  statutoryDeadlineDays: null,
  source: 'AMFI guidelines and RTA procedures',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 7: IEPF (Investor Education and Protection Fund, MCA-regulated)
 */
export const IEPF: InstitutionEntry = {
  id: 'iepf',
  name: 'IEPF (Investor Education and Protection Fund)',
  regulator: 'Ministry of Corporate Affairs (MCA)',
  whatItHolds: 'Unclaimed dividends, unclaimed shares, unclaimed debentures (transferred after 7 years of inactivity)',
  claimPortal: 'IEPF portal (https://www.iepf.gov.in)',
  nomineeProcess:
    'Claim form + death certificate + ID proof + proof of relationship. Nominee receives as custodian.',
  nonNomineeProcess:
    'Legal heir certificate or succession certificate + claim form + death certificate + proof of relationship.',
  typicalDurationDays: { min: 60, max: 180 },
  statutoryDeadlineDays: null,
  source: 'Companies Act 2013 and IEPF rules',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 8: Post Office Savings (Department of Posts, Ministry of Communications-regulated)
 */
export const POST_OFFICE_SAVINGS: InstitutionEntry = {
  id: 'post_office_savings',
  name: 'Post Office Savings (Savings Account, RD, FD, NSC, KVP)',
  regulator: 'Department of Posts, Ministry of Communications',
  whatItHolds: 'Post office savings accounts, recurring deposits, fixed deposits, national savings certificates, kisan vikas patra',
  claimPortal: null,
  nomineeProcess:
    'Claim form + death certificate + ID proof + passbook. Nominee receives as custodian.',
  nonNomineeProcess:
    'Legal heir certificate or succession certificate + claim form + death certificate + passbook.',
  typicalDurationDays: { min: 30, max: 90 },
  statutoryDeadlineDays: null,
  source: 'Post Office regulations',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 9: NPS (National Pension System, PFRDA-regulated)
 */
export const NPS: InstitutionEntry = {
  id: 'nps',
  name: 'NPS (National Pension System)',
  regulator: 'Pension Fund Regulatory and Development Authority (PFRDA)',
  whatItHolds: 'NPS account balance, accumulated pension corpus',
  claimPortal: 'NPS portal (https://www.npscra.nsdl.co.in)',
  nomineeProcess:
    'Claim form + death certificate + ID proof + NPS account statement. Nominee receives as custodian.',
  nonNomineeProcess:
    'Legal heir certificate or succession certificate + claim form + death certificate + NPS account statement.',
  typicalDurationDays: { min: 30, max: 90 },
  statutoryDeadlineDays: null,
  source: 'PFRDA regulations',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * SILO 10: Land Records (State Revenue Departments)
 */
export const LAND_RECORDS: InstitutionEntry = {
  id: 'land_records',
  name: 'Land Records (State Revenue Departments)',
  regulator: 'State Revenue Departments',
  whatItHolds: 'Immovable property (land, buildings), registered under state land records',
  claimPortal: null,
  nomineeProcess:
    'Nomination not typically applicable. Succession certificate or probate + death certificate + ID proof + property documents.',
  nonNomineeProcess:
    'Succession certificate or probate + death certificate + ID proof + property documents + mutation application to revenue office.',
  typicalDurationDays: { min: 180, max: 540 },
  statutoryDeadlineDays: null,
  source: 'State land records acts and revenue department procedures',
  asOfDate: '2025-01-01',
  confidence: 'institution_policy',
};

/**
 * All institutions in order.
 */
export const ALL_INSTITUTIONS: InstitutionEntry[] = [
  SCHEDULED_BANKS,
  COOPERATIVE_BANKS,
  LIFE_INSURANCE,
  EPFO,
  DEPOSITORIES,
  MUTUAL_FUND_RTAS,
  IEPF,
  POST_OFFICE_SAVINGS,
  NPS,
  LAND_RECORDS,
];

/**
 * Helper: Get institution by ID.
 */
export function getInstitutionById(id: string): InstitutionEntry | null {
  return ALL_INSTITUTIONS.find((inst) => inst.id === id) || null;
}

/**
 * Helper: Get institution by type string (e.g. 'bank', 'lic', 'epfo').
 */
export function getInstitutionByType(type: string): InstitutionEntry | null {
  const typeMap: Record<string, string> = {
    bank: 'scheduled_banks',
    cooperative_bank: 'cooperative_banks',
    lic: 'life_insurance',
    life_insurance: 'life_insurance',
    epfo: 'epfo',
    depository: 'depositories',
    demat: 'depositories',
    mutual_fund: 'mutual_fund_rtas',
    iepf: 'iepf',
    post_office: 'post_office_savings',
    nps: 'nps',
    land_records: 'land_records',
  };
  const id = typeMap[type.toLowerCase()];
  return id ? getInstitutionById(id) : null;
}
