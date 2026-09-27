import { Injectable } from '@nitrostack/core';
import { google } from 'googleapis';

@Injectable()
export class GmailService {
  private getGmailClient() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:8080'
    );

    // Provide your stored refresh token logic here
    if (process.env.GMAIL_REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      });
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async searchEmails(query: string) {
    const gmail = this.getGmailClient();
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 5,
    });
    return response.data.messages || [];
  }

  /**
   * Send a plain-text email using the Gmail API. Requires the oauth client to have a valid
   * refresh_token with the https://www.googleapis.com/auth/gmail.send scope.
   */
  async sendEmail(to: string, subject: string, body: string) {
    const gmail = this.getGmailClient();

    const messageLines = [
      `From: me`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body,
    ];

    const message = messageLines.join('\r\n');
    const encoded = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: encoded },
    });

    return res.data;
  }
}
