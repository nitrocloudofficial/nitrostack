import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { GmailService, globalGmailService } from './gmail.service.js';

@Injectable()
@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Tool({
    name: 'gmail_send_email',
    description: 'Send an email using the configured Gmail account.',
    inputSchema: z.object({
      to: z.string().describe('The recipient email address.'),
      subject: z.string().describe('The email subject.'),
      text: z.string().describe('The plain text content of the email.'),
      html: z.string().optional().describe('Optional HTML content of the email.')
    })
  })
  async sendEmail(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalGmailService.sendEmail(input.to, input.subject, input.text, input.html);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      ctx.logger.error('Failed to send email: ' + error.message);
      return { error: 'Failed to send email.', details: error.message };
    }
  }

  @Tool({
    name: 'gmail_read_inbox',
    description: 'Safely retrieve limited recent emails strictly from a specific sender.',
    inputSchema: z.object({
      sender_email: z.string().describe('The exact email address of the sender to filter by (e.g. some-person@example.com)'),
      limit: z.number().optional().describe('Maximum number of recent emails to read (defaults to 5, max 10)')
    })
  })
  async readInbox(input: any, ctx: ExecutionContext) {
    try {
      const limit = Math.min(input.limit || 5, 10);
      const messages = await globalGmailService.readLimitedInbox(input.sender_email, limit);
      return { success: true, messages };
    } catch (error: any) {
      ctx.logger.error('Failed to read inbox: ' + error.message);
      return { error: 'Failed to read inbox.', details: error.message };
    }
  }
}
