import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class NotesResources {
  @Resource({
    uri: "notes://list",
    name: "Investigation Notes",
    description: "List all investigation notes",
    mimeType: "application/json",
  })
  async getNotes(uri: string, ctx: ExecutionContext) {
    ctx.logger.info("Fetching notes");

    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              notes: [],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}