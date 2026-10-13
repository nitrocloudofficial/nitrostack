import { Controller, Tool } from '@nitrostack/core';
import { z } from 'zod';
import { GmailService } from './gmail.service.js';

const SearchEmailsSchema = z.object({
  query: z.string().describe('Search query string (e.g., "from:boss status")'),
});

@Controller()
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Tool({
    name: 'gmail_search_messages',
    description: 'Search for email messages in the user Gmail mailbox using standard filters.',
    schema: SearchEmailsSchema,
  })
  async searchMessages(input: z.infer<typeof SearchEmailsSchema>) {
    try {
      const messages = await this.gmailService.searchEmails(input.query);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              count: messages.length,
              messages,
            }),
          },
        ],
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Gmail tool error: ${error?.message ?? String(error)}` }],
      };
    }
  }
}
