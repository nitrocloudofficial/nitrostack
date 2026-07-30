import type { PostHogEventProperties } from '@posthog/core';
/**
 * Queue route for events eligible for Capture V1 (everything except `$ai_*`). Its queue is the
 * historical {@link PostHogPersistedProperty.Queue}, so v0 mode is byte-identical to before.
 */
export declare const ANALYTICS_ROUTE = "analytics";
/**
 * Queue route for `$ai_*` events, kept on the legacy (v0) transport in v1 mode and isolated on
 * its own queue so a v0 failure can't re-send events already accepted on the V1 route. This route
 * will later host a dedicated v1 AI-events transport once that endpoint exists — segregating it
 * now means no re-plumbing then.
 */
export declare const AI_ROUTE = "ai";
/**
 * True for events that must keep using the legacy (v0) submitter even when the
 * client is in v1 mode. Today that is only `$ai_*` events: the dedicated AI
 * ingestion path has no v1 form, so they stay on v0 until AI v1 is designed.
 * The check runs on the post-`before_send` event name.
 */
export declare function isLegacyOnlyEvent(message: PostHogEventProperties): boolean;
//# sourceMappingURL=routing.d.ts.map