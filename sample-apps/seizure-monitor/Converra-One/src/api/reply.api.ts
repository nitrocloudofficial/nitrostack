import { ReplyWorkflowService } from '../workflows/ReplyWorkflow.service.js';

export async function generateSmartReply(messageId: string, tone?: string) {
  const service = new ReplyWorkflowService();
  return service.generateReply(messageId, tone);
}
