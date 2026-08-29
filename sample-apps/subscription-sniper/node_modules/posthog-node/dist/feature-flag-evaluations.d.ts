import { FeatureFlagValue, JsonType } from '@posthog/core';
/**
 * Internal per-flag record stored by a {@link FeatureFlagEvaluations} instance.
 * Not part of the public API.
 *
 * @internal
 */
export type EvaluatedFlagRecord = {
    key: string;
    enabled: boolean;
    variant: string | undefined;
    payload: JsonType | undefined;
    id: number | undefined;
    version: number | undefined;
    reason: string | undefined;
    locallyEvaluated: boolean;
    /** Whether the flag is linked to an experiment; undefined when the server did not report it. */
    hasExperiment: boolean | undefined;
};
/**
 * Parameters passed to the host when a `$feature_flag_called` event should be captured.
 *
 * @internal
 */
export type FlagCalledEventParams = {
    distinctId: string;
    key: string;
    response: FeatureFlagValue | undefined;
    groups: Record<string, string | number> | undefined;
    disableGeoip: boolean | undefined;
    properties: Record<string, any>;
};
/**
 * Thin interface the evaluations object uses to talk back to the PostHog client.
 * Keeps the class decoupled from the full client surface area.
 *
 * @internal
 */
export interface FeatureFlagEvaluationsHost {
    captureFlagCalledEventIfNeeded(params: FlagCalledEventParams): void;
    logWarning(message: string): void;
}
/**
 * A snapshot of feature flag evaluations for a single distinctId at a point in time.
 *
 * Returned by {@link IPostHog.evaluateFlags} — branch on `isEnabled()` / `getFlag()`
 * and pass the same object to `capture()` via the `flags` option so the captured event
 * carries the exact flag values the code branched on.
 *
 * ```ts
 * const flags = await posthog.evaluateFlags(distinctId, { personProperties: { plan: 'enterprise' } })
 *
 * if (flags.isEnabled('new-dashboard')) {
 *   renderNewDashboard()
 * }
 *
 * posthog.capture({ distinctId, event: 'page_viewed', flags })
 * ```
 *
 * To narrow the set of flags that get attached to a captured event, use the in-memory
 * helpers `only([...])` and `onlyAccessed()`. To narrow the set of flags requested from
 * the server in the first place, pass `flagKeys` to `evaluateFlags()`.
 */
export declare class FeatureFlagEvaluations {
    private readonly _host;
    private readonly _distinctId;
    private readonly _groups;
    private readonly _disableGeoip;
    private readonly _flags;
    private readonly _requestId;
    private readonly _evaluatedAt;
    private readonly _flagDefinitionsLoadedAt;
    private readonly _errorsWhileComputing;
    private readonly _quotaLimited;
    private readonly _accessed;
    private readonly _isSlice;
    /**
     * @internal — instances are created by the SDK via `posthog.evaluateFlags()`.
     */
    constructor(init: {
        host: FeatureFlagEvaluationsHost;
        distinctId: string;
        groups?: Record<string, string | number>;
        disableGeoip?: boolean;
        flags: Record<string, EvaluatedFlagRecord>;
        requestId?: string;
        evaluatedAt?: number;
        flagDefinitionsLoadedAt?: number;
        errorsWhileComputing?: boolean;
        quotaLimited?: boolean;
        accessed?: Set<string>;
        isSlice?: boolean;
    });
    /**
     * Check whether a feature flag is enabled. Fires a `$feature_flag_called` event
     * on the first access per (distinctId, flag, value) tuple, deduped via the SDK's
     * existing cache.
     *
     * Flags that were not returned from the underlying evaluation are treated as
     * disabled (returns `false`).
     */
    isEnabled(key: string): boolean;
    /**
     * Get the evaluated value of a feature flag. Fires a `$feature_flag_called` event
     * on the first access per (distinctId, flag, value) tuple.
     *
     * Returns the variant string for multivariate flags, `true` for enabled flags
     * without a variant, `false` for disabled flags, and `undefined` for flags that
     * were not returned by the evaluation.
     */
    getFlag(key: string): FeatureFlagValue | undefined;
    /**
     * Get the payload associated with a feature flag. Does not count as an access
     * for `onlyAccessed()` and does not fire any event.
     */
    getFlagPayload(key: string): JsonType | undefined;
    /**
     * Return a filtered copy containing only flags that have been accessed via
     * `isEnabled()` or `getFlag()` before this call.
     *
     * Order-dependent: if nothing has been accessed yet, the returned snapshot is
     * empty. The method honors its name — pre-access if you want a populated result.
     *
     * **Note:** the returned snapshot is intended for `capture()`, not for further
     * branching. Calling `isEnabled()` / `getFlag()` on it for a key that was filtered
     * out is a no-op (no event is fired) — the flag wasn't actually missing, it was
     * excluded from the slice.
     */
    onlyAccessed(): FeatureFlagEvaluations;
    /**
     * Return a filtered copy containing only flags with the given keys. Keys that
     * are not present in the evaluation are dropped and logged as a warning.
     *
     * **Note:** like `onlyAccessed()`, the returned snapshot is intended for `capture()`.
     * Branching on a filtered key that was excluded from the slice is a no-op.
     */
    only(keys: string[]): FeatureFlagEvaluations;
    /**
     * Returns the flag keys that are part of this evaluation.
     */
    get keys(): string[];
    /**
     * Build the `$feature/*` and `$active_feature_flags` event properties derived
     * from the current flag set. Called by `capture()` when an event is captured
     * with `flags: ...`.
     *
     * @internal
     */
    _getEventProperties(): Record<string, any>;
    private _cloneWith;
    private _recordAccess;
}
//# sourceMappingURL=feature-flag-evaluations.d.ts.map