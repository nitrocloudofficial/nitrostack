import { SearchResult, SearchMatch } from '../interfaces/SearchResult.interface.js';

export class SearchModel implements SearchResult {
  public query: string;
  public totalMatches: number;
  public results: SearchMatch[];
  public searchTimeMs: number;
  public executedAt: Date;

  constructor(data: SearchResult) {
    this.query = data.query;
    this.totalMatches = data.totalMatches;
    this.results = data.results;
    this.searchTimeMs = data.searchTimeMs;
    this.executedAt = data.executedAt;
  }
}
