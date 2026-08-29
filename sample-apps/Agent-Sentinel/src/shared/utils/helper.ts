export function generateId(prefix: string = "ID"): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

export function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}