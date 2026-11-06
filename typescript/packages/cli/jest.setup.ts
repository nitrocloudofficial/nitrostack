/**
 * With a built-in default PostHog project key, disable outbound telemetry for the whole Jest run
 * unless a suite clears this (see `src/analytics/__tests__/posthog.test.ts`).
 */
process.env.DO_NOT_TRACK = '1';
