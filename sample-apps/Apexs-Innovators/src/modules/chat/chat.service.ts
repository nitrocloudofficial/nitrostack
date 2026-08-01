import { Injectable, ConfigService } from '@nitrostack/core';

export interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable({ deps: [ConfigService] })
export class ChatService {
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('OPENAI_API_KEY') || '';
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
  }

  /**
   * Generate embeddings for text using OpenAI's embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as any;
    return data.data[0].embedding;
  }

  /**
   * Send a message to OpenAI and get a response
   */
  async sendMessage(
    messages: OpenAIMessage[],
    systemPrompt?: string
  ): Promise<string> {
    const allMessages: OpenAIMessage[] = [];

    if (systemPrompt) {
      allMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    allMessages.push(...messages);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as any;
    return data.choices[0].message.content;
  }

  /**
   * Build an augmented system prompt with retrieved context
   */
  buildAugmentedPrompt(
    retrievedMemories: Array<{
      userMessage: string;
      aiResponse: string;
      relevanceScore: number;
    }>
  ): string {
    let prompt = `You are a helpful AI assistant with access to organizational memory.

Below are relevant past conversations that may help you answer the current question:

`;

    if (retrievedMemories.length > 0) {
      retrievedMemories.forEach((memory, index) => {
        prompt += `\n--- Memory ${index + 1} (Relevance: ${(memory.relevanceScore * 100).toFixed(1)}%) ---\n`;
        prompt += `User: ${memory.userMessage}\n`;
        prompt += `Assistant: ${memory.aiResponse}\n`;
      });
    } else {
      prompt += '\n(No relevant past conversations found)\n';
    }

    prompt += `\nUse this context to provide informed, consistent responses. If the context is not relevant, feel free to ignore it.`;

    return prompt;
  }
}
