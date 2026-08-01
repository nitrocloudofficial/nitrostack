import { ReplyWorkflowService } from '../workflows/ReplyWorkflow.service.js';

export const replyToMessageTool = {
  name: 'replyToMessage',
  description: 'Generates context-aware multi-tone smart reply suggestions',
  execute: async (input: { messageId: string; tone?: string }) => {
    const service = new ReplyWorkflowService();
    return service.generateReply(input.messageId, input.tone);
  }
};
