export type SearchDetailLevel = 'brief' | 'detailed' | 'full';

export interface SearchTransformOptions {
  searchToolName?: string; // default: 'search_tools'
  callToolName?: string; // default: 'call_tool'
  defaultLimit?: number; // default: 5
  defaultDetail?: SearchDetailLevel; // default: 'detailed'
  alwaysVisible?: string[]; // tool names that stay exposed directly in tools/list
  /**
   * Interpret the search query as a regular expression instead of a literal substring
   * (RegexSearchTransform only; default: false).
   *
   * Queries arrive from the MCP client, so enabling this lets a caller supply a pattern
   * with catastrophic backtracking (e.g. `(a+)+$`) and block the event loop for the
   * lifetime of the match. Only enable where every client is trusted.
   */
  allowRegex?: boolean;
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
