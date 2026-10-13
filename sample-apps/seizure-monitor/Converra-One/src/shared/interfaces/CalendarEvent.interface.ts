import { PlatformType } from '../enums/platform.enum.js';

export interface EventAttendee {
  email: string;
  name?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  location?: string;
  meetingUrl?: string;
  organizer?: EventAttendee;
  attendees: EventAttendee[];
  platform: PlatformType;
  externalEventId?: string;
}
