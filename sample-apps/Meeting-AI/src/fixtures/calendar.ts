/**
 * Mock calendar data and event store
 */

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  attendees: string[];
  description?: string;
  createdAt: string;
}

export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: 'evt_001',
    title: 'Q4 Product Roadmap Follow-up',
    date: '2025-02-15',
    time: '14:00',
    attendees: ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Lee'],
    description: 'Follow-up meeting to review mobile app redesign progress',
    createdAt: '2025-01-15T10:45:00Z'
  },
  {
    id: 'evt_002',
    title: 'Code Review Session',
    date: '2025-01-20',
    time: '10:00',
    attendees: ['David Lee', 'Emma Wilson', 'Frank Brown'],
    description: 'Review API authentication and database schema implementations',
    createdAt: '2025-01-14T10:00:00Z'
  }
];

// In-memory calendar store
export class CalendarStore {
  private events: Map<string, CalendarEvent> = new Map();
  private nextId: number = 3;

  constructor(initialEvents: CalendarEvent[] = mockCalendarEvents) {
    initialEvents.forEach(event => {
      this.events.set(event.id, event);
    });
  }

  addEvent(event: Omit<CalendarEvent, 'id' | 'createdAt'>): CalendarEvent {
    const id = `evt_${String(this.nextId).padStart(3, '0')}`;
    this.nextId++;
    const newEvent: CalendarEvent = {
      ...event,
      id,
      createdAt: new Date().toISOString()
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  getEvent(id: string): CalendarEvent | undefined {
    return this.events.get(id);
  }

  getAllEvents(): CalendarEvent[] {
    return Array.from(this.events.values());
  }

  getUpcomingEvents(days: number = 30): CalendarEvent[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return Array.from(this.events.values())
      .filter(evt => {
        const eventDate = new Date(`${evt.date}T${evt.time}:00Z`);
        return eventDate >= now && eventDate <= futureDate;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}:00Z`);
        const dateB = new Date(`${b.date}T${b.time}:00Z`);
        return dateA.getTime() - dateB.getTime();
      });
  }

  deleteEvent(id: string): boolean {
    return this.events.delete(id);
  }
}

// Global calendar store instance
export const calendarStore = new CalendarStore();
