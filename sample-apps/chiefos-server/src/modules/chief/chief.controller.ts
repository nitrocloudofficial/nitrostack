import {
  Injectable,
  ToolDecorator as Tool,
  ExecutionContext,
  z
} from "@nitrostack/core";

import { ChiefService } from "./chief.service.js";

@Injectable({
  deps: [ChiefService]
})
export class ChiefController {

  constructor(
    private readonly chiefService: ChiefService
  ) {}

  @Tool({
    name: "chief_route_work",

    description:
      "Routes any incoming work item to the correct specialist AI agent and returns a recommendation.",

    inputSchema: z.object({

      id: z.string(),

      type: z.enum([
        "email",
        "meeting",
        "task",
        "calendar"
      ]),

      title: z.string(),

      description: z.string()

    })
  })

  async routeWork(
    input: {
      id: string;
      type: "email" | "meeting" | "task" | "calendar";
      title: string;
      description: string;
    },
    context: ExecutionContext
  ) {

    context.logger.info("Chief routing work", input);

    const recommendation =
      await this.chiefService.triageWorkItem(input);

    return {

      requestId: input.id,

      type: input.type,

      title: input.title,

      ...recommendation,

      timestamp: new Date().toISOString()

    };

  }

}