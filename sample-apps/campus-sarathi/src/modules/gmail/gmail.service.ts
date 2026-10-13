import { Injectable } from '@nitrostack/core';
import { GoogleAuthService } from '../../services/google-auth.service.js';
import { google } from 'googleapis';

@Injectable()
export class GmailService {
  constructor(private googleAuth: GoogleAuthService) {}

  private async getGmailClient() {
    const auth = await this.googleAuth.getAuthClient();
    return google.gmail({ version: 'v1', auth });
  }

  async getUnreadAcademic() {
    const gmail = await this.getGmailClient();
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread (subject:assignment OR subject:exam OR subject:class OR subject:due)',
      maxResults: 10
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      
      const headers = detail.data.payload?.headers;
      const subject = headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
      const sender = headers?.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
      
      emails.push({
        id: msg.id,
        subject,
        sender,
        snippet: detail.data.snippet
      });
    }

    return { emails };
  }

  async summarizeEmail(id: string) {
    const gmail = await this.getGmailClient();
    const detail = await gmail.users.messages.get({ userId: 'me', id, format: 'full' });

    // Extract plain text body if available
    const getBody = (payload: any): string => {
      if (!payload) return '';
      if (payload.body && payload.body.data) return Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
          const r = getBody(part);
          if (r) return r;
        }
      }
      return '';
    };

    const body = getBody(detail.data.payload) || detail.data.snippet || '';

    // Return a short summary (first 600 chars) to avoid huge payloads
    const summary = body ? (body.length > 600 ? body.slice(0, 600) + '...' : body) : 'No summary available.';
    return { summary };
  }

  async searchEmail(query: string) {
    const gmail = await this.getGmailClient();
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 10
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const msg of messages) {
      if (!msg.id) continue;
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      
      const headers = detail.data.payload?.headers;
      const subject = headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
      const sender = headers?.find(h => h.name?.toLowerCase() === 'from')?.value || 'Unknown Sender';
      
      emails.push({
        id: msg.id,
        subject,
        sender,
        snippet: detail.data.snippet
      });
    }

    return { emails };
  }

  async getAssignmentEmails() {
    return this.searchEmail('subject:assignment OR subject:homework');
  }
}
