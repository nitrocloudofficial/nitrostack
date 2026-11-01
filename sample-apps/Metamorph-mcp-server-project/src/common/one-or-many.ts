// Models often pass one string where a list is expected ("packages": "npm:lodash@4.17.15"). The SDK rejects a wrong type
// before our handler runs and its message names no next step (see docs/EVAL_RESULTS.md section 1), so list inputs also accept
// a single item and the handler wraps it. The advertised schema is an anyOf of array and string, each with its own bounds.
import { z } from '@nitrostack/core';

export const oneOrMany = <T extends z.ZodTypeAny>(item: T, maxItems: number) => z.union([z.array(item).max(maxItems), item]);

export function toList<T>(value: T | T[] | undefined): T[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}
