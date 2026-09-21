import { Injectable, ConfigService } from '@nitrostack/core';
// @ts-ignore - pg types not installed yet
import { Pool, QueryResult } from 'pg';

export type QueryResult = any;

export interface Memory {
  id: string;
  conversationId: string;
  userId: string;
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  embedding: number[];
  metadata: Record<string, any>;
  tags: string[];
  sourceModel: string;
  relevanceScore?: number;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  avatarUrl?: string;
}

@Injectable({ deps: [ConfigService] })
export class MemoryDatabaseService {
  private pool: Pool | null = null;
  private initialized = false;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get('DATABASE_URL');
    if (!databaseUrl) {
      console.warn('DATABASE_URL environment variable is not set - database operations will fail');
      return;
    }
    try {
      this.pool = new Pool({ connectionString: databaseUrl });
    } catch (error) {
      console.warn('Failed to create database pool:', error);
    }
  }

  async initializeSchema(): Promise<void> {
    if (!this.pool) {
      console.warn('Database pool not initialized');
      return;
    }
    const client = await this.pool.connect();
    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');

      // Create conversations table
      await client.query(`
        CREATE TABLE IF NOT EXISTS conversations (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          title VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          message_count INTEGER DEFAULT 0,
          avatar_url TEXT
        )
      `);

      // Create memories table with pgvector support
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id VARCHAR(255) PRIMARY KEY,
          conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_message TEXT NOT NULL,
          ai_response TEXT NOT NULL,
          embedding vector(1536),
          metadata JSONB DEFAULT '{}',
          tags TEXT[] DEFAULT ARRAY[]::TEXT[],
          source_model VARCHAR(255) DEFAULT 'gpt-4',
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
      `);

      // Create index on embeddings for similarity search
      await client.query(`
        CREATE INDEX IF NOT EXISTS memories_embedding_idx 
        ON memories USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      // Create index on conversation_id for faster queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS memories_conversation_idx 
        ON memories(conversation_id)
      `);

      // Create index on user_id for faster queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS memories_user_idx 
        ON memories(user_id)
      `);
    } finally {
      client.release();
    }
  }

  async saveMemory(memory: Omit<Memory, 'id'>): Promise<Memory> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const query = `
      INSERT INTO memories (
        id, conversation_id, user_id, timestamp, user_message, ai_response,
        embedding, metadata, tags, source_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      id,
      memory.conversationId,
      memory.userId,
      memory.timestamp,
      memory.userMessage,
      memory.aiResponse,
      JSON.stringify(memory.embedding),
      JSON.stringify(memory.metadata),
      memory.tags,
      memory.sourceModel,
    ]);

    return this.rowToMemory(result.rows[0]);
  }

  async retrieveMemoriesByRelevance(
    userMessage: string,
    embedding: number[],
    conversationId: string,
    limit: number = 5
  ): Promise<Memory[]> {
    if (!this.pool) {
      console.warn('Database not initialized, returning empty memories');
      return [];
    }
    const query = `
      SELECT *, 
        1 - (embedding <=> $1::vector) as relevance_score
      FROM memories
      WHERE conversation_id = $2
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `;

    const result = await this.pool.query(query, [
      JSON.stringify(embedding),
      conversationId,
      limit,
    ]);

    return result.rows.map((row: any) => {
      const memory = this.rowToMemory(row);
      memory.relevanceScore = row.relevance_score;
      return memory;
    });
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    if (!this.pool) {
      console.warn('Database not initialized');
      return null;
    }
    const query = `
      SELECT * FROM conversations WHERE id = $1
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async createConversation(
    conversationId: string,
    userId: string,
    title: string,
    avatarUrl?: string
  ): Promise<Conversation> {
    if (!this.pool) {
      throw new Error('Database not initialized');
    }
    const query = `
      INSERT INTO conversations (id, user_id, title, avatar_url)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      conversationId,
      userId,
      title,
      avatarUrl || null,
    ]);

    return result.rows[0];
  }

  async getConversationMessages(conversationId: string): Promise<Memory[]> {
    if (!this.pool) {
      console.warn('Database not initialized, returning empty messages');
      return [];
    }
    const query = `
      SELECT * FROM memories
      WHERE conversation_id = $1
      ORDER BY timestamp ASC
    `;

    const result = await this.pool.query(query, [conversationId]);
    return result.rows.map((row: any) => this.rowToMemory(row));
  }

  async updateConversationMetadata(
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    if (!this.pool) {
      console.warn('Database not initialized');
      return;
    }
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.messageCount !== undefined) {
      setClauses.push(`message_count = $${paramIndex++}`);
      values.push(updates.messageCount);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(conversationId);

    if (setClauses.length > 1) {
      const query = `
        UPDATE conversations
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
      `;
      await this.pool.query(query, values);
    }
  }

  private rowToMemory(row: any): Memory {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      userId: row.user_id,
      timestamp: new Date(row.timestamp),
      userMessage: row.user_message,
      aiResponse: row.ai_response,
      embedding: typeof row.embedding === 'string' 
        ? JSON.parse(row.embedding) 
        : row.embedding,
      metadata: row.metadata || {},
      tags: row.tags || [],
      sourceModel: row.source_model,
      relevanceScore: row.relevance_score,
    };
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
