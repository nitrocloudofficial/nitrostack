import {
  Injectable,
  ToolDecorator as Tool,
  ExecutionContext,
  z
} from "@nitrostack/core";

import { InboxService } from "./inbox.service.js";

@Injectable({
  deps: [InboxService]
})
export class InboxController {

  constructor(
    private readonly inboxService: InboxService
  ) {}

  @Tool({
    name: "inbox_summary",
    description: "Analyze inbox messages and return a summary.",
    inputSchema: z.object({
      messages: z.array(
        z.object({
          id: z.string(),
          subject: z.string(),
          sender: z.string(),
          body: z.string()
        })
      )
    })
  })
  async getInboxSummary(
    input: {
      messages: {
        id: string;
        subject: string;
        sender: string;
        body: string;
      }[];
    },
    context: ExecutionContext
  ) {

    context.logger.info(
      "Inbox summary requested",
      { count: input.messages.length }
    );

    const processed =
      await this.inboxService.aggregateMessages(input.messages);

    const summary =
      await this.inboxService.getInboxSummary(processed);

    return {
      processed,
      summary
    };
  }
}