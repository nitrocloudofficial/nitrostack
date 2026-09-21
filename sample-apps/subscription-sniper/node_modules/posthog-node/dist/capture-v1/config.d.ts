/** Capture submission mode: `v0` is the legacy `/batch/` endpoint, `v1` is `/i/v1/analytics/events`. */
export type CaptureMode = 'v0' | 'v1';
/**
 * Resolve the effective capture mode from the `POSTHOG_CAPTURE_MODE` environment
 * variable (guarded for edge / no-`process` runtimes). The default is `v0`, so
 * existing users are unaffected unless they explicitly opt in. Capture V1 is
 * intentionally env-var-only during the transition — there is no public option,
 * so nothing on the API surface has to be removed when v1 becomes the default.
 */
export declare function resolveCaptureMode(): CaptureMode;
//# sourceMappingURL=config.d.ts.map