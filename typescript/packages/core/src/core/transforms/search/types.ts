export type SearchDetailLevel = 'brief' | 'detailed' | 'full';

export interface SearchTransformOptions {
  searchToolName?: string; // default: 'search_tools'
  callToolName?: string; // default: 'call_tool'
  defaultLimit?: number; // default: 5
  defaultDetail?: SearchDetailLevel; // default: 'detailed'
  alwaysVisible?: string[]; // tool names that stay exposed directly in tools/list
}

export interface BM25Document<T> {
  id: string;
  item: T;
  length: number;
  termFrequencies: Map<string, number>;
}

export interface BM25SearchResult<T> {
  item: T;
  score: number;
}

export interface IndexDocumentInput<T> {
  id: string;
  name: string;
  title?: string;
  description?: string;
  parametersText?: string;
  item: T;
}
