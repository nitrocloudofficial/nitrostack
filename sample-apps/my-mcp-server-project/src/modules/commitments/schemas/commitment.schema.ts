import { z } from "@nitrostack/core";

export const CommitmentSchema = z.object({
  who: z.string(),
  what: z.string(),
  dueDate: z.string().nullable(),
  meetingId: z.string(),
  confidence: z.number(),
  id: z.string().optional(),
  status: z.enum(["open", "resolved", "overdue"]).optional(),
});

export const CommitmentsSchema = z.array(CommitmentSchema);

export type Commitment = z.infer<typeof CommitmentSchema>;