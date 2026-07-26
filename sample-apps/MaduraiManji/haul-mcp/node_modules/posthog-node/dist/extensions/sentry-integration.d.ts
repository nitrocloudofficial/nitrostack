/**
 * @file Adapted from [posthog-js](https://github.com/PostHog/posthog-js/blob/8157df935a4d0e71d2fefef7127aa85ee51c82d1/src/extensions/sentry-integration.ts) with modifications for the Node SDK.
 */
/**
 * Integrate Sentry with PostHog. This will add a direct link to the person in Sentry, and an $exception event in PostHog.
 *
 * @deprecated This integration is deprecated and will be removed in a future major version. Use PostHog Error Tracking for Node instead:
 * https://posthog.com/docs/error-tracking/installation/node
 *
 * ### Usage
 *
 *     Sentry.init({
 *          dsn: 'https://example',
 *          integrations: [
 *              new PostHogSentryIntegration(posthog)
 *          ]
 *     })
 *
 *     Sentry.setTag(PostHogSentryIntegration.POSTHOG_ID_TAG, 'some distinct id');
 *
 * @param {Object} [posthog] The posthog object
 * @param {string} [organization] Optional: The Sentry organization, used to send a direct link from PostHog to Sentry
 * @param {Number} [projectId] Optional: The Sentry project id, used to send a direct link from PostHog to Sentry
 * @param {string} [prefix] Optional: Url of a self-hosted sentry instance (default: https://sentry.io/organizations/)
 * @param {SeverityLevel[] | '*'} [severityAllowList] Optional: send events matching the provided levels. Use '*' to send all events (default: ['error'])
 * @param {boolean} [sendExceptionsToPostHog] Optional: capture exceptions as events in PostHog (default: true)
 */
import { ErrorTracking as CoreErrorTracking } from '@posthog/core';
import { type PostHogBackendClient } from '../client';
type _SentryEvent = any;
type _SentryEventProcessor = any;
type _SentryHub = any;
interface _SentryIntegration {
    name: string;
    processEvent(event: _SentryEvent): _SentryEvent;
}
interface _SentryIntegrationClass {
    name: string;
    setupOnce(addGlobalEventProcessor: (callback: _SentryEventProcessor) => void, getCurrentHub: () => _SentryHub): void;
}
export type SentryIntegrationOptions = {
    organization?: string;
    projectId?: number;
    prefix?: string;
    severityAllowList?: CoreErrorTracking.SeverityLevel[] | '*';
    sendExceptionsToPostHog?: boolean;
};
/**
 * Creates an event processor for the deprecated Sentry integration.
 *
 * @deprecated This integration is deprecated and will be removed in a future major version. Use PostHog Error Tracking for Node instead:
 * https://posthog.com/docs/error-tracking/installation/node
 */
export declare function createEventProcessor(_posthog: PostHogBackendClient, { organization, projectId, prefix, severityAllowList, sendExceptionsToPostHog, }?: SentryIntegrationOptions): (event: _SentryEvent) => _SentryEvent;
/**
 * Creates the function-based Sentry integration.
 *
 * @deprecated This integration is deprecated and will be removed in a future major version. Use PostHog Error Tracking for Node instead:
 * https://posthog.com/docs/error-tracking/installation/node
 */
export declare function sentryIntegration(_posthog: PostHogBackendClient, options?: SentryIntegrationOptions): _SentryIntegration;
/**
 * Class-based Sentry integration.
 *
 * @deprecated This integration is deprecated and will be removed in a future major version. Use PostHog Error Tracking for Node instead:
 * https://posthog.com/docs/error-tracking/installation/node
 */
export declare class PostHogSentryIntegration implements _SentryIntegrationClass {
    readonly name = "posthog-node";
    static readonly POSTHOG_ID_TAG = "posthog_distinct_id";
    setupOnce: (addGlobalEventProcessor: (callback: _SentryEventProcessor) => void, getCurrentHub: () => _SentryHub) => void;
    constructor(_posthog: PostHogBackendClient, organization?: string, prefix?: string, severityAllowList?: CoreErrorTracking.SeverityLevel[] | '*', sendExceptionsToPostHog?: boolean);
}
export {};
//# sourceMappingURL=sentry-integration.d.ts.map