import {
  ControllerDecorator as Controller,
  Injectable,
  ToolDecorator as Tool,
  UseFilters,
  Widget,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import { analyzeCashFlow } from './cashflow.analyzer.js';

const AnalyzeCashFlowInput = z.object({
  applicationId: z.string().describe('Application with a synced financial snapshot'),
});

@Controller('analytics')
@Injectable({ deps: [ApplicationStore] })
export class AnalyticsTools {
  constructor(private readonly store: ApplicationStore) {}

  @Tool({
    name: 'analyze_cash_flow',
    description:
      'Compute the full cash-flow profile for an application with synced bank data: monthly inflow and ' +
      'outflow, revenue stability and trend, days of cash on hand, reconstructed minimum balance, NSF ' +
      'events, debt service, and any anomalous transactions. This is the evidence the risk score is ' +
      'computed from — run it before risk_score_application if you want to inspect the inputs first.',
    inputSchema: AnalyzeCashFlowInput,
  })
  @Widget('cashflow-analysis')
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(AnalyzeCashFlowInput)
  async analyzeCashFlowTool(input: { applicationId: string }, ctx: ExecutionContext) {
    const application = this.store.getOrThrow(input.applicationId);

    if (!application.snapshot) {
      throw new Error(
        `Application "${input.applicationId}" has no financial snapshot. Run ` +
          `plaid_sync_financial_snapshot first.`,
      );
    }

    const metrics = analyzeCashFlow(application.snapshot);
    this.store.update(application.applicationId, { status: 'ANALYZED', metrics });
    this.store.recordAudit(application.applicationId, 'system', 'analytics.cash_flow_analyzed', {
      monthsObserved: metrics.monthsObserved,
      anomalyCount: metrics.anomalies.length,
    });

    ctx.logger.info('Cash flow analyzed', {
      applicationId: application.applicationId,
      monthsObserved: metrics.monthsObserved,
    });

    return {
      applicationId: application.applicationId,
      businessName: application.profile.businessName,
      status: 'ANALYZED',
      dataSource: application.snapshot.source,
      institutionName: application.snapshot.institutionName,
      metrics,
      nextAction: 'Score the application with risk_score_application.',
    };
  }
}
