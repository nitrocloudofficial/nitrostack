import { JsonType, Logger } from '../types';
/**
 * Clamps a value to a range.
 * @param value the value to clamp
 * @param min the minimum value
 * @param max the maximum value
 * @param label if provided then enables logging and prefixes all logs with labels
 * @param fallbackValue if provided then returns this value if the value is not a valid number
 */
export declare function clampToRange(value: unknown, min: number, max: number, logger: Logger, fallbackValue?: number): number;
/**
 * Reads a boolean value from a remote config field.
 *
 * Remote config fields follow a pattern: they are either a boolean (false = disabled),
 * an object with specific keys, or absent/undefined.
 *
 * @param field The remote config field (e.g., `response.errorTracking`, `response.capturePerformance`)
 * @param key The key to read from the object form (e.g., `'autocaptureExceptions'`, `'network_timing'`)
 * @param defaultValue Value to return when the field is absent/undefined (defaults to `true` — don't block locally enabled capture)
 */
export declare function getRemoteConfigBool(field: boolean | {
    [key: string]: JsonType;
} | undefined, key: string, defaultValue?: boolean): boolean;
/**
 * Reads a numeric value from a remote config object field.
 *
 * Remote config values may be either numbers or numeric strings.
 *
 * @param field The remote config field (e.g. `response.sessionRecording`)
 * @param key The key to read (e.g. `'sampleRate'`)
 */
export declare function getRemoteConfigNumber(field: boolean | {
    [key: string]: JsonType;
} | undefined, key: string): number | undefined;
/**
 * Checks whether a value is a valid session replay sample rate in the inclusive range [0, 1].
 */
export declare function isValidSampleRate(value: unknown): value is number;
//# sourceMappingURL=number-utils.d.ts.map