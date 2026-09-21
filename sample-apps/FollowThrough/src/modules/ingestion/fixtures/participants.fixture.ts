export interface ParticipantFixture {
  name: string;
  email: string;
  slack_id: string;
  manager_email?: string;
}

export const PARTICIPANTS_FIXTURE: ParticipantFixture[] = [
  { name: 'Priya Shah', email: 'priya@company.com', slack_id: 'U01PRIYA', manager_email: 'raj.patel@company.com' },
  { name: 'Marcus Chen', email: 'marcus@company.com', slack_id: 'U01MARCUS', manager_email: 'raj.patel@company.com' },
  { name: 'Aisha Khan', email: 'aisha@company.com', slack_id: 'U01AISHA', manager_email: 'ellen.wu@company.com' },
  { name: 'Tom Park', email: 'tom@company.com', slack_id: 'U01TOM', manager_email: 'ellen.wu@company.com' },
  { name: 'Raj Patel', email: 'raj.patel@company.com', slack_id: 'U01RAJ' },
  { name: 'Ellen Wu', email: 'ellen.wu@company.com', slack_id: 'U01ELLEN' },
];
