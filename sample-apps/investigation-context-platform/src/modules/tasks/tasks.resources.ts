import {
  ResourceDecorator as Resource,
  ExecutionContext,
} from "@nitrostack/core";

export class TasksResources {
  @Resource({
    uri: "tasks://list",
    name: "Investigation Tasks",
    description: "List all investigation tasks",
    mimeType: "application/json",
  })
  async getTasks(uri: string, ctx: ExecutionContext) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(
            {
              tasks: [],
            },
            null,
            2
          ),
        },
      ],
    };
  }
}