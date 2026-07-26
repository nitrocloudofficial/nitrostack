import {
  FeatureFlagDetail,
  FeatureFlagResult,
  FeatureFlagValue,
  JsonType,
  PostHogFlagsResponse,
  PostHogV1FlagsResponse,
  PostHogV2FlagsResponse,
  PostHogFlagsAndPayloadsResponse,
  PartialWithRequired,
  PostHogFeatureFlagsResponse,
} from './types'

export const normalizeFlagsResponse = (
  flagsResponse:
    | PartialWithRequired<PostHogV2FlagsResponse, 'flags'>
    | PartialWithRequired<PostHogV1FlagsResponse, 'featureFlags' | 'featureFlagPayloads'>
): PostHogFeatureFlagsResponse => {
  if ('flags' in flagsResponse) {
    // Convert v2 format to v1 format
    const featureFlags = getFlagValuesFromFlags(flagsResponse.flags)
    const featureFlagPayloads = getPayloadsFromFlags(flagsResponse.flags)

    return {
      ...flagsResponse,
      featureFlags,
      featureFlagPayloads,
    }
  } else {
    // Convert v1 format to v2 format
    const featureFlags = flagsResponse.featureFlags ?? {}
    const featureFlagPayloads = Object.fromEntries(
      Object.entries(flagsResponse.featureFlagPayloads || {}).map(([k, v]) => [k, parsePayload(v)])
    )

    const flags = Object.fromEntries(
      Object.entries(featureFlags).map(([key, value]) => [
        key,
        getFlagDetailFromFlagAndPayload(key, value, featureFlagPayloads[key]),
      ])
    )

    return {
      ...flagsResponse,
      featureFlags,
      featureFlagPayloads,
      flags,
    }
  }
}

function getFlagDetailFromFlagAndPayload(
  key: string,
  value: FeatureFlagValue,
  payload: JsonType | undefined
): FeatureFlagDetail {
  return {
    key: key,
    enabled: typeof value === 'string' ? true : value,
    variant: typeof value === 'string' ? value : undefined,
    reason: undefined,
    metadata: {
      id: undefined,
      version: undefined,
      payload: payload ? JSON.stringify(payload) : undefined,
      description: undefined,
    },
  }
}

/**
 * Get the flag values from the flags v4 response.
 * @param flags - The flags
 * @returns The flag values
 */
export const getFlagValuesFromFlags = (flags: PostHogFlagsResponse['flags']): PostHogFlagsResponse['featureFlags'] => {
  return Object.fromEntries(
    Object.entries(flags ?? {})
      .map(([key, detail]) => [key, getFeatureFlagValue(detail)])
      .filter(([, value]): boolean => value !== undefined)
  )
}

/**
 * Get the payloads from the flags v4 response.
 * @param flags - The flags
 * @returns The payloads
 */
export const getPayloadsFromFlags = (
  flags: PostHogFlagsResponse['flags']
): PostHogFlagsResponse['featureFlagPayloads'] => {
  const safeFlags = flags ?? {}
  return Object.fromEntries(
    Object.keys(safeFlags)
      .filter((flag) => {
        const details = safeFlags[flag]
        return details.enabled && details.metadata && details.metadata.payload !== undefined
      })
      .map((flag) => {
        const payload = safeFlags[flag].metadata?.payload as string
        return [flag, payload ? parsePayload(payload) : undefined]
      })
  )
}

export const getFeatureFlagValue = (detail: FeatureFlagDetail | undefined): FeatureFlagValue | undefined => {
  return detail === undefined ? undefined : (detail.variant ?? detail.enabled)
}

export const parsePayload = (response: any): any => {
  if (typeof response !== 'string') {
    return response
  }

  try {
    return JSON.parse(response)
  } catch {
    return response
  }
}

/**
 * Get the normalized flag details from the flags and payloads.
 * This is used to convert things like bootstrap and stored feature flags and payloads to the v4 format.
 * This helps us ensure backwards compatibility.
 * If a key exists in the featureFlagPayloads that is not in the featureFlags, we treat it as a true feature flag.
 *
 * @param featureFlags - The feature flags
 * @param featureFlagPayloads - The feature flag payloads
 * @returns The normalized flag details
 */
