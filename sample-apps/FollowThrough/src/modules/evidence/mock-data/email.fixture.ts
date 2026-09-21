export interface EmailFixtureEntry {
  message_id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  day_offset: number;
}

export const EMAIL_FIXTURE: EmailFixtureEntry[] = [
  {
    message_id: 'eml_2001',
    from: 'priya@company.com',
    to: 'contact@acmelogistics.com',
    subject: 'Updated Vendor Report \u2014 Acme Logistics',
    body: 'Please find the updated vendor report attached, along with the logistics summary you requested. Let us know if you need anything else.',
    day_offset: -1,
  },
  {
    message_id: 'eml_2002',
    from: 'marcus@company.com',
    to: 'pricing-team@company.com',
    subject: 'Re: Pricing API migration plan',
    body: 'Drafting the plan now \u2014 a couple of sections left to finalize before I publish to the wiki.',
    day_offset: 1,
  },
];
