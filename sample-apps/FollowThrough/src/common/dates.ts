const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function todayISO(base?: string): string {
  const d = base ? new Date(base) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}

export function addDays(base: string, days: number): string {
  const d = new Date(base);
  if (isNaN(d.getTime())) {
    return base;
  }
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatMonthDay(base: string): string {
  const d = new Date(base);
  if (isNaN(d.getTime())) {
    return base;
  }
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatDate(base: string): string {
  const d = new Date(base);
  if (isNaN(d.getTime())) {
    return base;
  }
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function weekdayName(base: string): string {
  const d = new Date(base);
  return d.toUTCString().slice(0, 3);
}

export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function sortCommitments(a: { due_date: string }, b: { due_date: string }): number {
  if (!a.due_date) return 1;
  if (!b.due_date) return -1;
  return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0;
}
