/**
 * Mock meeting data fixtures
 */

export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  transcript: string;
  summary?: string;
  keyDecisions?: string[];
}

export const mockMeetings: Meeting[] = [
  {
    id: 'mtg_001',
    title: 'Q4 Product Roadmap Planning',
    date: '2025-01-15T10:00:00Z',
    attendees: ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Lee'],
    transcript: `Alice: Good morning everyone. Let's discuss our Q4 roadmap. We need to prioritize the mobile app redesign.
Bob: I agree. The current design is outdated. I'd estimate 3 weeks for the redesign.
Carol: We should also include dark mode support. That's been requested by many users.
David: I can handle the dark mode implementation. I'll start by next Monday.
Alice: Great. Carol, can you create a task for the mobile redesign? Deadline should be end of February.
Carol: Will do. I'll assign it to Bob and set the priority to high.
Bob: Also, we need to schedule a follow-up meeting for mid-February to review progress.
Alice: Perfect. Let's schedule that for February 15th at 2 PM.`,
    summary: 'Discussed Q4 product roadmap with focus on mobile app redesign and dark mode support.',
    keyDecisions: [
      'Prioritize mobile app redesign (3 weeks estimate)',
      'Include dark mode support',
      'Schedule follow-up meeting for February 15th'
    ]
  },
  {
    id: 'mtg_002',
    title: 'Engineering Team Standup',
    date: '2025-01-14T09:30:00Z',
    attendees: ['David Lee', 'Emma Wilson', 'Frank Brown'],
    transcript: `David: Let's do a quick standup. Emma, what are you working on?
Emma: I'm finishing the API authentication module. Should be done by tomorrow.
Frank: I'm blocked on the database schema. Need Emma's API spec first.
David: Emma, can you share the spec with Frank today?
Emma: Yes, I'll send it by end of day.
Frank: Once I get the spec, I can complete the schema by Friday.
David: Great. Let's schedule a code review for next Monday.`,
    summary: 'Team standup covering API authentication, database schema, and code review scheduling.',
    keyDecisions: [
      'API spec to be shared today',
      'Database schema completion by Friday',
      'Code review scheduled for Monday'
    ]
  }
];

export const recentMeetings = mockMeetings.slice(0, 2);
