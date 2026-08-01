import { InboxWorkflowService } from '../workflows/InboxWorkflow.service.js';

export async function fetchUnifiedInbox() {
  const service = new InboxWorkflowService();
  return service.getUnifiedInbox();
}
