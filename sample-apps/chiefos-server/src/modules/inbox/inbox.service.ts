import { Injectable } from '@nitrostack/core';

@Injectable()
export class InboxService {

  async initialize(): Promise<void> {
    console.log('Inbox Service Initialized');
  }

  async aggregateMessages(messages: Array<{
    id: string;
    subject: string;
    sender: string;
    body: string;
  }>) {

    return messages.map(message => ({
      ...message,
      priority: this.getPriority(message.subject, message.body),
      category: this.getCategory(message.subject, message.body),
      requiresApproval: this.requiresApproval(message.subject, message.body)
    }));
  }

  async getInboxSummary(messages: Array<any>) {

    return {
      total: messages.length,
      urgent: messages.filter(m => m.priority === 'critical').length,
      high: messages.filter(m => m.priority === 'high').length,
      medium: messages.filter(m => m.priority === 'medium').length,
      low: messages.filter(m => m.priority === 'low').length
    };

  }

  private getPriority(subject: string, body: string): string {

    const text = `${subject} ${body}`.toLowerCase();

    if (
      text.includes('urgent') ||
      text.includes('critical') ||
      text.includes('asap')
    ) return 'critical';

    if (
      text.includes('important') ||
      text.includes('deadline')
    ) return 'high';

    if (
      text.includes('meeting') ||
      text.includes('review')
    ) return 'medium';

    return 'low';
  }

  private getCategory(subject: string, body: string): string {

    const text = `${subject} ${body}`.toLowerCase();

    if (text.includes('meeting'))
      return 'meeting';

    if (text.includes('task'))
      return 'task';

    if (text.includes('calendar'))
      return 'calendar';

    if (text.includes('invoice'))
      return 'finance';

    return 'general';
  }

  private requiresApproval(subject: string, body: string): boolean {

    const text = `${subject} ${body}`.toLowerCase();

    return (
      text.includes('urgent') ||
      text.includes('critical') ||
      text.includes('payment') ||
      text.includes('legal')
    );
  }
}