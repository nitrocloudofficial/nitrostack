import { ToolDecorator as Tool, z, ExecutionContext, Widget } from '@nitrostack/core';
import { MemoryDatabaseService, Memory } from './memory.database.js';

/**
 * Memory Tools
 * 
 * Handles memory retrieval and persistence for the shared memory engine.
 */
export class MemoryTools {
  private memoryDb: MemoryDatabaseService;

  constructor() {
    this.memoryDb = new MemoryDatabaseService({
      get: (key: string) => process.env[key],
    } as any);
  }

  @Tool({
    name: 'retrieve-memories',
    description: 'Retrieve relevant memories from the conversation history based on semantic similarity',
    inputSchema: z.object({
      userMessage: z.string().describe('The user message to find relevant memories for'),
      conversationId: z.string().optional().describe('The conversation ID to search within (default: conv_001)'),
      embedding: z.array(z.number()).optional().describe('The embedding vector for the user message (1536 dimensions for OpenAI)'),
      limit: z.number().optional().describe('Maximum number of memories to retrieve (default: 5)'),
    }),
  })
  @Widget({ route: 'chat-window' })
  async retrieveMemories(
    input: {
      userMessage: string;
      conversationId?: string;
      embedding?: number[];
      limit?: number;
    },
    context: ExecutionContext
  ) {
    try {
      const conversationId = input.conversationId || 'conv_001';
      
      // Generate embedding if not provided
      let embedding = input.embedding;
      if (!embedding) {
        embedding = this.generateMockEmbedding(input.userMessage);
      }

      const memories = await this.memoryDb.retrieveMemoriesByRelevance(
        input.userMessage,
        embedding,
        conversationId,
        input.limit || 5
      );

      context.logger.info(`Retrieved ${memories.length} memories for conversation ${conversationId}`);

      return {
        success: true,
        count: memories.length,
        memories: memories.map((m) => ({
          id: m.id,
          userMessage: m.userMessage,
          aiResponse: m.aiResponse,
          timestamp: m.timestamp.toISOString(),
          tags: m.tags,
          relevanceScore: m.relevanceScore || 0,
          sourceModel: m.sourceModel,
        })),
      };
    } catch (error) {
      context.logger.error(`Failed to retrieve memories: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        memories: [],
        count: 0,
      };
    }
  }

  @Tool({
    name: 'save-memory',
    description: 'Save a conversation turn (user message + AI response) to memory with embeddings',
    inputSchema: z.object({
      conversationId: z.string().describe('The conversation ID'),
      userId: z.string().describe('The user ID'),
      userMessage: z.string().describe('The user message'),
      aiResponse: z.string().describe('The AI response'),
      embedding: z.array(z.number()).optional().describe('The embedding vector for the conversation turn'),
      tags: z.array(z.string()).optional().describe('Tags to categorize this memory'),
      sourceModel: z.string().optional().describe('The AI model that generated the response (default: gpt-4)'),
      metadata: z.record(z.any()).optional().describe('Additional metadata to store with the memory'),
    }),
  })
  @Widget({ route: 'chat-window' })
  async saveMemory(
    input: {
      conversationId: string;
      userId: string;
      userMessage: string;
      aiResponse: string;
      embedding?: number[];
      tags?: string[];
      sourceModel?: string;
      metadata?: Record<string, any>;
    },
    context: ExecutionContext
  ) {
    try {
      // Generate embedding if not provided
      let embedding = input.embedding;
      if (!embedding) {
        embedding = this.generateMockEmbedding(`${input.userMessage} ${input.aiResponse}`);
      }

      const memory: Omit<Memory, 'id'> = {
        conversationId: input.conversationId,
        userId: input.userId,
        userMessage: input.userMessage,
        aiResponse: input.aiResponse,
        embedding: embedding,
        tags: input.tags || [],
        sourceModel: input.sourceModel || 'gpt-4',
        metadata: input.metadata || {},
        timestamp: new Date(),
      };

      const saved = await this.memoryDb.saveMemory(memory);

      context.logger.info(`Saved memory ${saved.id} to conversation ${input.conversationId}`);

      return {
        success: true,
        memoryId: saved.id,
        message: 'Memory saved successfully',
      };
    } catch (error) {
      context.logger.error(`Failed to save memory: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate deterministic embedding based on text hash
    // This is for demo purposes; in production use OpenAI embeddings API
    const embedding: number[] = [];
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    for (let i = 0; i < 1536; i++) {
      const value = Math.sin(hash + i) * 0.5 + 0.5;
      embedding.push(value);
    }
    return embedding;
  }
}
