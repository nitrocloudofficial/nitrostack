// @ts-ignore - pg types not installed yet
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Mock embeddings for demo purposes (in production, use OpenAI API)
function generateMockEmbedding(text: string): number[] {
  const embedding: number[] = [];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate 1536-dimensional embedding based on hash
  for (let i = 0; i < 1536; i++) {
    const value = Math.sin(hash + i) * 0.5 + 0.5;
    embedding.push(value);
  }
  return embedding;
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

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

    // Load seed data
    const seedPath = path.join(process.cwd(), 'fixtures', 'seed-conversations.json');
    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

    // Clear existing data
    await client.query('DELETE FROM memories');
    await client.query('DELETE FROM conversations');

    // Insert conversations and memories
    for (const conv of seedData) {
      // Insert conversation
      await client.query(
        `INSERT INTO conversations (id, user_id, title, created_at, updated_at, message_count, avatar_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [
          conv.id,
          conv.userId,
          conv.title,
          new Date(conv.createdAt),
          new Date(conv.updatedAt),
          conv.messageCount,
          conv.avatarUrl,
        ]
      );

      // Insert memories
      for (const msg of conv.messages) {
        const combinedText = `${msg.userMessage} ${msg.aiResponse}`;
        const embedding = generateMockEmbedding(combinedText);

        const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await client.query(
          `INSERT INTO memories (
            id, conversation_id, user_id, timestamp, user_message, ai_response,
            embedding, metadata, tags, source_model
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO NOTHING`,
          [
            memoryId,
            conv.id,
            conv.userId,
            new Date(msg.timestamp),
            msg.userMessage,
            msg.aiResponse,
            JSON.stringify(embedding),
            JSON.stringify({}),
            msg.tags,
            msg.sourceModel,
          ]
        );
      }
    }

    console.log('✓ Database seeded successfully');
    console.log(`✓ Inserted ${seedData.length} conversations`);
    console.log(
      `✓ Inserted ${seedData.reduce((sum: number, c: any) => sum + c.messages.length, 0)} memories`
    );
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
