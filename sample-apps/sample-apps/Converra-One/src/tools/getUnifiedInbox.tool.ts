import { InboxWorkflowService } from '../workflows/InboxWorkflow.service.js';

export const getUnifiedInboxTool = {
  name: 'getUnifiedInbox',
  description: 'Fetches cross-platform filtered message inbox stream',
  execute: async (input?: { platform?: string }) => {
    const service = new InboxWorkflowService();
    return service.getUnifiedInbox(input?.platform);
  }
};
