import {
  ToolDecorator as Tool,
  ExecutionContext,
  Widget,
  z,
} from "@nitrostack/core";

export class SearchTools {
  @Tool({
    name: "search_investigation",
    description: "Search investigation artifacts",

    inputSchema: z.object({
      investigationId: z.string().uuid(),

      query: z.string().describe("Search keyword"),
    }),
  })
  @Widget("search-results")
  async search(input: any, ctx: ExecutionContext) {
    ctx.logger.info("Searching investigation", {
      query: input.query,
    });

    return {
      success: true,
      query: input.query,
      results: [],
    };
  }
}