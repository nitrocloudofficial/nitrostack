import { Injectable } from '@nitrostack/core';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    detectedIndustry?: string;
    detectedAudience?: string;
    toolInvoked?: string;
  };
}

export interface ChatSession {
  sessionId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class ChatService {
  private sessions: Map<string, ChatSession> = new Map();

  /**
   * Create or retrieve a chat session
   */
  getOrCreateSession(sessionId: string): ChatSession {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
    return this.sessions.get(sessionId)!;
  }

  /**
   * Add a message to the session
   */
  addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: ChatMessage['metadata']
  ): ChatMessage {
    const session = this.getOrCreateSession(sessionId);
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: Date.now(),
      metadata
    };
    session.messages.push(message);
    session.updatedAt = Date.now();
    return message;
  }

  /**
   * Get all messages in a session
   */
  getMessages(sessionId: string): ChatMessage[] {
    const session = this.getOrCreateSession(sessionId);
    return session.messages;
  }

  /**
   * Get the last N messages (for context window)
   */
  getRecentMessages(sessionId: string, limit: number = 10): ChatMessage[] {
    const session = this.getOrCreateSession(sessionId);
    return session.messages.slice(-limit);
  }

  /**
   * Get conversation context as a string for LLM
   */
  getConversationContext(sessionId: string): string {
    const messages = this.getMessages(sessionId);
    return messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
  }

  /**
   * Clear a session
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Get session metadata
   */
  getSessionMetadata(sessionId: string) {
    const session = this.getOrCreateSession(sessionId);
    return {
      sessionId,
      messageCount: session.messages.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastUserMessage: session.messages
        .reverse()
        .find((m) => m.role === 'user')?.content || null
    };
  }
}
