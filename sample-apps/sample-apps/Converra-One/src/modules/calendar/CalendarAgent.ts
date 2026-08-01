import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { CalendarEvent } from '../../shared/interfaces/CalendarEvent.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export interface CalendarAgentInput {
  action: 'GET_EVENTS' | 'CREATE_REMINDER';
  title?: string;
  startTime?: Date;
}

export interface CalendarAgentResult {
  events: CalendarEvent[];
  createdEvent?: CalendarEvent;
}

export class CalendarAgent extends BaseAgent<CalendarAgentInput, CalendarAgentResult> {
  public readonly name = 'CalendarAgent';
  public readonly type = AgentType.CALENDAR;
  public readonly description = 'Parses meeting invites, checks availability, and creates calendar reminders';

  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(input: CalendarAgentInput): Promise<AgentResponse<CalendarAgentResult>> {
    const startTime = Date.now();
    try {
      const demoStore = DemoStoreService.getInstance();
      let createdEvent: CalendarEvent | undefined;

      if (input.action === 'CREATE_REMINDER' && input.title) {
        createdEvent = demoStore.addCalendarEvent({
          title: input.title,
          description: 'AI Generated Calendar Reminder',
          startTime: input.startTime || new Date(),
          endTime: new Date((input.startTime || new Date()).getTime() + 1800000)
        });
      }

      const events = demoStore.getCalendarEvents();
      const duration = Date.now() - startTime;
      this.healthMonitor.recordExecution(this.name, duration, true);

      return this.createSuccessResponse(
        { events, createdEvent },
        duration,
        input.action === 'CREATE_REMINDER' ? 'Calendar reminder created' : 'Fetched today schedule'
      );
    } catch (err: unknown) {

      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
