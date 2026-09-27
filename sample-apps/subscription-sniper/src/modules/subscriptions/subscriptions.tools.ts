import { ToolDecorator as Tool, ExecutionContext, Injectable, z } from '@nitrostack/core';
import { SubscriptionsService } from './subscriptions.service.js';

const FetchSubscriptionEmailsSchema = z.object({
    account_email: z.string().email().optional().describe('Expected Gmail account for the OAuth refresh token, for example generalusermcp@gmail.com'),
    max_results: z.number().int().min(1).max(25).default(6).describe('Maximum number of matching subscription emails to return'),
    fallback_to_mock: z.boolean().default(true).describe('Return demo subscription emails if live Gmail fails. fetch_subscription_emails always falls back to mock data on Gmail errors.'),
});

const GmailConnectionStatusSchema = z.object({
    account_email: z.string().email().optional().describe('Expected Gmail account for the OAuth refresh token, for example generalusermcp@gmail.com'),
});

const ExtractSubscriptionMetadataSchema = z.object({
    email_body: z.string().min(1).describe('Raw subscription or billing email body'),
});

const CheckEngagementSignalsSchema = z.object({
    service_name: z.string().min(1).describe('Subscription service name to check for recent non-billing activity'),
});

const CalculateFinancialMetricsSchema = z.object({});

const GenerateCancellationPlaybookSchema = z.object({
    service_name: z.string().min(1).describe('Subscription service name to generate cancellation instructions for'),
});

@Injectable({ deps: [SubscriptionsService] })
export class SubscriptionsTools {
    constructor(private readonly subscriptionsService: SubscriptionsService) { }

    @Tool({
        name: 'fetch_subscription_emails',
        description: 'Fetch real subscription and billing email bodies from the Gmail account connected by GMAIL_REFRESH_TOKEN. Pass account_email to verify the token belongs to that Gmail account. Gmail errors are logged and return mock subscription emails as fallback.',
        inputSchema: FetchSubscriptionEmailsSchema,
        examples: {
            request: { account_email: 'generalusermcp@gmail.com', max_results: 5 },
            response: {
                emails: [
                    {
                        id: '18f2examplemessage',
                        body: 'Netflix...',
                    },
                ],
                source: 'live',
                connected_account: 'generalusermcp@gmail.com',
                total: 1,
            },
        },
    })
    async fetchSubscriptionEmails(args: z.infer<typeof FetchSubscriptionEmailsSchema>, ctx: ExecutionContext) {
        const result = await this.subscriptionsService.fetchEmails(args.max_results, ctx, args.account_email, args.fallback_to_mock);

        ctx.logger.info('Fetched subscription emails', {
            source: result.source,
            total: result.emails.length,
            maxResults: args.max_results,
            accountEmail: args.account_email,
        });

        return {
            emails: result.emails,
            source: result.source,
            connected_account: result.connected_account,
            total: result.emails.length,
        };
    }

    @Tool({
        name: 'check_gmail_connection',
        description: 'Temporary diagnostic tool: check whether Gmail OAuth is configured, connected, and which error message is returned if connection fails.',
        inputSchema: GmailConnectionStatusSchema,
    })
    async checkGmailConnection(args: z.infer<typeof GmailConnectionStatusSchema>, ctx: ExecutionContext) {
        const status = await this.subscriptionsService.getGmailConnectionStatus(ctx, args.account_email);

        ctx.logger.info('Checked Gmail connection through temporary diagnostic tool', {
            configured: status.configured,
            connected: status.connected,
            connectedAccount: status.connected_account,
        });

        return status;
    }

    @Tool({
        name: 'extract_subscription_metadata',
        description: 'Parse raw subscription email text into a structured subscription record and store it in memory.',
        inputSchema: ExtractSubscriptionMetadataSchema,
        examples: {
            request: { email_body: 'Netflix\nAmount due: INR 649.\nPrevious amount: INR 499.\nNext renewal date: 2026-07-19.' },
            response: {
                service_name: 'Netflix',
                amount: 649,
                previous_amount: 499,
                price_changed: true,
                currency: 'INR',
                billing_cycle: 'monthly',
                next_renewal_date: '2026-07-19',
                engagement_status: 'UNKNOWN',
            },
        },
    })
    async extractSubscriptionMetadata(args: z.infer<typeof ExtractSubscriptionMetadataSchema>, ctx: ExecutionContext) {
        const subscription = this.subscriptionsService.extractAndStore(args.email_body);

        ctx.logger.info('Extracted subscription metadata', {
            service: subscription.service_name,
            priceChanged: subscription.price_changed,
        });

        return subscription;
    }

    @Tool({
        name: 'check_engagement_signals',
        description: 'Search recent non-billing mock emails from a sender to classify a subscription as HIGH_ENGAGEMENT or NO_ENGAGEMENT.',
        inputSchema: CheckEngagementSignalsSchema,
        examples: {
            request: { service_name: 'Dropbox' },
            response: {
                service_name: 'Dropbox',
                engagement_status: 'HIGH_ENGAGEMENT',
            },
        },
    })
    async checkEngagementSignals(args: z.infer<typeof CheckEngagementSignalsSchema>, ctx: ExecutionContext) {
        const engagementStatus = this.subscriptionsService.checkEngagement(args.service_name);

        ctx.logger.info('Checked engagement signals', {
            service: args.service_name,
            engagementStatus,
        });

        return {
            service_name: args.service_name,
            engagement_status: engagementStatus,
        };
    }

    @Tool({
        name: 'calculate_financial_metrics',
        description: 'Calculate total monthly and annual spend, potential savings from no-engagement subscriptions, and detected price increases.',
        inputSchema: CalculateFinancialMetricsSchema,
        examples: {
            request: {},
            response: {
                total_monthly_spend: 2066,
                total_annual_spend: 24792,
                potential_savings: 662.25,
                price_increases: [
                    {
                        service: 'Netflix',
                        old_amount: 499,
                        new_amount: 649,
                        percent_change: 30.06,
                    },
                ],
            },
        },
    })
    async calculateFinancialMetrics(args: z.infer<typeof CalculateFinancialMetricsSchema>, ctx: ExecutionContext) {
        const metrics = this.subscriptionsService.calculateMetrics();

        ctx.logger.info('Calculated financial metrics', {
            totalMonthlySpend: metrics.total_monthly_spend,
            priceIncreaseCount: metrics.price_increases.length,
        });

        return metrics;
    }

    @Tool({
        name: 'generate_cancellation_playbook',
        description: 'Generate a markdown guide for cancelling autopay on PhonePe, GPay, or Paytm for a specific subscription service.',
        inputSchema: GenerateCancellationPlaybookSchema,
        examples: {
            request: { service_name: 'Calm' },
            response: {
                service_name: 'Calm',
                markdown: '# Cancellation Playbook: Calm...',
            },
        },
    })
    async generateCancellationPlaybook(args: z.infer<typeof GenerateCancellationPlaybookSchema>, ctx: ExecutionContext) {
        const markdown = this.subscriptionsService.getCancellationPlaybook(args.service_name);

        ctx.logger.info('Generated cancellation playbook', {
            service: args.service_name,
        });

        return {
            service_name: args.service_name,
            markdown,
        };
    }
}
