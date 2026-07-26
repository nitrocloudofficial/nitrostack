import { z } from "zod";
import { addScheduleEntry } from "../utils/scheduleStore";
import { ScheduleEntry } from "../types";

export const manageMedicineScheduleSchema = z.object({
  userId: z.string().min(1).describe("Identifier for the user whose schedule is being updated."),
  name: z.string().min(1).describe("Name of the medicine to schedule."),
  timeOfDay: z.string().min(1).describe("Time of day for the dose, e.g. '08:00' (24-hour HH:mm)."),
});

export type ManageMedicineScheduleInput = z.infer<typeof manageMedicineScheduleSchema>;

export interface ManageMedicineScheduleResult {
  userId: string;
  schedule: ScheduleEntry[];
}

// Resets on server restart — acceptable for hackathon demo scope; see
// scheduleStore.ts for the shared in-memory map this reads/writes.
export async function manageMedicineSchedule(
  input: ManageMedicineScheduleInput
): Promise<ManageMedicineScheduleResult> {
  const { userId, name, timeOfDay } = input;

  const updated = addScheduleEntry(userId, { name, timeOfDay, taken: false });

  return { userId, schedule: updated };
}
