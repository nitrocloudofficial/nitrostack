import { SearchAgent } from '../modules/search/SearchAgent.js';
import { SearchResult } from '../shared/interfaces/SearchResult.interface.js';

export class SearchWorkflowService {
  private searchAgent: SearchAgent;

  constructor() {
    this.searchAgent = new SearchAgent();
  }

  public async search(query: string, filters?: Record<string, unknown>): Promise<SearchResult> {
    const response = await this.searchAgent.execute({ query, filters });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Search execution failed');
    }
    return response.data;
  }
}
