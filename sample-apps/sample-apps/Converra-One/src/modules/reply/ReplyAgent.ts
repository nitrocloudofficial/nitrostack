import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { ReplySuggestion } from '../../shared/interfaces/ReplySuggestion.interface.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export interface ReplyAgentInput {
  messageId: string;
  tone?: string;
}

export class ReplyAgent extends BaseAgent<ReplyAgentInput, ReplySuggestion> {
  public readonly name = 'ReplyAgent';
  public readonly type = AgentType.REPLY;
  public readonly description = 'Generates context-aware smart responses across multiple tones';

  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(input: ReplyAgentInput): Promise<AgentResponse<ReplySuggestion>> {
    const startTime = Date.now();
    try {
      const demoStore = DemoStoreService.getInstance();
      const toneMap: Record<string, 'professional' | 'casual' | 'concise' | 'detailed' | 'decline'> = {
        Professional: 'professional',
        Friendly: 'casual',
        Formal: 'professional',
        Short: 'concise',
        Detailed: 'detailed'
      };

      const mappedTone = toneMap[input.tone || 'Professional'] || 'professional';
      const targetMsg = demoStore.getMessages().find(m => m.id === input.messageId || m.externalId === input.messageId);
      const recipientName = targetMsg ? targetMsg.sender.name : 'Dr. Vance';

      let draft = `Hi ${recipientName},\n\nThank you for reaching out regarding "${targetMsg?.subject || 'the project'}". I have reviewed the details and updated our workspace accordingly.\n\nBest regards,\nAlex Mercer`;

      if (mappedTone === 'casual') {
        draft = `Hey ${recipientName}! Thanks for the update on "${targetMsg?.subject || 'this'}". All set on my side!\n\nCheers,\nAlex`;
      } else if (mappedTone === 'concise') {
        draft = `Received. Will handle "${targetMsg?.subject || 'item'}" right away. Thanks!`;
      }

      const result: ReplySuggestion = {
        messageId: input.messageId,
        conversationId: targetMsg?.conversationId || 'conv-01',
        suggestions: [
          {
            id: 'opt-01',
            tone: mappedTone,
            suggestedText: draft,
            confidenceScore: 0.96
          }
        ],
        recommendedOptionId: 'opt-01',
        generatedAt: new Date()
      };

      demoStore.saveReply(result);

      const duration = Date.now() - startTime;
      this.healthMonitor.recordExecution(this.name, duration, true);

      return this.createSuccessResponse(result, duration, `Generated ${mappedTone} smart reply draft`);
    } catch (err: unknown) {

      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
