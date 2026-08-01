/**
 * Secure Memory Handling Utilities
 *
 * Node.js/V8 gives no hard guarantee that memory is wiped or that garbage
 * collection is immediate, so these helpers are "best effort" — they
 * minimize the *window* during which decrypted plaintext sits in memory,
 * and make the intent explicit at every call site.
 *
 * Rules enforced by convention throughout the gateway:
 *  - Decrypted plaintext only ever exists inside a single request's
 *    execution scope (a function call), never in module-level state.
 *  - Buffers holding key material or plaintext are wiped as soon as
 *    they are no longer needed.
 *  - Nothing decrypted is ever written to disk.
 */

/** Overwrites a Buffer's contents with zeros in place. */
export function wipeBuffer(buffer: Buffer): void {
  buffer.fill(0);
}

/**
 * Runs `fn` with a sensitive Buffer, then wipes it — even if `fn` throws.
 * Use this to scope the lifetime of key material and decrypted plaintext.
 */
export async function withSensitiveBuffer<T>(
  buffer: Buffer,
  fn: (buf: Buffer) => Promise<T>
): Promise<T> {
  try {
    return await fn(buffer);
  } finally {
    wipeBuffer(buffer);
  }
}

/**
 * Best-effort shallow wipe of string-valued fields on a plain object,
 * for use right after a decrypted object has been consumed (e.g. handed
 * off to the caller) and is no longer needed by the gateway itself.
 *
 * Note: JS strings are immutable, so this cannot truly zero memory — it
 * only removes references so the object becomes eligible for GC sooner.
 * True secret material should be kept in Buffers, not strings.
 */
export function releaseObjectReferences(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    obj[key] = undefined;
  }
}
