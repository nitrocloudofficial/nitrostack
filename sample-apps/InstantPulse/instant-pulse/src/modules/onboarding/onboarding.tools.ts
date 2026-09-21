import {
  ControllerDecorator as Controller,
  Injectable,
  ToolDecorator as Tool,
  UseFilters,
  z,
  type ExecutionContext,
} from '@nitrostack/core';
import { InstantPulseExceptionFilter } from '../../common/filters/instantpulse.filter.js';
import { ValidateInput } from '../../common/pipes/validate-input.js';
import { ApplicationStore } from '../../common/store/application.store.js';
import type { BusinessProfile } from '../../common/types/instantpulse.types.js';

const CreateApplicationInput = z.object({
  businessName: z.string().min(1).describe('Registered or trading name of the business'),
  industry: z.string().min(1).describe('Industry or sector, e.g. "wholesale distribution"'),
  entityType: z.string().optional().describe('Legal entity type, e.g. LLC, Sole Proprietor, C-Corp'),
  ein: z.string().optional().describe('Employer Identification Number, if available'),
  yearsInOperation: z.number().nonnegative().optional().describe('Years the business has traded'),
  claimedMonthlyRevenue: z
    .number()
    .nonnegative()
    .optional()
    .describe('Revenue the applicant states. Recorded for comparison against actual bank activity.'),
  requestedAmount: z.number().nonnegative().optional().describe('Credit amount being requested, in USD'),
  contactEmail: z.string().email().optional().describe('Contact email for the applicant'),
  country: z.string().default('US').describe('ISO country code'),
});

const GetStatusInput = z.object({
  applicationId: z.string().describe('The application to inspect'),
  includeMetrics: z.boolean().default(true).describe('Include the full cash-flow metrics block'),
});

const ListApplicationsInput = z.object({
  status: z
    .enum([
      'DRAFT',
      'BANK_CONNECTED',
      'DATA_SYNCED',
      'ANALYZED',
      'SCORED',
      'PENDING_REVIEW',
      'DOCUMENTS_REQUESTED',
      'APPROVED',
      'DECLINED',
      'ONBOARDING_STARTED',
    ])
    .optional()
    .describe('Filter to a single lifecycle status'),
  band: z.enum(['GREEN', 'YELLOW', 'RED']).optional().describe('Filter to a single risk band'),
  limit: z.number().int().positive().max(100).default(25),
});

@Controller('onboarding')
@Injectable({ deps: [ApplicationStore] })
export class OnboardingTools {
  constructor(private readonly store: ApplicationStore) {}

  @Tool({
    name: 'create_application',
    description:
      'Open a new business onboarding application. This is the first step — it returns an applicationId ' +
      'that every later tool needs. Collects only what a bank would ask on a cover sheet; all the ' +
      'financial evidence comes from the connected bank account, not from forms.',
    inputSchema: CreateApplicationInput,
    examples: {
      request: {
        businessName: 'Northwind Supply Co.',
        industry: 'wholesale distribution',
        entityType: 'LLC',
        requestedAmount: 50000,
        country: 'US',
      },
      response: {
        applicationId: 'app_1a2b3c4d5e6f7g8h',
        status: 'DRAFT',
        nextAction: 'Connect a bank account with plaid_connect_sandbox_bank.',
      },
    },
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(CreateApplicationInput)
  async createApplication(input: BusinessProfile, ctx: ExecutionContext) {
    const application = this.store.create({
      businessName: input.businessName,
      industry: input.industry,
      entityType: input.entityType,
      ein: input.ein,
      yearsInOperation: input.yearsInOperation,
      claimedMonthlyRevenue: input.claimedMonthlyRevenue,
      requestedAmount: input.requestedAmount,
      contactEmail: input.contactEmail,
      country: input.country || 'US',
    });

    ctx.logger.info('Application created', {
      applicationId: application.applicationId,
      businessName: input.businessName,
    });

    return {
      applicationId: application.applicationId,
      status: application.status,
      createdAt: application.createdAt,
      profile: application.profile,
      nextAction:
        'Connect the business bank account. Use plaid_connect_sandbox_bank for an instant sandbox ' +
        'connection, or plaid_create_link_token to run the real hosted Plaid Link flow.',
    };
  }

  @Tool({
    name: 'get_status',
    description:
      'Fetch the full current state of one application: profile, connection status, cash-flow metrics, ' +
      'risk decision, Stripe onboarding and any officer override. Bank access tokens and the raw ' +
      'transaction ledger are never included.',
    inputSchema: GetStatusInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(GetStatusInput)
  async getStatus(input: { applicationId: string; includeMetrics: boolean }, ctx: ExecutionContext) {
    const application = this.store.getOrThrow(input.applicationId);
    const view = this.store.toPublic(application);

    ctx.logger.info('Application status read', { applicationId: input.applicationId });

    return {
      ...view,
      metrics: input.includeMetrics ? view.metrics : undefined,
      documentRequestCount: application.documentRequests.length,
      auditEntryCount: this.store.getAudit(application.applicationId).length,
    };
  }

  @Tool({
    name: 'list_applications',
    description:
      'List applications currently in flight, newest first. Use this to recover an applicationId, or to ' +
      'get a portfolio-level view of what has been decided.',
    inputSchema: ListApplicationsInput,
  })
  @UseFilters(InstantPulseExceptionFilter)
  @ValidateInput(ListApplicationsInput)
  async listApplications(
    input: { status?: string; band?: string; limit: number },
    ctx: ExecutionContext,
  ) {
    const all = this.store.list({ status: input.status as never, band: input.band });
    const page = all.slice(0, input.limit);

    ctx.logger.info('Applications listed', { total: all.length, returned: page.length });

    return {
      total: all.length,
      returned: page.length,
      applications: page.map((a) => ({
        applicationId: a.applicationId,
        businessName: a.profile.businessName,
        industry: a.profile.industry,
        status: a.status,
        band: a.decision?.band,
        score: a.decision?.score,
        recommendedLimit: a.decision?.credit.recommendedLimit,
        requestedAmount: a.profile.requestedAmount,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    };
  }
}
