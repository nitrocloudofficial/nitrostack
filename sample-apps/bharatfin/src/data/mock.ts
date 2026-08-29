import {
  Account,
  Consent,
  Application,
  Liability,
  CreditHealth,
} from '../types/index.js';

// In-memory stores (keyed by userId/accountId/applicationId)
export const mockUsers = new Map<
  string,
  { userId: string; name: string; email: string }
>([
  [
    'user_001',
    { userId: 'user_001', name: 'Rajesh Kumar', email: 'rajesh@example.com' },
  ],
  [
    'user_002',
    { userId: 'user_002', name: 'Priya Singh', email: 'priya@example.com' },
  ],
  [
    'user_003',
    {
      userId: 'user_003',
      name: 'Amit Patel',
      email: 'amit@example.com',
    },
  ],
]);

export const mockAccounts = new Map<string, Account>([
  [
    'acc_001',
    {
      accountId: 'acc_001',
      userId: 'user_001',
      bankId: 'sbi',
      bankName: 'State Bank of India',
      accountNumber: '1234567890',
      accountType: 'savings',
      balance: 250000,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    },
  ],
  [
    'acc_002',
    {
      accountId: 'acc_002',
      userId: 'user_001',
      bankId: 'hdfc',
      bankName: 'HDFC Bank',
      accountNumber: '0987654321',
      accountType: 'current',
      balance: 500000,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    },
  ],
  [
    'acc_003',
    {
      accountId: 'acc_003',
      userId: 'user_002',
      bankId: 'icici',
      bankName: 'ICICI Bank',
      accountNumber: '1111111111',
      accountType: 'savings',
      balance: 150000,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    },
  ],
  [
    'acc_004',
    {
      accountId: 'acc_004',
      userId: 'user_003',
      bankId: 'axis',
      bankName: 'Axis Bank',
      accountNumber: '2222222222',
      accountType: 'savings',
      balance: 350000,
      currency: 'INR',
      lastUpdated: new Date().toISOString(),
    },
  ],
]);

