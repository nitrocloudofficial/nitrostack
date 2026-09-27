import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { SUPPORTED_BANKS } from '../config/banks.js';
import {
  mockAccounts,
  mockConsents,
  mockLiabilities,
  mockCreditHealth,
  mockApplications,
  mockUsers,
} from '../data/mock.js';
import type { FiType } from '../types/index.js';
import {
  guardDataAccess,
  evaluateGateForBank,
  recordAudit,
  applicantsForApplication,
} from '../consent/consent.gate.js';

export class CustomerTools {
  /**
   * TOOL 1: link_bank_account
   * Initiates account linking via RBI Account Aggregator framework.
   * TODO: Replace with Setu/Finvu/OneMoney API call to generate real consent URL
   */
  @Tool({
    name: 'link_bank_account',
    description:
      'Link a bank account via RBI Account Aggregator. Returns consent pending status with consent URL.',
    inputSchema: z.object({
      bankId: z
        .string()
        .describe('Bank identifier (e.g., sbi, hdfc, icici, axis, kotak, pnb)'),
      userId: z.string().describe('User identifier'),
    }),
  })
  async linkBankAccount(
    input: { bankId: string; userId: string },
    ctx: ExecutionContext
  ) {
    const bank = SUPPORTED_BANKS.find((b) => b.bankId === input.bankId);
    if (!bank) {
      throw new Error(`Bank ${input.bankId} not supported`);
    }

    // TODO: Replace with real AA provider call
    // const response = await setuClient.initiateConsent({
    //   userId: input.userId,
    //   bankId: input.bankId,
    //   scope: ['ACCOUNT', 'TRANSACTION', 'PROFILE'],
    // });

    const consentId = `consent_${Date.now()}`;
    const expiresIn = 24 * 60 * 60; // 24 hours

    ctx.logger.info(
      `Consent initiated for user ${input.userId} at bank ${bank.bankName}`
    );

    return {
      consentId,
      bankId: input.bankId,
      bankName: bank.bankName,
      status: 'pending' as const,
      aaProvider: bank.aaProvider,
      consentUrl: `https://aa.${bank.aaProvider}.co/consent/${consentId}`,
      expiresIn,
    };
  }

  /**
   * TOOL 2: fetch_account_data
   * Fetch aggregated account data (balance, currency, last updated).
   * TODO: Replace with Setu/Finvu/OneMoney API call to fetch real account data
   */
  @Tool({
    name: 'fetch_account_data',
    description:
      'Fetch aggregated account data including balance and last updated timestamp.',
    inputSchema: z.object({
      accountId: z.string().describe('Account identifier'),
    }),
  })
  async fetchAccountData(input: { accountId: string }, ctx: ExecutionContext) {
    const account = mockAccounts.get(input.accountId);
    if (!account) {
      throw new Error(`Account ${input.accountId} not found`);
    }

    // CONSENT GATE. Account data is released per-FIP: an approved SBI consent
    // authorises SBI data only. No consent, no data — the refusal is returned in
    // place of the account, never alongside it.
    const blocked = guardDataAccess(
      account.userId,
      'fetch_account_data',
      ['DEPOSIT'],
      undefined,
      account.bankId
    );
    if (blocked) {
      ctx.logger.warn(
        `BLOCKED fetch_account_data ${input.accountId}: ${blocked.status}`
      );
      return { ...blocked, accountId: input.accountId, bankId: account.bankId };
    }

    // TODO: Replace with real AA provider call
    // const data = await finvuClient.fetchAccount({
    //   accountId: input.accountId,
    //   consentId: account.consentId,
    // });

    ctx.logger.info(`Fetched account data for ${input.accountId}`);

    return {
      accountId: account.accountId,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      currency: account.currency,
      lastUpdated: account.lastUpdated,
    };
  }

  /**
   * TOOL 3: list_supported_banks
   * Return list of supported banks from config.
   */
  @Tool({
    name: 'list_supported_banks',
    description: 'List all supported banks for account linking.',
    inputSchema: z.object({}),
  })
  async listSupportedBanks(_input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Listed supported banks');
    return SUPPORTED_BANKS;
  }

