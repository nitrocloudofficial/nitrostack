import { InboxWorkflowService } from '../workflows/InboxWorkflow.service.js';

export const inboxResource = {
  uri: 'resource://inbox/unified',
  name: 'Unified Inbox Stream',
  description: 'Multi-platform aggregated message stream',
  read: async () => {
    const service = new InboxWorkflowService();
    return service.getUnifiedInbox();
  }
};
