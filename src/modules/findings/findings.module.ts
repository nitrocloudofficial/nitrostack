import { Module } from "@nitrostack/core";
import { FindingsTools } from "./findings.tools.js";

@Module({
  name: "findings",
  description: "Persists, classifies, ranks, and analyzes the recurrence history of security findings (Supabase-backed).",
  controllers: [FindingsTools],
})
export class FindingsModule {}
