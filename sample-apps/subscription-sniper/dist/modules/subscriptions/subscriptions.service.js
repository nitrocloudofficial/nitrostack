var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nitrostack/core';
import { google } from 'googleapis';
import { MOCK_SUBSCRIPTION_EMAILS } from './subscriptions.data.js';
const BILLING_KEYWORDS = ['subscription', 'billing', 'invoice', 'receipt', 'renewal', 'charged', 'amount'];
const ACTIVITY_KEYWORDS = ['watched', 'listening', 'exports', 'sync', 'edited', 'shared', 'activity'];
const INACTIVITY_KEYWORDS = ['not seen', 'no lessons', 'no activity', 'inactive', 'not used'];
const GMAIL_BILLING_QUERY = 'subject:(invoice OR receipt OR billing OR renewal OR subscription OR payment)';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';
let SubscriptionsService = class SubscriptionsService {
    trackedSubscriptions = new Map();
    async fetchEmails(maxResults, ctx, expectedAccount, fallbackToMock = true) {
        const limit = Math.max(1, maxResults);
        try {
            return await this.fetchLiveGmailEmails(GMAIL_BILLING_QUERY, limit, expectedAccount);
        }
        catch (error) {
            ctx.logger.error('Failed to fetch live Gmail messages; falling back to mock subscription emails', error instanceof Error ? error : { error: String(error) });
            return {
                emails: this.getMockBillingEmails(limit),
                source: 'mock',
            };
        }
    }
    async getGmailConnectionStatus(ctx, expectedAccount) {
        try {
            const clientId = process.env.GMAIL_CLIENT_ID?.trim();
            const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
            const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
            const targetAccount = this.normalizeExpectedAccount(expectedAccount);
            if (!clientId || !clientSecret || !refreshToken) {
                return {
                    configured: false,
                    connected: false,
                    expected_account: targetAccount,
                    source: 'mock',
                    message: 'Gmail is not configured. Add GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN to .env.',
                };
            }
            const OAuth2Client = google.auth.OAuth2;
            const auth = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
            auth.setCredentials({ refresh_token: refreshToken });
            const gmail = google.gmail({ version: 'v1', auth });
            const profile = await gmail.users.getProfile({
                userId: 'me',
            });
            this.assertConnectedAccount(profile.data.emailAddress, targetAccount);
            return {
                configured: true,
                connected: true,
                connected_account: profile.data.emailAddress ?? undefined,
                expected_account: targetAccount,
                source: 'live',
                message: `Gmail is connected${profile.data.emailAddress ? ` as ${profile.data.emailAddress}` : ''}.`,
            };
        }
        catch (error) {
            ctx.logger.error('Failed to verify Gmail connection', error instanceof Error ? error : { error: String(error) });
            return {
                configured: true,
                connected: false,
                expected_account: this.normalizeExpectedAccount(expectedAccount),
                source: 'mock',
                message: error instanceof Error ? error.message : 'Gmail credentials are present, but the live connection check failed.',
            };
        }
    }
    extractAndStore(emailBody) {
        const serviceName = this.extractServiceName(emailBody);
        const amount = this.extractAmount(emailBody) ?? 0;
        const previousAmount = this.extractPreviousAmount(emailBody);
        const currency = this.extractCurrency(emailBody);
        const billingCycle = /yearly|annual/i.test(emailBody) ? 'yearly' : 'monthly';
        const nextRenewalDate = this.extractRenewalDate(emailBody);
        const engagementStatus = this.detectEngagementFromText(emailBody);
        const record = {
            service_name: serviceName,
            amount,
            previous_amount: previousAmount,
            price_changed: previousAmount !== undefined && amount > previousAmount,
            currency,
            billing_cycle: billingCycle,
            next_renewal_date: nextRenewalDate,
            engagement_status: engagementStatus,
        };
        this.trackedSubscriptions.set(serviceName.toLowerCase(), record);
        return record;
    }
    checkEngagement(serviceName) {
        const normalizedService = serviceName.toLowerCase();
        const relatedEmails = MOCK_SUBSCRIPTION_EMAILS.filter(email => {
            const haystack = `${email.from} ${email.subject} ${email.body}`.toLowerCase();
            return !email.isBilling && haystack.includes(normalizedService);
        });
        const engagementStatus = relatedEmails.length > 0 ? 'HIGH_ENGAGEMENT' : 'NO_ENGAGEMENT';
        const existingRecord = this.trackedSubscriptions.get(normalizedService);
        if (existingRecord) {
            this.trackedSubscriptions.set(normalizedService, {
                ...existingRecord,
                engagement_status: engagementStatus,
            });
        }
        return engagementStatus;
    }
    calculateMetrics() {
        const subscriptions = this.getTrackedSubscriptions();
        const totalMonthlySpend = subscriptions.reduce((total, subscription) => {
            return total + this.toMonthlyAmount(subscription);
        }, 0);
        const potentialSavings = subscriptions
            .filter(subscription => subscription.engagement_status === 'NO_ENGAGEMENT')
            .reduce((total, subscription) => total + this.toMonthlyAmount(subscription), 0);
        const priceIncreases = subscriptions
            .filter((subscription) => {
            return subscription.previous_amount !== undefined && subscription.amount > subscription.previous_amount;
        })
            .map(subscription => ({
            service: subscription.service_name,
            old_amount: subscription.previous_amount,
            new_amount: subscription.amount,
            percent_change: Number((((subscription.amount - subscription.previous_amount) / subscription.previous_amount) * 100).toFixed(2)),
        }));
        return {
            total_monthly_spend: Number(totalMonthlySpend.toFixed(2)),
            total_annual_spend: Number((totalMonthlySpend * 12).toFixed(2)),
            potential_savings: Number(potentialSavings.toFixed(2)),
            price_increases: priceIncreases,
        };
    }
    getCancellationPlaybook(serviceName) {
        return `# Cancellation Playbook: ${serviceName}

## Before you cancel
1. Confirm the subscription name in your UPI autopay mandates.
2. Check whether cancelling now removes access immediately or at renewal.
3. Take a screenshot of the mandate or subscription page for your records.

## PhonePe
1. Open PhonePe and go to **Profile**.
2. Tap **Autopay** or **Mandates**.
3. Select the mandate for **${serviceName}**.
4. Tap **Pause**, **Revoke**, or **Cancel Autopay**.
5. Confirm with UPI PIN if prompted.

## GPay
1. Open Google Pay and tap your profile photo.
2. Go to **Autopay** or **Payment mandates**.
3. Choose the **${serviceName}** mandate.
4. Tap **Cancel autopay**.
5. Confirm the cancellation and save the confirmation screen.

## Paytm
1. Open Paytm and go to **UPI & Payment Settings**.
2. Tap **Automatic Payments** or **UPI Autopay**.
3. Select **${serviceName}**.
4. Tap **Cancel Mandate**.
5. Confirm the cancellation and check that the mandate status changed to cancelled.`;
    }
    getTrackedSubscriptions() {
        return Array.from(this.trackedSubscriptions.values());
    }
    getImminentNoEngagementAlerts(now = new Date()) {
        const fortyEightHoursFromNow = now.getTime() + 48 * 60 * 60 * 1000;
        return this.getTrackedSubscriptions().filter(subscription => {
            const renewalTime = new Date(subscription.next_renewal_date).getTime();
            return Number.isFinite(renewalTime)
                && renewalTime >= now.getTime()
                && renewalTime <= fortyEightHoursFromNow
                && subscription.engagement_status === 'NO_ENGAGEMENT';
        });
    }
    extractServiceName(emailBody) {
        return emailBody
            .split('\n')
            .map(line => line.trim())
            .find(Boolean) ?? 'Unknown Service';
    }
    extractAmount(emailBody) {
        const match = emailBody.match(/(?:amount(?:\s+due)?|charged)[:\s]+(?:INR|Rs\.?|\$|USD)?\s*([\d,]+(?:\.\d{1,2})?)/i);
        return match ? Number(match[1].replace(/,/g, '')) : undefined;
    }
    extractPreviousAmount(emailBody) {
        const match = emailBody.match(/previous amount[:\s]+(?:INR|Rs\.?|\$|USD)?\s*([\d,]+(?:\.\d{1,2})?)/i);
        return match ? Number(match[1].replace(/,/g, '')) : undefined;
    }
    extractCurrency(emailBody) {
        if (/\b(?:INR|Rs\.?)\b/i.test(emailBody)) {
            return 'INR';
        }
        if (/\bUSD\b|\$/i.test(emailBody)) {
            return 'USD';
        }
        return 'INR';
    }
    extractRenewalDate(emailBody) {
        const match = emailBody.match(/(?:renew(?:s|al)?(?: date)?(?: is)?(?: on)?|starts on)[:\s]+(\d{4}-\d{2}-\d{2})/i);
        return match?.[1] ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    detectEngagementFromText(emailBody) {
        const lowerBody = emailBody.toLowerCase();
        if (INACTIVITY_KEYWORDS.some(keyword => lowerBody.includes(keyword))) {
            return 'NO_ENGAGEMENT';
        }
        if (ACTIVITY_KEYWORDS.some(keyword => lowerBody.includes(keyword))) {
            return 'HIGH_ENGAGEMENT';
        }
        return 'UNKNOWN';
    }
    toMonthlyAmount(subscription) {
        return subscription.billing_cycle === 'yearly'
            ? subscription.amount / 12
            : subscription.amount;
    }
    getMockBillingEmails(maxResults) {
        const billingEmails = MOCK_SUBSCRIPTION_EMAILS.filter(email => {
            const haystack = `${email.subject} ${email.body}`.toLowerCase();
            return email.isBilling || BILLING_KEYWORDS.some(keyword => haystack.includes(keyword));
        });
        return billingEmails.slice(0, maxResults);
    }
    async fetchLiveGmailEmails(query, maxResults, expectedAccount) {
        const clientId = process.env.GMAIL_CLIENT_ID?.trim();
        const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
        const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
        const targetAccount = this.normalizeExpectedAccount(expectedAccount);
        if (!clientId || !clientSecret || !refreshToken) {
            throw new Error('Missing Gmail OAuth environment variables');
        }
        const OAuth2Client = google.auth.OAuth2;
        const auth = new OAuth2Client(clientId, clientSecret, REDIRECT_URI);
        auth.setCredentials({ refresh_token: refreshToken });
        const gmail = google.gmail({ version: 'v1', auth });
        const profile = await gmail.users.getProfile({
            userId: 'me',
        });
        this.assertConnectedAccount(profile.data.emailAddress, targetAccount);
        const listedMessages = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults,
        });
        const messages = listedMessages.data.messages ?? [];
        const emails = await Promise.all(messages.slice(0, maxResults).map(async (message) => {
            const fetchedMessage = await gmail.users.messages.get({
                userId: 'me',
                id: message.id ?? '',
                format: 'full',
            });
            return {
                id: fetchedMessage.data.id ?? message.id ?? '',
                body: this.extractGmailMessageBody(fetchedMessage.data.payload),
            };
        }));
        return {
            emails: emails.filter(email => email.id && email.body),
            source: 'live',
            connected_account: profile.data.emailAddress ?? undefined,
        };
    }
    normalizeExpectedAccount(expectedAccount) {
        return (expectedAccount ?? process.env.GMAIL_ACCOUNT_EMAIL)?.trim().toLowerCase() || undefined;
    }
    assertConnectedAccount(connectedAccount, expectedAccount) {
        if (!expectedAccount) {
            return;
        }
        const normalizedConnectedAccount = connectedAccount?.trim().toLowerCase();
        if (normalizedConnectedAccount !== expectedAccount) {
            throw new Error(`Gmail OAuth refresh token is connected to ${connectedAccount ?? 'an unknown account'}, not ${expectedAccount}. Run npm run get-token and choose ${expectedAccount}.`);
        }
    }
    extractGmailMessageBody(payload) {
        const parts = this.collectGmailBodyParts(payload);
        const preferredPart = parts.find(part => part.mimeType === 'text/plain')
            ?? parts.find(part => part.mimeType === 'text/html')
            ?? parts[0];
        if (!preferredPart) {
            return '';
        }
        const decodedBody = this.decodeBase64Url(preferredPart.data);
        return preferredPart.mimeType === 'text/html' || /<\/?[a-z][\s\S]*>/i.test(decodedBody)
            ? this.stripHtml(decodedBody)
            : decodedBody;
    }
    collectGmailBodyParts(payload) {
        if (!payload) {
            return [];
        }
        const bodyParts = [];
        if (payload.body?.data) {
            bodyParts.push({
                mimeType: payload.mimeType ?? undefined,
                data: payload.body.data,
            });
        }
        for (const part of payload.parts ?? []) {
            bodyParts.push(...this.collectGmailBodyParts(part));
        }
        return bodyParts;
    }
    decodeBase64Url(data) {
        const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return Buffer.from(padded, 'base64').toString('utf8');
    }
    stripHtml(html) {
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }
};
SubscriptionsService = __decorate([
    Injectable()
], SubscriptionsService);
export { SubscriptionsService };
//# sourceMappingURL=subscriptions.service.js.map