export const mockConsents = new Map<string, Consent>([
  [
    'consent_001',
    {
      consentId: 'consent_001',
      userId: 'user_001',
      bankId: 'sbi',
      status: 'approved',
      consentUrl: 'https://aa.setu.co/consent/abc123',
      aaProvider: 'setu',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      fiTypes: ['DEPOSIT', 'TERM_DEPOSIT', 'LOAN'],
      purpose: 'Loan eligibility assessment',
      purposeCode: '102',
      applicationId: 'app_001',
      requestedBy: 'sbi',
      requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  [
    'consent_002',
    {
      consentId: 'consent_002',
      userId: 'user_001',
      bankId: 'hdfc',
      status: 'pending',
      consentUrl: 'https://aa.finvu.co/consent/def456',
      aaProvider: 'finvu',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      fiTypes: ['DEPOSIT'],
      purpose: 'Loan eligibility assessment',
      purposeCode: '102',
      applicationId: 'app_001',
      requestedBy: 'sbi',
      requestedAt: new Date().toISOString(),
    },
  ],
  [
    'consent_003',
    {
      consentId: 'consent_003',
      userId: 'user_002',
      bankId: 'icici',
      status: 'approved',
      consentUrl: 'https://aa.finvu.co/consent/ghi789',
      aaProvider: 'finvu',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 87 * 24 * 60 * 60 * 1000).toISOString(),
      fiTypes: ['DEPOSIT', 'LOAN'],
      purpose: 'Loan eligibility assessment',
      purposeCode: '102',
      applicationId: 'app_001',
      requestedBy: 'sbi',
      requestedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
]);

export const mockLiabilities = new Map<string, Liability>([
  [
    'liab_001',
    {
      liabilityId: 'liab_001',
      userId: 'user_001',
      lenderName: 'HDFC Bank',
      loanAmount: 500000,
      outstandingAmount: 350000,
      emi: 12500,
      tenure: 36,
      rateOfInterest: 8.5,
      type: 'personal',
    },
  ],
  [
    'liab_002',
    {
      liabilityId: 'liab_002',
      userId: 'user_001',
      lenderName: 'ICICI Bank',
      loanAmount: 2000000,
      outstandingAmount: 1800000,
      emi: 45000,
      tenure: 60,
      rateOfInterest: 7.2,
      type: 'home',
    },
  ],
  [
    'liab_003',
    {
      liabilityId: 'liab_003',
      userId: 'user_002',
      lenderName: 'Axis Bank',
      loanAmount: 300000,
      outstandingAmount: 250000,
      emi: 8500,
      tenure: 48,
      rateOfInterest: 9.0,
      type: 'auto',
    },
  ],
]);

export const mockCreditHealth = new Map<string, CreditHealth>([
  [
    'user_001',
    {
      userId: 'user_001',
      creditScore: 745,
      healthLabel: 'Good',
      liabilitiesCount: 2,
      totalOutstanding: 2150000,
      defaultHistory: false,
      lastUpdated: new Date().toISOString(),
    },
  ],
  [
    'user_002',
    {
      userId: 'user_002',
      creditScore: 680,
      healthLabel: 'Fair',
      liabilitiesCount: 1,
      totalOutstanding: 250000,
      defaultHistory: false,
      lastUpdated: new Date().toISOString(),
    },
  ],
  [
    'user_003',
    {
      userId: 'user_003',
      creditScore: 820,
      healthLabel: 'Excellent',
      liabilitiesCount: 0,
      totalOutstanding: 0,
      defaultHistory: false,
      lastUpdated: new Date().toISOString(),
    },
  ],
]);

export const mockApplications = new Map<string, Application>([
  [
    'app_001',
    {
      applicationId: 'app_001',
      userId: 'user_001',
      bankId: 'sbi',
      applicantName: 'Rajesh Kumar',
      applicantEmail: 'rajesh@example.com',
      loanAmount: 500000,
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      applicationType: 'joint',
      coApplicantUserIds: ['user_002'],
      serviceabilityResult: {
        userId: 'user_001',
        monthlyIncome: 100000,
        declaredMonthlyExpense: 35000,
        effectiveExpense: 40000,
        disposableIncome: 60000,
        requestedLoanAmount: 500000,
        eligibleLoanAmount: 600000,
        qualifies: true,
        computedAt: new Date().toISOString(),
      },
      variances: [
        {
          fieldName: 'monthlyIncome',
          declaredValue: 100000,
          verifiedValue: 105000,
          variancePercent: 5,
          flagged: false,
        },
      ],
    },
  ],
  [
    'app_002',
    {
      applicationId: 'app_002',
      userId: 'user_002',
      bankId: 'hdfc',
      applicantName: 'Priya Singh',
      applicantEmail: 'priya@example.com',
      loanAmount: 300000,
      status: 'exception',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      serviceabilityResult: {
        userId: 'user_002',
        monthlyIncome: 75000,
        declaredMonthlyExpense: 50000,
        effectiveExpense: 50000,
        disposableIncome: 25000,
        requestedLoanAmount: 300000,
        eligibleLoanAmount: 250000,
        qualifies: false,
        computedAt: new Date().toISOString(),
      },
      variances: [
        {
          fieldName: 'monthlyExpense',
          declaredValue: 50000,
          verifiedValue: 62000,
          variancePercent: 24,
          flagged: true,
        },
      ],
    },
  ],
  [
    'app_003',
    {
      applicationId: 'app_003',
      userId: 'user_003',
      bankId: 'icici',
      applicantName: 'Amit Patel',
      applicantEmail: 'amit@example.com',
      loanAmount: 1000000,
      status: 'approved',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      serviceabilityResult: {
        userId: 'user_003',
        monthlyIncome: 150000,
        declaredMonthlyExpense: 40000,
        effectiveExpense: 60000,
        disposableIncome: 90000,
        requestedLoanAmount: 1000000,
        eligibleLoanAmount: 1200000,
        qualifies: true,
        computedAt: new Date().toISOString(),
      },
      variances: [],
      reviewerNote: 'Excellent credit profile. Approved.',
      reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
]);
