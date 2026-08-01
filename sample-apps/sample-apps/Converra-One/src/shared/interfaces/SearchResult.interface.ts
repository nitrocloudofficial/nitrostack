import { PlatformType } from '../enums/platform.enum.js';

export interface SearchMatch {
  id: string;
  type: 'message' | 'task' | 'calendar_event' | 'conversation';
  platform: PlatformType;
  title: string;
  snippet: string;
  timestamp: Date;
  score: number; // Relevance score
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  query: string;
  totalMatches: number;
  results: SearchMatch[];
  searchTimeMs: number;
  executedAt: Date;
}
