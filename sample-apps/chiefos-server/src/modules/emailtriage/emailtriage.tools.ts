import { ToolDecorator as Tool, z, ExecutionContext, Injectable, Widget } from '@nitrostack/core';

/**
 * Email Triage Tools
 * 
 * Tools for analyzing, categorizing, and triaging emails
 */
@Injectable()
export class EmailTriageTools {
  @Tool({
    name: 'analyze_email',
    description: 'Analyze an email and extract key information including sender, subject, priority, and suggested category',
    inputSchema: z.object({
      emailId: z.string().describe('Unique identifier for the email'),
      sender: z.string().describe('Email sender address'),
      subject: z.string().describe('Email subject line'),
      body: z.string().describe('Email body content'),
    }),
  })
  @Widget({ route: 'email-triage' })
  async analyzeEmail(
    input: { emailId: string; sender: string; subject: string; body: string },
    context: ExecutionContext
  ) {
    context.logger.info('Analyzing email', { emailId: input.emailId, sender: input.sender });

    // Simulate AI analysis of email content
    const priority = this.determinePriority(input.subject, input.body);
    const category = this.categorizeEmail(input.subject, input.body);
    const actionItems = this.getActionItems(input.body);

    return {
      emailId: input.emailId,
      sender: input.sender,
      subject: input.subject,
      priority,
      category,
      actionItems,
      requiresApproval: priority === 'high' || category === 'urgent',
      timestamp: new Date().toISOString(),
    };
  }

  @Tool({
    name: 'categorize_emails',
    description: 'Categorize a batch of emails into predefined categories (work, personal, spam, urgent)',
    inputSchema: z.object({
      emails: z.array(
        z.object({
          id: z.string(),
          subject: z.string(),
          preview: z.string(),
        })
      ).describe('Array of emails to categorize'),
    }),
  })
  async categorizeEmails(
    input: { emails: Array<{ id: string; subject: string; preview: string }> },
    context: ExecutionContext
  ) {
    context.logger.info('Categorizing batch of emails', { count: input.emails.length });

    const categorized = input.emails.map((email) => ({
      id: email.id,
      subject: email.subject,
      category: this.categorizeEmail(email.subject, email.preview),
      priority: this.determinePriority(email.subject, email.preview),
    }));

    return {
      total: input.emails.length,
      categorized,
      summary: {
        work: categorized.filter((e) => e.category === 'work').length,
        personal: categorized.filter((e) => e.category === 'personal').length,
        urgent: categorized.filter((e) => e.category === 'urgent').length,
        spam: categorized.filter((e) => e.category === 'spam').length,
      },
    };
  }

  @Tool({
    name: 'extract_action_items',
    description: 'Extract action items and deadlines from email content',
    inputSchema: z.object({
      emailId: z.string().describe('Email identifier'),
      content: z.string().describe('Email content to analyze'),
    }),
  })
  async extractActionItemsTool(
    input: { emailId: string; content: string },
    context: ExecutionContext
  ) {
    context.logger.info('Extracting action items', { emailId: input.emailId });

    const actionItems = this.getActionItems(input.content);

    return {
      emailId: input.emailId,
      actionItems,
      count: actionItems.length,
      requiresFollowUp: actionItems.length > 0,
    };
  }

  // Helper methods
  private determinePriority(subject: string, body: string): 'high' | 'medium' | 'low' {
    const content = `${subject} ${body}`.toLowerCase();
    if (content.includes('urgent') || content.includes('asap') || content.includes('critical')) {
      return 'high';
    }
    if (content.includes('important') || content.includes('deadline')) {
      return 'medium';
    }
    return 'low';
  }

  private categorizeEmail(subject: string, body: string): string {
    const content = `${subject} ${body}`.toLowerCase();

    if (content.includes('unsubscribe') || content.includes('promotional')) {
      return 'spam';
    }
    if (content.includes('urgent') || content.includes('critical') || content.includes('emergency')) {
      return 'urgent';
    }
    if (content.includes('meeting') || content.includes('project') || content.includes('deadline')) {
      return 'work';
    }
    if (content.includes('personal') || content.includes('family') || content.includes('friend')) {
      return 'personal';
    }

    return 'work';
  }

  private getActionItems(content: string): string[] {
    const items: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.includes('please') || line.includes('need') || line.includes('action') || line.includes('todo')) {
        items.push(line.trim());
      }
    }

    return items.slice(0, 5); // Return top 5 action items
  }
}
