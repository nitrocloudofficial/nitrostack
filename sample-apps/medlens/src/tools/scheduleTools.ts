interface ScheduleEntry {
  name: string;
  timeOfDay: string; // "HH:MM"
  taken: boolean;
}

// In-memory store keyed by userId.
// NOTE: this resets on server restart — acceptable for hackathon demo scope.
// A real deployment would back this with a persistent store (e.g. a small DB
// or KV store) so schedules survive restarts/redeploys.
const scheduleStore = new Map<string, ScheduleEntry[]>();

// === TOOL 7: manage_medicine_schedule ===
export function manage_medicine_schedule(userId: string, name: string, timeOfDay: string) {
  const list = scheduleStore.get(userId) ?? [];
  list.push({ name, timeOfDay, taken: false });
  scheduleStore.set(userId, list);
  return { userId, schedule: list };
}

// === TOOL 8: get_due_reminders ===
export function get_due_reminders(userId: string, currentTime: string) {
  const list = scheduleStore.get(userId) ?? [];
  const due = list.filter((entry) => !entry.taken && entry.timeOfDay <= currentTime);
  return { due };
}

// Exposed only for orchestration wiring (auto-calling get_due_reminders after
// manage_medicine_schedule) and for tests — not a public MCP tool itself.
export function _debugGetStore() {
  return scheduleStore;
}
