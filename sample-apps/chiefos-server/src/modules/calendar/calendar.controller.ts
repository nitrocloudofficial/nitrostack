import {
  Injectable,
  ToolDecorator as Tool,
  ExecutionContext,
  z
} from "@nitrostack/core";

import { CalendarService } from "./calendar.service.js";

@Injectable({
  deps: [CalendarService]
})
export class CalendarController {

  constructor(
    private readonly calendarService: CalendarService
  ) {}

  @Tool({
    name: "calendar_status",
    description: "Returns calendar status and availability.",
    inputSchema: z.object({})
  })
  async getCalendarStatus(
    input: {},
    context: ExecutionContext
  ) {

    context.logger.info("Calendar status requested");

    const summary =
      await this.calendarService.getCalendarSummary();

    return {
      status: "ready",
      events: summary.events,
      available: true
    };
  }

}