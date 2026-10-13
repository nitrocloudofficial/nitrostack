import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class EntityResources {
  @Resource({
    uri: "entity://list",
    name: "Investigation Entities",
    description: "List all extracted entities",
    mimeType: "application/json",
  })
  async getEntities(uri: string, ctx: ExecutionContext) {
    ctx.logger.info("Fetching entities");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              entities: [],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}