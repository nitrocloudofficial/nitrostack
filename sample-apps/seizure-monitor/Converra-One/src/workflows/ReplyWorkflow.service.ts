import { ReplyAgent } from '../modules/reply/ReplyAgent.js';
import { ReplySuggestion } from '../shared/interfaces/ReplySuggestion.interface.js';

export class ReplyWorkflowService {
  private replyAgent: ReplyAgent;

  constructor() {
    this.replyAgent = new ReplyAgent();
  }

  public async generateReply(messageId: string, tone: string = 'Professional'): Promise<ReplySuggestion> {
    const response = await this.replyAgent.execute({ messageId, tone });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to generate smart reply');
    }
    return response.data;
  }
}
