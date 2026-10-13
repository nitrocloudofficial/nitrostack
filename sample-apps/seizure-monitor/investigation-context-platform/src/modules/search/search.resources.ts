import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class SearchResources {
  @Resource({
    uri: "search://results",
    name: "Investigation Search",
    description: "Search investigation artifacts",
    mimeType: "application/json",
  })
  async getResults(uri: string, ctx: ExecutionContext) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              results: [],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}