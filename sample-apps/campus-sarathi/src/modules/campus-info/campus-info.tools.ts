import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { CampusInfoService } from './campus-info.service.js';

@Injectable()
export class CampusInfoTools {
  constructor(private campusInfoService: CampusInfoService) {}

  @Tool({
    name: 'get_latest_announcements',
    description: "Get the latest university announcements",
    inputSchema: z.object({}),
    examples: { request: {}, response: { announcements: [] } }
  })
  @Widget('announcement-feed')
  @Cache({ ttl: 300 })
  async getLatestAnnouncements(input: any, ctx: ExecutionContext) {
    return this.campusInfoService.getLatestAnnouncements();
  }

  @Tool({
    name: 'get_upcoming_events',
    description: "Get upcoming university events",
    inputSchema: z.object({}),
    examples: { request: {}, response: { events: [] } }
  })
  async getUpcomingEvents(input: any, ctx: ExecutionContext) {
    return this.campusInfoService.getUpcomingEvents();
  }
}

