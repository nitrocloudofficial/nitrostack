import { addDays, todayISO, formatMonthDay, formatDate } from '../../../common/dates.js';

export interface SampleTranscript {
  transcript_id: string;
  meeting_date: string;
  meeting_title: string;
  participants: Array<{ name: string; email?: string; slack_id?: string }>;
  text: string;
}

export function getSampleTranscripts(): SampleTranscript[] {
  const meeting = todayISO();
  const dueA = addDays(meeting, 3);
  const dueB = addDays(meeting, 3);
  const dueC = addDays(meeting, 5);

  const participants = [
    { name: 'Priya Shah', email: 'priya@company.com', slack_id: 'U01PRIYA' },
    { name: 'Marcus Chen', email: 'marcus@company.com', slack_id: 'U01MARCUS' },
    { name: 'Aisha Khan', email: 'aisha@company.com', slack_id: 'U01AISHA' },
    { name: 'Tom Park', email: 'tom@company.com', slack_id: 'U01TOM' },
  ];

  const text = `Meeting: Weekly Ops Standup
Date: ${formatDate(meeting)}
Participants: Priya Shah, Marcus Chen, Aisha Khan, Tom Park

Priya Shah: I'll get the vendor report over to Acme Logistics by ${formatMonthDay(dueA)}.
Marcus Chen: I will publish the pricing API migration plan to the wiki by ${formatMonthDay(dueB)}.
Aisha Khan: I'll try to get the security audit response drafted by ${formatMonthDay(dueC)}.
Tom Park: we should probably start tracking API error budgets this quarter.
`;

  return [
    {
      transcript_id: 'mtg_ops_standup',
      meeting_date: meeting,
      meeting_title: 'Weekly Ops Standup',
      participants,
      text,
    },
  ];
}
