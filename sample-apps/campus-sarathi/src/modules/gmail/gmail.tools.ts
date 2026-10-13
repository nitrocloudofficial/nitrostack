import { ToolDecorator as Tool, Widget, Cache, ExecutionContext, Injectable } from '@nitrostack/core';
import { z } from 'zod';
import { GmailService } from './gmail.service.js';

@Injectable()
export class GmailTools {
  constructor(private gmailService: GmailService) {}

  @Tool({
    name: 'get_unread_academic_emails',
    description: "Get unread academic emails for the student",
    inputSchema: z.object({}),
    examples: {
      request: {},
      response: { emails: [{ id: '1', subject: 'CS101 Assignment 2 Due', sender: 'prof@university.edu', snippet: 'Please submit your assignment by Friday.' }] }
    }
  })
  @Widget('email-list')
  @Cache({ ttl: 60 })
  async getUnreadAcademicEmails(input: any, ctx: ExecutionContext) {
    return this.gmailService.getUnreadAcademic();
  }

  @Tool({
    name: 'summarize_email',
    description: "Summarize a specific email",
    inputSchema: z.object({ id: z.string() }),
    examples: {
      request: { id: '1' },
      response: { summary: 'Assignment 2 is due on Friday.' }
    }
  })
  async summarizeEmail(input: { id: string }, ctx: ExecutionContext) {
    return this.gmailService.summarizeEmail(input.id);
  }

  @Tool({
    name: 'search_email',
    description: "Search academic emails by query",
    inputSchema: z.object({ query: z.string() }),
    examples: {
      request: { query: 'assignment' },
      response: { emails: [{ id: '1', subject: 'CS101 Assignment 2 Due', sender: 'prof@university.edu', snippet: 'Please submit your assignment by Friday.' }] }
    }
  })
  async searchEmail(input: { query: string }, ctx: ExecutionContext) {
    return this.gmailService.searchEmail(input.query);
  }
}

