import { ToolDecorator as Tool, z, ExecutionContext, Widget } from '@nitrostack/core';
import { ChatService, OpenAIMessage } from './chat.service.js';
import { MemoryDatabaseService } from '../memory/memory.database.js';

/**
 * Chat Tools
 * 
 * Handles message sending with context injection and conversation retrieval.
 */
export class ChatTools {
  private chatService: ChatService;
  private memoryDb: MemoryDatabaseService;

  constructor() {
    this.chatService = new ChatService({
      get: (key: string) => process.env[key],
    } as any);
    this.memoryDb = new MemoryDatabaseService({
      get: (key: string) => process.env[key],
    } as any);
  }

  @Tool({
    name: 'send-message',
    description: 'Send a message to the AI with retrieved context from memory',
    inputSchema: z.object({
      conversationId: z.string().describe('The conversation ID'),
      userMessage: z.string().describe('The user message'),
      retrievedContext: z.array(z.object({
        userMessage: z.string(),
        aiResponse: z.string(),
        relevanceScore: z.number(),
      })).optional().describe('Retrieved memories to use as context'),
      model: z.string().optional().describe('The AI model to use (default: gpt-4)'),
    }),
  })
  @Widget({ route: 'chat-window' })
  async sendMessage(
    input: {
      conversationId: string;
      userMessage: string;
      retrievedContext?: Array<{
        userMessage: string;
        aiResponse: string;
        relevanceScore: number;
      }>;
      model?: string;
    },
    context: ExecutionContext
  ) {
    try {
      // Build augmented system prompt with retrieved context
      const systemPrompt = this.chatService.buildAugmentedPrompt(
        input.retrievedContext || []
      );

      // Prepare messages for OpenAI
      const messages: OpenAIMessage[] = [
        {
          role: 'user',
          content: input.userMessage,
        },
      ];

      // Get response from OpenAI
      const aiResponse = await this.chatService.sendMessage(messages, systemPrompt);

      context.logger.info(
        `Sent message to ${input.model || 'gpt-4'} for conversation ${input.conversationId}`
      );

      return {
        success: true,
        response: aiResponse,
        model: input.model || 'gpt-4',
        contextUsed: (input.retrievedContext || []).length,
      };
    } catch (error) {
      context.logger.error(`Failed to send message: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  @Tool({
    name: 'list-conversation',
    description: 'Retrieve the full message history of a conversation with memory tags',
    inputSchema: z.object({
      conversationId: z.string().describe('The conversation ID to retrieve'),
    }),
  })
  @Widget({ route: 'chat-window' })
  async listConversation(
    input: {
      conversationId: string;
    },
    context: ExecutionContext
  ) {
    try {
      // Get conversation metadata
      const conversation = await this.memoryDb.getConversation(input.conversationId);

      if (!conversation) {
        return {
          success: false,
          error: `Conversation ${input.conversationId} not found`,
          messages: [],
        };
      }

      // Get all messages in the conversation
      const messages = await this.memoryDb.getConversationMessages(input.conversationId);

      context.logger.info(
        `Retrieved ${messages.length} messages from conversation ${input.conversationId}`
      );

      return {
        success: true,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          messageCount: conversation.messageCount,
          avatarUrl: conversation.avatarUrl,
        },
        messages: messages.map((m) => ({
          id: m.id,
          userMessage: m.userMessage,
          aiResponse: m.aiResponse,
          timestamp: m.timestamp.toISOString(),
          tags: m.tags,
          sourceModel: m.sourceModel,
        })),
      };
    } catch (error) {
      context.logger.error(`Failed to list conversation: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messages: [],
      };
    }
  }
}
