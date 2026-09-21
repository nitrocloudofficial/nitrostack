import { ToolDecorator as Tool, z, ExecutionContext } from '@nitrostack/core';
import { google } from 'googleapis';

function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

export class GmailTools {
  @Tool({
    name: 'search_emails',
    description: 'Search Gmail for recent emails matching a keyword or sender',
    inputSchema: z.object({
      query: z.string().describe('Search keyword, e.g. sender name, subject word, or Gmail search syntax'),
      maxResults: z.number().int().min(1).max(20).default(5).describe('Max number of emails to return')
    })
  })
  async searchEmails(input: { query: string; maxResults: number }, ctx: ExecutionContext) {
    const gmail = getGmailClient();

    const list = await gmail.users.messages.list({
      userId: 'me',
      q: input.query,
      maxResults: input.maxResults
    });

    const messages = list.data.messages || [];

    const details = await Promise.all(
      messages.map(async (m) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: m.id as string,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });

        const headers = msg.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name === name)?.value || '';

        return {
          subject: getHeader('Subject'),
          from: getHeader('From'),
          date: getHeader('Date'),
          snippet: msg.data.snippet
        };
      })
    );

    return { emails: details };
  }

  @Tool({
    name: 'send_email',
    description: 'Send an email via Gmail',
    inputSchema: z.object({
      to: z.string().describe('Recipient email address'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body text')
    })
  })
  async sendEmail(input: { to: string; subject: string; body: string }, ctx: ExecutionContext) {
    const gmail = getGmailClient();

    const messageParts = [
      'To: ' + input.to,
      'Subject: ' + input.subject,
      '',
      input.body
    ];
    const message = messageParts.join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return {
      status: 'sent',
      messageId: res.data.id,
      to: input.to,
      subject: input.subject
    };
  }
}