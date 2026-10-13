import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class ReportsResources {

  @Resource({
    uri: "reports://latest",
    name: "Latest Investigation Report",
    description: "Generated investigation reports",
    mimeType: "application/json",
  })
  async getReports(uri: string, ctx: ExecutionContext) {

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify({
            reports: [],
          }, null, 2),
        },
      ],
    };
  }
}