import { GmailService } from './gmail.service.js';

async function run() {
  const to = process.env.TEST_TO;
  const subject = process.env.TEST_SUBJECT || 'Test email from NitroStack Gmail MCP';
  const body = process.env.TEST_BODY || 'Hello — this is a test email.';

  if (!to) {
    console.error('Set TEST_TO=<recipient email> in the environment before running.');
    process.exit(1);
  }

  const svc = new GmailService();
  try {
    const res = await svc.sendEmail(to, subject, body);
    console.log('Email send result:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Failed to send email:', err?.message ?? err);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
