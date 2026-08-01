import { ToolDecorator as Tool, type ExecutionContext, z } from "@nitrostack/core";
import { runPipeline } from "../../pipeline_runner4.js";

/** MCP tools that expose the ERP natural-language-to-SQL pipeline. */
export class ErpTools {
  @Tool({
    name: "query_erp",
    title: "Query ERP data",
    description: "Answers a natural-language ERP question by planning a safe read-only MySQL query, executing it, and summarizing the results.",
    inputSchema: z.object({
      query: z.string().trim().min(3).max(2000).describe("The ERP data question to answer."),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    invocation: { invoking: "Querying ERP data…", invoked: "ERP query completed." },
  })
  async queryErp(input: { query: string }, _context: ExecutionContext) {
    return runPipeline(input.query);
  }

  @Tool({
    name: "plan_erp_query",
    title: "Plan ERP query",
    description: "Plans a natural-language ERP query without running it against the database.",
    inputSchema: z.object({
      query: z.string().trim().min(3).max(2000).describe("The ERP data question to plan."),
    }),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  })
  async planErpQuery(input: { query: string }, _context: ExecutionContext) {
    return runPipeline(input.query, 7);
  }
}