  /**
   * TOOL 4: check_consent_status
   * Check if all parties have consented to data sharing.
   * TODO: Replace with Aadhaar eKYC provider call
   */
  @Tool({
    name: 'check_consent_status',
    description:
      'Check the consent gate for a loan application. On a JOINT application every applicant (primary + co-applicants) must have approved consent before any account data may be fetched. Returns per-applicant consent state and a blockedReason when the gate is closed. Call this BEFORE fetch_account_data or fetch_liabilities_bureau.',
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe('Application identifier (e.g., app_001). This alone is enough.'),
      userId: z
        .string()
        .optional()
        .describe(
          'Optional. The calling user. Every applicant is resolved from the application, so omit this unless you specifically want one user highlighted.'
        ),
    }),
  })
  async checkConsentStatus(
    input: { userId?: string; applicationId: string },
    ctx: ExecutionContext
  ) {
    // TODO: Replace with real eKYC provider call
    // const eKycStatus = await aadhaarProvider.verifyConsent({
    //   userId: input.userId,
    //   applicationId: input.applicationId,
    // });

    const application = mockApplications.get(input.applicationId);

    // Build the full applicant set. On a joint application EVERY applicant must
    // consent before data can be pulled — one pending applicant blocks the whole
    // application. Falls back to the single caller if the application is unknown.
    if (!application && !input.userId) {
      throw new Error(
        `Application ${input.applicationId} not found. Provide a known applicationId (e.g., app_001) or pass a userId.`
      );
    }

    const primaryUserId = (application?.userId ?? input.userId) as string;
    const coApplicantIds = application?.coApplicantUserIds ?? [];
    const applicationType =
      application?.applicationType ??
      (coApplicantIds.length > 0 ? 'joint' : 'single');

    const applicantIds = [primaryUserId, ...coApplicantIds];

    const applicants = applicantIds.map((userId) => {
      const consents = Array.from(mockConsents.values()).filter(
        (c) => c.userId === userId
      );
      const pendingBanks = consents
        .filter((c) => c.status === 'pending')
        .map((c) => c.bankId);
      const rejectedBanks = consents
        .filter((c) => c.status === 'rejected' || c.status === 'revoked')
        .map((c) => c.bankId);

      // An applicant with zero consents has NOT consented — `every()` on an empty
      // array is vacuously true, so check for at least one approved consent.
      const approvedCount = consents.filter(
        (c) => c.status === 'approved'
      ).length;
      const consentComplete =
        approvedCount > 0 &&
        pendingBanks.length === 0 &&
        rejectedBanks.length === 0;

      return {
        userId,
        name: mockUsers.get(userId)?.name ?? 'Unknown',
        role:
          userId === primaryUserId
            ? ('primary' as const)
            : ('co-applicant' as const),
        consentComplete,
        approvedCount,
        pendingBanks,
        rejectedBanks,
        consentDetails: consents.map((c) => ({
          bankId: c.bankId,
          status: c.status,
        })),
      };
    });

    const blocking = applicants.filter((a) => !a.consentComplete);
    const allPartiesConsented = blocking.length === 0;

    const blockedReason = allPartiesConsented
      ? null
      : `Awaiting consent from ${blocking.length} of ${applicants.length} applicant(s): ${blocking
          .map((a) => `${a.name} (${a.role})`)
          .join(', ')}`;

    ctx.logger.info(
      `Consent gate for application ${input.applicationId} (${applicationType}, ${applicants.length} applicant(s)): ${
        allPartiesConsented ? 'CLEARED' : 'BLOCKED'
      }`
    );

    return {
      applicationId: input.applicationId,
      applicationType,
      allPartiesConsented,
      applicants,
      pendingApplicants: blocking.map((a) => a.userId),
      blockedReason,
      // Flattened view of the caller's own consents (backwards compatible).
      consentDetails:
        applicants.find((a) => a.userId === input.userId)?.consentDetails ?? [],
    };
  }

  /**
   * TOOL 5: fetch_liabilities_bureau
   * Fetch liabilities and credit score from bureau.
   * TODO: Replace with CIBIL/Experian/CRIF API call
   */
  @Tool({
    name: 'fetch_liabilities_bureau',
    description:
      'Fetch liabilities and credit score from credit bureau (CIBIL/Experian/CRIF).',
    inputSchema: z.object({
      userId: z.string().describe('User identifier'),
      bureau: z
        .enum(['cibil', 'experian', 'crif'])
        .optional()
        .describe('Credit bureau (defaults to CIBIL)'),
    }),
  })
  async fetchLiabilitiesBureau(
    input: { userId: string; bureau?: 'cibil' | 'experian' | 'crif' },
    ctx: ExecutionContext
  ) {
    // CONSENT GATE. Liability data requires LOAN scope — a DEPOSIT-only consent
    // does not authorise it, which surfaces as SCOPE_VIOLATION rather than a
    // generic denial.
    const blocked = guardDataAccess(input.userId, 'fetch_liabilities_bureau', [
      'LOAN',
    ]);
    if (blocked) {
      ctx.logger.warn(
        `BLOCKED fetch_liabilities_bureau ${input.userId}: ${blocked.status}`
      );
      return blocked;
    }

    const liabilities = Array.from(mockLiabilities.values()).filter(
      (l) => l.userId === input.userId
    );
    const creditHealth = mockCreditHealth.get(input.userId);

    // TODO: Replace with real bureau API call
    // const bureauData = await cibilClient.fetchReport({
    //   userId: input.userId,
    //   bureau: input.bureau || 'cibil',
    // });

    const totalOutstanding = liabilities.reduce(
      (sum, l) => sum + l.outstandingAmount,
      0
    );

    ctx.logger.info(
      `Fetched liabilities for user ${input.userId} from ${input.bureau || 'cibil'}`
    );

    return {
      userId: input.userId,
      creditScore: creditHealth?.creditScore || 650,
      liabilities: liabilities.map((l) => ({
        lenderName: l.lenderName,
        loanAmount: l.loanAmount,
        outstandingAmount: l.outstandingAmount,
        emi: l.emi,
        type: l.type,
      })),
      totalOutstanding,
    };
  }

  /**
   * TOOL 6: run_serviceability_calc
   * Compute loan eligibility based on income, expenses, and liabilities.
   */
  @Tool({
    name: 'run_serviceability_calc',
    description:
      'Calculate loan serviceability: effective expense, disposable income, eligible loan amount, and qualification status.',
    inputSchema: z.object({
      userId: z.string().describe('User identifier'),
      monthlyIncome: z.number().describe('Monthly income in INR'),
      declaredMonthlyExpense: z
        .number()
        .describe('Declared monthly expense in INR'),
      requestedLoanAmount: z.number().describe('Requested loan amount in INR'),
    }),
  })
  async runServiceabilityCalc(
    input: {
      userId: string;
      monthlyIncome: number;
      declaredMonthlyExpense: number;
      requestedLoanAmount: number;
    },
    ctx: ExecutionContext
  ) {
    // Effective expense = max(declared, 40% of income)
    const effectiveExpense = Math.max(
      input.declaredMonthlyExpense,
      input.monthlyIncome * 0.4
    );

    // Disposable income = income - effective expense
    const disposableIncome = input.monthlyIncome - effectiveExpense;

    // Eligible loan amount = disposable income * 60 (12 months * 5 years)
    const eligibleLoanAmount = disposableIncome * 60;

    // Qualifies if requested <= eligible
    const qualifies = input.requestedLoanAmount <= eligibleLoanAmount;

    ctx.logger.info(
      `Serviceability calc for user ${input.userId}: eligible=${eligibleLoanAmount}, qualifies=${qualifies}`
    );

    return {
      userId: input.userId,
      monthlyIncome: input.monthlyIncome,
      declaredMonthlyExpense: input.declaredMonthlyExpense,
      effectiveExpense,
      disposableIncome,
      requestedLoanAmount: input.requestedLoanAmount,
      eligibleLoanAmount,
      qualifies,
      computedAt: new Date().toISOString(),
    };
  }

  /**
   * TOOL 7: detect_variance
   * Detect variance between declared and verified values.
   */
  @Tool({
    name: 'detect_variance',
    description:
      'Detect variance between declared and verified values. Flags if variance > 10%.',
    inputSchema: z.object({
      fieldName: z.string().describe('Field name (e.g., monthlyIncome)'),
      declaredValue: z
        .union([z.string(), z.number()])
        .describe('Declared value'),
      verifiedValue: z
        .union([z.string(), z.number()])
        .describe('Verified value'),
    }),
  })
  async detectVariance(
    input: {
      fieldName: string;
      declaredValue: string | number;
      verifiedValue: string | number;
    },
    ctx: ExecutionContext
  ) {
    const declared =
      typeof input.declaredValue === 'number'
        ? input.declaredValue
        : parseFloat(input.declaredValue as string);
    const verified =
      typeof input.verifiedValue === 'number'
        ? input.verifiedValue
        : parseFloat(input.verifiedValue as string);

    const variancePercent =
      declared !== 0
        ? Math.abs((verified - declared) / declared) * 100
        : Math.abs(verified) * 100;

    const flagged = variancePercent > 10;

    ctx.logger.info(
      `Variance detected for ${input.fieldName}: ${variancePercent.toFixed(2)}% (flagged: ${flagged})`
    );

    return {
      fieldName: input.fieldName,
      declaredValue: input.declaredValue,
      verifiedValue: input.verifiedValue,
      variancePercent: Math.round(variancePercent * 100) / 100,
      flagged,
    };
  }

  /**
   * TOOL 8: get_credit_health_score
   * Get composite credit health score and label.
   */
  @Tool({
    name: 'get_credit_health_score',
    description:
      'Get composite credit health score and label (Excellent/Good/Fair/Poor).',
    inputSchema: z.object({
      userId: z.string().describe('User identifier'),
    }),
  })
  async getCreditHealthScore(
    input: { userId: string },
    ctx: ExecutionContext
  ) {
    const health = mockCreditHealth.get(input.userId);
    if (!health) {
      throw new Error(`Credit health data not found for user ${input.userId}`);
    }

    ctx.logger.info(
      `Retrieved credit health for user ${input.userId}: score=${health.creditScore}, label=${health.healthLabel}`
    );

    return health;
  }

  /**
   * TOOL 9: get_customer_dashboard
   * Aggregates a customer's linked accounts + credit health for the dashboard widget.
   */
  @Tool({
    name: 'get_customer_dashboard',
    description:
      "Get a customer's full dashboard: all linked accounts and credit health summary.",
    inputSchema: z.object({
      userId: z.string().describe('User identifier (e.g., user_001)'),
    }),
  })
  @Widget('customer-dashboard')
  async getCustomerDashboard(input: { userId: string }, ctx: ExecutionContext) {
    const allAccounts = Array.from(mockAccounts.values()).filter(
      (a) => a.userId === input.userId
    );

    // CONSENT GATE, applied per institution. Rather than all-or-nothing, we
    // release exactly the accounts the customer consented to and report the rest
    // as withheld — mirroring how AA consent is granted FIP by FIP.
    const released: typeof allAccounts = [];
    const withheld: {
      bankName: string;
      bankId: string;
      status: string;
      reason: string;
    }[] = [];

    for (const a of allAccounts) {
      const gate = evaluateGateForBank(input.userId, a.bankId, ['DEPOSIT']);
      if (gate.allowed) {
        released.push(a);
      } else {
        withheld.push({
          bankName: a.bankName,
          bankId: a.bankId,
          status: gate.status,
          reason: gate.reason,
        });
      }
    }

    recordAudit({
      event: released.length > 0 ? 'DATA_ACCESS_GRANTED' : 'DATA_ACCESS_BLOCKED',
      userId: input.userId,
      actor: 'get_customer_dashboard',
      fiTypes: ['DEPOSIT'],
      outcome: released.length > 0 ? 'ALLOWED' : 'BLOCKED',
      reason: `Released ${released.length} of ${allAccounts.length} account(s); ${withheld.length} withheld for want of consent.`,
    });

    // Credit health is derived from bureau/liability data, so it needs LOAN scope.
    const creditGate = guardDataAccess(
      input.userId,
      'get_customer_dashboard:creditHealth',
      ['LOAN']
    );

    ctx.logger.info(
      `Dashboard for ${input.userId}: ${released.length} released, ${withheld.length} withheld`
    );

    return {
      accounts: released.map((a) => ({
        accountId: a.accountId,
        bankName: a.bankName,
        accountNumber: a.accountNumber,
        accountType: a.accountType,
        balance: a.balance,
        currency: a.currency,
        lastUpdated: a.lastUpdated,
      })),
      creditHealth: creditGate ? undefined : mockCreditHealth.get(input.userId),
      consent: {
        accountsReleased: released.length,
        accountsWithheld: withheld.length,
        withheld,
        creditHealthBlocked: creditGate ? creditGate.status : null,
      },
    };
  }

  /**
   * TOOL 10: request_customer_consent
   * FIU-side: the lending bank raises an AA consent request against every
   * applicant on the application. Nothing is readable until each one approves.
   */
  @Tool({
    name: 'request_customer_consent',
    description:
      "Raise an RBI Account Aggregator consent request against every applicant on a loan application. This is the bank/FIU-side trigger: it specifies the FI type scope, purpose and duration, and puts each applicant's consent into PENDING until they approve in their AA app. Data tools stay blocked until then.",
    inputSchema: z.object({
      applicationId: z
        .string()
        .describe('Loan application the consent is being raised for (e.g., app_001)'),
      bankId: z
        .string()
        .describe('The FIP to request data from (e.g., sbi, hdfc, icici)'),
      fiTypes: z
        .array(
          z.enum([
            'DEPOSIT',
            'TERM_DEPOSIT',
            'RECURRING_DEPOSIT',
            'LOAN',
            'CREDIT_CARD',
          ])
        )
        .optional()
        .describe('FI types to request. Defaults to DEPOSIT + LOAN for underwriting.'),
      purpose: z
        .string()
        .optional()
        .describe('Purpose shown to the customer. Defaults to loan eligibility assessment.'),
      durationDays: z
        .number()
        .optional()
        .describe('How long the consent stays valid. Defaults to 90 days.'),
    }),
  })
  async requestCustomerConsent(
    input: {
      applicationId: string;
      bankId: string;
      fiTypes?: FiType[];
      purpose?: string;
      durationDays?: number;
    },
    ctx: ExecutionContext
  ) {
    const application = mockApplications.get(input.applicationId);
    if (!application) {
      throw new Error(`Application ${input.applicationId} not found`);
    }

    const bank = SUPPORTED_BANKS.find((b) => b.bankId === input.bankId);
    if (!bank) {
      throw new Error(`Bank ${input.bankId} not supported`);
    }

    const fiTypes: FiType[] = input.fiTypes ?? ['DEPOSIT', 'LOAN'];
    const purpose = input.purpose ?? 'Loan eligibility assessment';
    const durationDays = input.durationDays ?? 90;
    const applicantIds = applicantsForApplication(input.applicationId);

    // TODO: Replace with real AA consent request
    // await setuClient.createConsent({ fiTypes, purpose, dataLife: durationDays })

    const raised = applicantIds.map((userId) => {
      const consentId = `consent_${Date.now()}_${userId}`;
      const now = new Date();
      mockConsents.set(consentId, {
        consentId,
        userId,
        bankId: input.bankId,
        status: 'pending',
        consentUrl: `https://aa.${bank.aaProvider}.co/consent/${consentId}`,
        aaProvider: bank.aaProvider,
        createdAt: now.toISOString(),
        expiresAt: new Date(
          now.getTime() + durationDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        fiTypes,
        purpose,
        purposeCode: '102',
        applicationId: input.applicationId,
        requestedBy: application.bankId,
        requestedAt: now.toISOString(),
      });

      recordAudit({
        event: 'CONSENT_REQUESTED',
        userId,
        applicationId: input.applicationId,
        consentId,
        actor: 'request_customer_consent',
        fiTypes,
        outcome: 'BLOCKED',
        reason: `Consent requested from ${mockUsers.get(userId)?.name ?? userId} for ${bank.bankName} covering ${fiTypes.join(', ')}. Awaiting approval.`,
      });

      return {
        consentId,
        userId,
        applicantName: mockUsers.get(userId)?.name ?? userId,
        status: 'pending' as const,
        consentUrl: `https://aa.${bank.aaProvider}.co/consent/${consentId}`,
      };
    });

    ctx.logger.info(
      `Consent requested for ${input.applicationId} at ${bank.bankName}: ${raised.length} applicant(s)`
    );

    return {
      applicationId: input.applicationId,
      bankId: input.bankId,
      bankName: bank.bankName,
      aaProvider: bank.aaProvider,
      fiTypes,
      purpose,
      purposeCode: '102',
      durationDays,
      requestedFrom: raised,
      allPartiesConsented: false,
      dataAccessible: false,
      nextAction:
        'Each applicant must approve in their AA app. Until then every data tool returns CONSENT_PENDING.',
    };
  }

  /**
   * TOOL 11: approve_consent
   * Customer-side: simulates the applicant approving the request inside their
   * AA app. This is the only thing that opens the gate.
   */
  @Tool({
    name: 'approve_consent',
    description:
      "Simulate a customer approving (or rejecting) a pending AA consent in their Account Aggregator app. This is the customer-side action that opens the data gate. Use decision='rejected' to demonstrate a refusal.",
    inputSchema: z.object({
      userId: z.string().describe('The applicant approving (e.g., user_001)'),
      bankId: z
        .string()
        .optional()
        .describe('Approve only this FIP. Omit to approve all of this user\'s pending consents.'),
      decision: z
        .enum(['approved', 'rejected'])
        .optional()
        .describe('Defaults to approved.'),
    }),
  })
  async approveConsent(
    input: { userId: string; bankId?: string; decision?: 'approved' | 'rejected' },
    ctx: ExecutionContext
  ) {
    const decision = input.decision ?? 'approved';
    const pending = Array.from(mockConsents.values()).filter(
      (c) =>
        c.userId === input.userId &&
        c.status === 'pending' &&
        (!input.bankId || c.bankId === input.bankId)
    );

    if (pending.length === 0) {
      return {
        userId: input.userId,
        updated: 0,
        message: `No pending consent found for ${mockUsers.get(input.userId)?.name ?? input.userId}${input.bankId ? ` at ${input.bankId.toUpperCase()}` : ''}.`,
      };
    }

    for (const c of pending) {
      c.status = decision;
      recordAudit({
        event: decision === 'approved' ? 'CONSENT_APPROVED' : 'CONSENT_REJECTED',
        userId: input.userId,
        applicationId: c.applicationId,
        consentId: c.consentId,
        actor: 'approve_consent',
        fiTypes: c.fiTypes,
        outcome: decision === 'approved' ? 'ALLOWED' : 'BLOCKED',
        reason: `${mockUsers.get(input.userId)?.name ?? input.userId} ${decision} the ${c.bankId.toUpperCase()} consent in their AA app.`,
      });
    }

    ctx.logger.info(
      `${input.userId} ${decision} ${pending.length} consent(s)`
    );

    return {
      userId: input.userId,
      applicantName: mockUsers.get(input.userId)?.name ?? input.userId,
      decision,
      updated: pending.length,
      consents: pending.map((c) => ({
        consentId: c.consentId,
        bankId: c.bankId,
        status: c.status,
        fiTypes: c.fiTypes,
      })),
      message:
        decision === 'approved'
          ? `Consent granted. Data tools for ${pending.map((c) => c.bankId.toUpperCase()).join(', ')} are now unblocked.`
          : 'Consent refused. Data remains blocked.',
    };
  }
}
