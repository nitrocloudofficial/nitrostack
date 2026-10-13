import { z } from "zod"

const nonEmptyTrimmedString = z.string().trim().min(1)

export const factoryRegistrationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  industryType: z.string().trim().min(2, "Industry type is required").max(100),
  location: z.object({
    lat: z.number().min(-90).max(90, "Invalid latitude"),
    lng: z.number().min(-180).max(180, "Invalid longitude"),
    address: z.string().trim().min(5, "Address is required").max(200),
  }),
  productionCapacity: z.string().trim().min(1, "Production capacity is required").max(120),
  rawMaterials: z.array(nonEmptyTrimmedString).min(1, "At least one raw material is required").max(25),
  declaredWastes: z.array(nonEmptyTrimmedString).min(1, "At least one waste stream is required").max(25),
})

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1, "Message content is required").max(4000),
})

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, "At least one message is required").max(24),
})

export const swarmActionSchema = z.object({
  action: z.enum(["start", "stop", "reset"]),
})

export type FactoryRegistrationInput = z.infer<typeof factoryRegistrationSchema>
export type ChatRequestInput = z.infer<typeof chatRequestSchema>
export type SwarmActionInput = z.infer<typeof swarmActionSchema>