export const createFlagsResponseFromFlagsAndPayloads = (
  featureFlags: PostHogV1FlagsResponse['featureFlags'],
  featureFlagPayloads: PostHogV1FlagsResponse['featureFlagPayloads']
): PostHogFeatureFlagsResponse => {
  // If a feature flag payload key is not in the feature flags, we treat it as true feature flag.
  const allKeys = [...new Set([...Object.keys(featureFlags ?? {}), ...Object.keys(featureFlagPayloads ?? {})])]
  const enabledFlags = allKeys
    .filter((flag) => !!featureFlags[flag] || !!featureFlagPayloads[flag])
    .reduce((res: Record<string, FeatureFlagValue>, key) => ((res[key] = featureFlags[key] ?? true), res), {})

  const flagDetails: PostHogFlagsAndPayloadsResponse = {
    featureFlags: enabledFlags,
    featureFlagPayloads: featureFlagPayloads ?? {},
  }

  return normalizeFlagsResponse(flagDetails as PostHogV1FlagsResponse)
}

export const updateFlagValue = (flag: FeatureFlagDetail, value: FeatureFlagValue): FeatureFlagDetail => {
  return {
    ...flag,
    enabled: getEnabledFromValue(value),
    variant: getVariantFromValue(value),
  }
}

export function getEnabledFromValue(value: FeatureFlagValue): boolean {
  return typeof value === 'string' ? true : value
}

export function getVariantFromValue(value: FeatureFlagValue): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export const flagDetailsToResults = (flagDetails: Record<string, FeatureFlagDetail>): FeatureFlagResult[] => {
  return Object.values(flagDetails).map((detail) => {
    const value = detail.variant ?? detail.enabled
    const rawPayload = detail.metadata?.payload
    return {
      key: detail.key,
      enabled: getEnabledFromValue(value),
      variant: getVariantFromValue(value),
      payload: rawPayload !== undefined ? parsePayload(rawPayload) : null,
    }
  })
}

/**
 * Strict allowlist of event properties kept on a minimal `$feature_flag_called` event.
 *
 * When the server gates a project into minimal flag-called events
 * (`minimalFlagCalledEvents` on the v2 `/flags` response, `minimal_flag_called_events`
 * on the local-evaluation definitions) and the evaluated flag is not linked to an
 * experiment (`has_experiment === false`), the event is rebuilt from this list.
 * Everything else — super properties, `$set`/`$set_once`, the `$feature/<key>`
 * enumeration, `$active_feature_flags`, and the context envelope — is dropped.
 *
 * The list is the union across client and server SDKs; entries are inert where an
 * SDK never sets them.
 */
export const MINIMAL_FLAG_CALLED_EVENT_PROPERTIES: readonly string[] = [
  // Flag identity
  '$feature_flag',
  '$feature_flag_response',
  '$feature_flag_has_experiment',
  // Evaluation debug
  '$feature_flag_id',
  '$feature_flag_version',
  '$feature_flag_reason',
  '$feature_flag_request_id',
  '$feature_flag_evaluated_at',
  '$feature_flag_error',
  'locally_evaluated',
  // Correctness-required processing controls
  '$groups',
  '$process_person_profile',
  '$geoip_disable',
  // Debug location
  '$current_url',
  '$pathname',
  // Linkage / SDK identity
  '$session_id',
  '$window_id',
  '$lib',
  '$lib_version',
  '$device_id',
  '$is_server',
]

/**
 * Builds the minimal `$feature_flag_called` property set from fully assembled event
 * properties. Constructs a new object from {@link MINIMAL_FLAG_CALLED_EVENT_PROPERTIES}
 * rather than deleting keys, so anything not explicitly allowlisted is structurally
 * excluded. Transport-level keys an SDK carries inside `properties` (e.g. the browser
 * SDK's `token` and `distinct_id`) can be preserved via `transportKeys`.
 */
export const minimizeFlagCalledEventProperties = (
  properties: Record<string, any>,
  transportKeys: readonly string[] = []
): Record<string, any> => {
  const minimal: Record<string, any> = {}
  const copyKey = (key: string): void => {
    if (properties[key] !== undefined) {
      minimal[key] = properties[key]
    }
  }
  MINIMAL_FLAG_CALLED_EVENT_PROPERTIES.forEach(copyKey)
  transportKeys.forEach(copyKey)
  return minimal
}
