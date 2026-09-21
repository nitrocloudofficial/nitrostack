import { ExecutionContext } from '@nitrostack/core';
import { type MockSubscriptionEmail } from './subscriptions.data.js';
export type BillingCycle = 'monthly' | 'yearly';
export type EngagementStatus = 'HIGH_ENGAGEMENT' | 'NO_ENGAGEMENT' | 'UNKNOWN';
export interface SubscriptionRecord {
    service_name: string;
    amount: number;
    previous_amount?: number;
    price_changed: boolean;
    currency: string;
    billing_cycle: BillingCycle;
    next_renewal_date: string;
    engagement_status: EngagementStatus;
}
export interface SubscriptionMetrics {
    total_monthly_spend: number;
    total_annual_spend: number;
    potential_savings: number;
    price_increases: Array<{
        service: string;
        old_amount: number;
        new_amount: number;
        percent_change: number;
    }>;
}
export type EmailSource = 'live' | 'mock';
export interface LiveSubscriptionEmail {
    id: string;
    body: string;
}
export interface FetchEmailsResult {
    emails: Array<LiveSubscriptionEmail | MockSubscriptionEmail>;
    source: EmailSource;
    connected_account?: string;
}
export interface GmailConnectionStatus {
    configured: boolean;
    connected: boolean;
    connected_account?: string;
    expected_account?: string;
    source: EmailSource;
    message: string;
}
export declare class SubscriptionsService {
    private readonly trackedSubscriptions;
    fetchEmails(maxResults: number, ctx: ExecutionContext, expectedAccount?: string, fallbackToMock?: boolean): Promise<FetchEmailsResult>;
    getGmailConnectionStatus(ctx: ExecutionContext, expectedAccount?: string): Promise<GmailConnectionStatus>;
    extractAndStore(emailBody: string): SubscriptionRecord;
    checkEngagement(serviceName: string): EngagementStatus;
    calculateMetrics(): SubscriptionMetrics;
    getCancellationPlaybook(serviceName: string): string;
    getTrackedSubscriptions(): SubscriptionRecord[];
    getImminentNoEngagementAlerts(now?: Date): SubscriptionRecord[];
    private extractServiceName;
    private extractAmount;
    private extractPreviousAmount;
    private extractCurrency;
    private extractRenewalDate;
    private detectEngagementFromText;
    private toMonthlyAmount;
    private getMockBillingEmails;
    private fetchLiveGmailEmails;
    private normalizeExpectedAccount;
    private assertConnectedAccount;
    private extractGmailMessageBody;
    private collectGmailBodyParts;
    private decodeBase64Url;
    private stripHtml;
}
//# sourceMappingURL=subscriptions.service.d.ts.map