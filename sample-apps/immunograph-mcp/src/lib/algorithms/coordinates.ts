export interface OneBasedInclusiveInterval {
  start: number;
  end: number;
}

export interface ZeroBasedHalfOpenInterval {
  start: number;
  endExclusive: number;
}

function assertInteger(value: number, name: string): void {
  if (!Number.isInteger(value)) throw new RangeError(`${name} must be an integer`);
}

export function toZeroBasedHalfOpen(
  interval: OneBasedInclusiveInterval,
): ZeroBasedHalfOpenInterval {
  assertInteger(interval.start, 'start');
  assertInteger(interval.end, 'end');
  if (interval.start < 1 || interval.end < interval.start) {
    throw new RangeError('One-based inclusive coordinates require 1 <= start <= end');
  }
  return { start: interval.start - 1, endExclusive: interval.end };
}

export function toOneBasedInclusive(
  interval: ZeroBasedHalfOpenInterval,
): OneBasedInclusiveInterval {
  assertInteger(interval.start, 'start');
  assertInteger(interval.endExclusive, 'endExclusive');
  if (interval.start < 0 || interval.endExclusive <= interval.start) {
    throw new RangeError('Zero-based half-open coordinates require 0 <= start < endExclusive');
  }
  return { start: interval.start + 1, end: interval.endExclusive };
}

export function sliceByOneBasedInterval(
  sequence: string,
  interval: OneBasedInclusiveInterval,
): string {
  const converted = toZeroBasedHalfOpen(interval);
  if (converted.endExclusive > sequence.length) {
    throw new RangeError('Coordinate interval exceeds sequence length');
  }
  return sequence.slice(converted.start, converted.endExclusive);
}
