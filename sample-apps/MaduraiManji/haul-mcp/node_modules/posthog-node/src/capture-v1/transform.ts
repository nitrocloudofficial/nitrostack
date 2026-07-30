import type { JsonType, PostHogEventProperties } from '@posthog/core'

import type { V1Batch, V1Event, V1EventOptions } from './types'

/**
 * Coerce a value to a boolean the way the capture server does, or return
 * `undefined` if it cannot be coerced (the option is then omitted so the server
 * falls back to its default). Accepts native booleans, the strings
 * `"true"`/`"1"`/`"false"`/`"0"` (trimmed, case-insensitive), and any number
 * (nonzero -> true).
 */
export function coerceBool(value: JsonType): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') {
      return true
    }
    if (normalized === 'false' || normalized === '0') {
      return false
    }
  }
  return undefined
}

/**
 * Accept only a native string, else return `undefined` (the option is then
 * omitted). The backend's `product_tour_id` is `Option<String>`, so numbers,
 * booleans, objects, and arrays are dropped rather than coerced — matching
 * posthog-go, posthog-rs, and posthog-python exactly.
 */
export function coerceString(value: JsonType): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Legacy sentinel property -> typed `options` field, with its coercion. */
const OPTION_SENTINELS: ReadonlyArray<{
  property: string
  optionKey: keyof V1EventOptions
  coerce: (value: JsonType) => boolean | string | undefined
}> = [
  { property: '$cookieless_mode', optionKey: 'cookieless_mode', coerce: coerceBool },
  { property: '$ignore_sent_at', optionKey: 'disable_skew_correction', coerce: coerceBool },
  { property: '$process_person_profile', optionKey: 'process_person_profile', coerce: coerceBool },
  { property: '$product_tour_id', optionKey: 'product_tour_id', coerce: coerceString },
]

/** Sentinel property -> top-level string field (string-only, non-string dropped). */
const TOPLEVEL_SENTINELS: ReadonlyArray<{ property: string; field: 'session_id' | 'window_id' }> = [
  { property: '$session_id', field: 'session_id' },
  { property: '$window_id', field: 'window_id' },
]

function isRecord(value: JsonType | undefined): value is PostHogEventProperties {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Normalize an event timestamp to an RFC 3339 string. The queued message
 * carries either an ISO string (from `currentISOTime()`) or a `Date` (when the
 * caller passed one); numbers are treated as epoch milliseconds. Invalid values
 * fall back to "now" so a bad timestamp never rejects the whole batch.
 */
function toRfc3339(timestamp: unknown): string {
  if (typeof timestamp === 'string') {
    const asDate = new Date(timestamp)
    return Number.isNaN(asDate.getTime()) ? new Date().toISOString() : timestamp
  }
  if (timestamp instanceof Date) {
    return Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString()
  }
  const asDate = timestamp == null ? new Date() : new Date(timestamp as string | number)
  return Number.isNaN(asDate.getTime()) ? new Date().toISOString() : asDate.toISOString()
}

/**
 * Relocate a top-level `$set`/`$set_once` value into `properties`. v1 has no
 * top-level form; the server reads them from inside `properties`. An existing
 * `properties` value wins on collision.
 */
function relocateInto(properties: PostHogEventProperties, key: string, value: JsonType | undefined): void {
  if (value !== undefined && !(key in properties)) {
    properties[key] = value
  }
}

/**
 * Transform one already-normalized queued message into a Capture V1 wire event.
 *
 * The input message is never mutated (events may be retried or handed to
 * callbacks): a fresh `properties` map is built. Sentinel properties are lifted
 * out of `properties` (deleting the copy) into the typed `options` object and
 * the top-level `session_id`/`window_id` fields; `$lib`/`$lib_version` are
 * stripped (the server injects them from `PostHog-Sdk-Info`); top-level
 * `$set`/`$set_once` are relocated into `properties`.
 */
export function buildV1Event(message: PostHogEventProperties): V1Event {
  const sourceProperties = isRecord(message.properties) ? message.properties : {}
  const properties: PostHogEventProperties = { ...sourceProperties }

  const options: V1EventOptions = {}
  for (const { property, optionKey, coerce } of OPTION_SENTINELS) {
    if (property in properties) {
      const coerced = coerce(properties[property])
      if (coerced !== undefined) {
        ;(options as Record<string, boolean | string>)[optionKey] = coerced
      }
      // Always strip the sentinel, even when coercion omits the option.
      delete properties[property]
    }
  }

  const topLevel: { session_id?: string; window_id?: string } = {}
  for (const { property, field } of TOPLEVEL_SENTINELS) {
    if (property in properties) {
      const value = properties[property]
      if (typeof value === 'string') {
        topLevel[field] = value
      }
      delete properties[property]
    }
  }

  delete properties.$lib
  delete properties.$lib_version

  relocateInto(properties, '$set', message.$set)
  relocateInto(properties, '$set_once', message.$set_once)

  return {
    event: String(message.event ?? ''),
    uuid: String(message.uuid ?? ''),
    distinct_id: String(message.distinct_id ?? ''),
    timestamp: toRfc3339(message.timestamp),
    ...topLevel,
    options,
    properties,
  }
}

/** Build a Capture V1 batch envelope from already-normalized queued messages. */
export function buildV1Batch(
  messages: PostHogEventProperties[],
  { createdAt, historicalMigration }: { createdAt: string; historicalMigration?: boolean }
): V1Batch {
  const batch: V1Batch = {
    created_at: createdAt,
    batch: messages.map(buildV1Event),
  }
  if (historicalMigration) {
    batch.historical_migration = true
  }
  return batch
}
