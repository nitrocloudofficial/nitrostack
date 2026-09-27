import { ScheduleEntry } from "../types";

/**
 * In-memory schedule store, keyed by userId.
 *
 * NOTE: this resets on every server restart. That's an accepted limitation
 * for hackathon/demo scope — a real deployment would back this with a
 * database or persistent key-value store instead.
 */
const scheduleStore = new Map<string, ScheduleEntry[]>();

export function getScheduleForUser(userId: string): ScheduleEntry[] {
  return scheduleStore.get(userId) ?? [];
}

export function addScheduleEntry(userId: string, entry: ScheduleEntry): ScheduleEntry[] {
  const existing = scheduleStore.get(userId) ?? [];
  const updated = [...existing, entry];
  scheduleStore.set(userId, updated);
  return updated;
}
