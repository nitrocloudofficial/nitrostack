import { ToolDecorator as Tool, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { AgentOrchestratorService } from './agent-orchestrator.service.js';
import { ChatService } from './chat.service.js';

@Injectable({ deps: [AgentOrchestratorService, ChatService] })
export class IgniteTools {
  constructor(
    private agentOrchestrator: AgentOrchestratorService,
    private chatService: ChatService
  ) {}

  @Tool({
    name: 'chat',
    description:
      'Send a message to IGNITE AI, your AI Startup Co-Founder. The agent will analyze your startup idea, determine industry and audience, and provide venture intelligence.',
    inputSchema: z.object({
      message: z.string().describe('Your startup idea, question, or message to IGNITE AI'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID for maintaining conversation context (auto-generated if omitted)')
    })
  })
  async chat(
    input: { message: string; sessionId?: string },
    ctx: ExecutionContext
  ): Promise<{
    response: string;
    sessionId: string;
    detectedIndustry?: string;
    detectedAudience?: string;
    toolInvoked: boolean;
    messageCount: number;
  }> {
    const sessionId = input.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Process the message through the agent
      const agentResponse = await this.agentOrchestrator.processMessage(sessionId, input.message);

      // Get updated session metadata
      const metadata = this.chatService.getSessionMetadata(sessionId);

      return {
        response: agentResponse.message,
        sessionId,
        detectedIndustry: agentResponse.detectedIndustry,
        detectedAudience: agentResponse.detectedAudience,
        toolInvoked: agentResponse.toolInvoked ?? false,
        messageCount: metadata.messageCount
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      ctx.logger.error(`Chat error: ${errorMessage}`);

      return {
        response: `I encountered an error: ${errorMessage}. Please try again or check your API configuration.`,
        sessionId,
        toolInvoked: false,
        messageCount: this.chatService.getSessionMetadata(sessionId).messageCount
      };
    }
  }

  @Tool({
    name: 'get-chat-history',
    description: 'Retrieve the full chat history for a session',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID to retrieve history for')
    })
  })
  async getChatHistory(
    input: { sessionId: string },
    ctx: ExecutionContext
  ): Promise<{
    sessionId: string;
    messages: Array<{
      id: string;
      role: 'user' | 'assistant';
      content: string;
      timestamp: number;
    }>;
    messageCount: number;
  }> {
    const messages = this.chatService.getMessages(input.sessionId);
    const metadata = this.chatService.getSessionMetadata(input.sessionId);

    return {
      sessionId: input.sessionId,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })),
      messageCount: metadata.messageCount
    };
  }

  @Tool({
    name: 'clear-chat-session',
    description: 'Clear the chat history for a session',
    inputSchema: z.object({
      sessionId: z.string().describe('Session ID to clear')
    })
  })
  async clearChatSession(
    input: { sessionId: string },
    ctx: ExecutionContext
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.chatService.clearSession(input.sessionId);
    return {
      success: true,
      message: `Chat session ${input.sessionId} cleared`
    };
  }
}
