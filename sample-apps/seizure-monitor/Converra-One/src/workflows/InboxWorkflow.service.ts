import { ConnectorManagerService } from '../services/ConnectorManager.service.js';
import { PriorityAgent } from '../modules/priority/PriorityAgent.js';
import { Message } from '../shared/interfaces/Message.interface.js';

export class InboxWorkflowService {
  private connectorManager: ConnectorManagerService;
  private priorityAgent: PriorityAgent;

  constructor() {
    this.connectorManager = ConnectorManagerService.getInstance();
    this.priorityAgent = new PriorityAgent();
  }

  public async getUnifiedInbox(platformFilter?: string): Promise<Message[]> {
    const rawMessages = await this.connectorManager.fetchAllMessages();
    const scoredResponse = await this.priorityAgent.execute(rawMessages);
    const messages = scoredResponse.data?.scoredMessages || rawMessages;

    if (platformFilter && platformFilter !== 'ALL') {
      return messages.filter(m => m.platform === platformFilter);
    }
    return messages;
  }
}
