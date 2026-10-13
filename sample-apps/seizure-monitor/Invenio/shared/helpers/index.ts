/**
 * Shared Helpers — Pure utility functions.
 * These functions have no side effects and no external dependencies.
 */

/** Delay execution by ms milliseconds */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** Clamp a number between min and max */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

/** Create a unique ID (browser/Node compatible) */
export const createId = (): string =>
  Math.random().toString(36).substring(2, 11)

/** Format bytes to human-readable string */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
