import { Tool, Injectable, ExecutionContext } from '@nitrostack/core';
import { z } from 'zod';
import { AccountAggregatorService } from '../account-aggregator/aa.service.js';
import { UnderwritingService } from '../underwriting/underwriting.service.js';
import { FraudService } from '../fraud/fraud.service.js';
import { RepaymentService } from '../repayment/repayment.service.js';
import { SuccessionService } from '../succession/succession.service.js';

@Injectable({ deps: [AccountAggregatorService, UnderwritingService, FraudService, RepaymentService, SuccessionService] })
export class PlannerController {
  constructor(
    private readonly aaService: AccountAggregatorService,
    private readonly underwritingService: UnderwritingService,
    private readonly fraudService: FraudService,
    private readonly repaymentService: RepaymentService,
    private readonly successionService: SuccessionService
  ) {}

  @Tool({
    name: 'generate_financial_health_report',
    description: 'Orchestrates all FinVerse modules sequentially to generate a comprehensive Financial Health Report including Loan Eligibility, Fraud Alerts, Cash Flow, Repayment Status, Succession Readiness and Overall Financial Health.',
    inputSchema: z.object({
      userId: z.string().describe('User ID'),
      consentId: z.string().describe('AA Consent ID'),
      invoiceData: z.string().describe('Invoice Data as JSON string'),
      gstin: z.string().describe('GSTIN number'),
      ewaybill: z.string().describe('E-waybill number'),
      loanId: z.string().describe('Loan ID')
    }),
    taskSupport: 'optional',
    examples: {
      request: { userId: 'user1', consentId: 'consent-123', invoiceData: '{}', gstin: '27AAAAA0000A1Z5', ewaybill: '123456', loanId: 'LN123' },
      response: { 'Overall Financial Health': 'Stable', 'Loan Eligibility': 50000 }
    }
  })
  async generateFinancialHealthReport(
    input: { userId: string; consentId: string; invoiceData: string; gstin: string; ewaybill: string; loanId: string },
    context: ExecutionContext
  ) {
    context.task?.updateProgress('Fetching Account Aggregator Data...');
    const cashflow = await this.aaService.fetchCashflow(input.consentId);

    context.task?.updateProgress('Running Underwriting Engine...');
    const creditReport = await this.underwritingService.generateCreditReport(input.consentId);

    context.task?.updateProgress('Running Fraud Detection...');
    const fraudScore = await this.fraudService.calculateFraudScore(input.invoiceData, input.gstin, input.ewaybill);

    context.task?.updateProgress('Checking Repayment Status...');
    const repaymentPlan = await this.repaymentService.generateDailyRepaymentPlan(input.loanId);

    context.task?.updateProgress('Evaluating Succession Readiness...');
    const assets = await this.successionService.discoverAssets(input.userId);

    context.task?.updateProgress('Finalizing Report...');

    return {
      'Loan Eligibility': creditReport['Recommended Loan'],
      'Fraud Alerts': (fraudScore['Fraud Risk Score'] as number) > 50 ? 'High Risk - Review Required' : 'Clear',
      'Cash Flow': cashflow.net,
      'Repayment Status': repaymentPlan['Cashflow Status'],
      'Succession Readiness': assets ? 'Assets Registered - Ready' : 'Pending Setup',
      'Overall Financial Health': 'Stable',
      '_details': {
        creditReport,
        fraudScore,
        repaymentPlan,
        assets
      }
    };
  }
}
