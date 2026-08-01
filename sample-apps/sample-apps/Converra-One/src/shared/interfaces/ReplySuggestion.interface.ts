export interface ReplyOption {
  id: string;
  tone: 'professional' | 'casual' | 'concise' | 'detailed' | 'decline';
  suggestedText: string;
  confidenceScore: number;
}

export interface ReplySuggestion {
  messageId: string;
  conversationId: string;
  suggestions: ReplyOption[];
  recommendedOptionId: string;
  generatedAt: Date;
}
