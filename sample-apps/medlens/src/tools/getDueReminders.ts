import { z } from "zod";
import { getScheduleForUser } from "../utils/scheduleStore";
import { ScheduleEntry } from "../types";

export const getDueRemindersSchema = z.object({
  userId: z.string().min(1).describe("Identifier for the user whose reminders are being checked."),
  currentTime: z.string().min(1).describe("Current time, e.g. '09:00' (24-hour HH:mm), used to find due doses."),
});

export type GetDueRemindersInput = z.infer<typeof getDueRemindersSchema>;

export interface GetDueRemindersResult {
  due: ScheduleEntry[];
}

// Simple string comparison works because both timeOfDay and currentTime are
// zero-padded 24-hour "HH:mm" strings, which sort lexicographically the
// same way they sort chronologically.
export async function getDueReminders(input: GetDueRemindersInput): Promise<GetDueRemindersResult> {
  const { userId, currentTime } = input;

  const schedule = getScheduleForUser(userId);
  const due = schedule.filter((entry) => !entry.taken && entry.timeOfDay <= currentTime);

  return { due };
}
