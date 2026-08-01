export interface SlackFixtureEntry {
  message_id: string;
  channel: string;
  author: string;
  author_slack_id?: string;
  text: string;
  day_offset: number;
}

export const SLACK_FIXTURE: SlackFixtureEntry[] = [
  {
    message_id: 'slk_1001',
    channel: 'vendor-acme',
    author: 'Priya Shah',
    author_slack_id: 'U01PRIYA',
    text: 'Sent the updated vendor report to Acme Logistics this morning \u2014 summary and logistics plan attached.',
    day_offset: -1,
  },
  {
    message_id: 'slk_1002',
    channel: 'pricing-api',
    author: 'Marcus Chen',
    author_slack_id: 'U01MARCUS',
    text: 'Working through the migration edge cases, will drop the plan in the wiki shortly.',
    day_offset: 1,
  },
  {
    message_id: 'slk_1003',
    channel: 'general',
    author: 'Tom Park',
    author_slack_id: 'U01TOM',
    text: 'Had a thought on error budget dashboards for the API team \u2014 maybe we pick this up next quarter.',
    day_offset: -2,
  },
];
