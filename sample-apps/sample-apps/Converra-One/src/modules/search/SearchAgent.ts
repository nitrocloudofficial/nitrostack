import { BaseAgent } from '../../shared/abstracts/BaseAgent.abstract.js';
import { AgentType } from '../../shared/enums/agent.enum.js';
import { AgentResponse } from '../../shared/interfaces/AgentResponse.interface.js';
import { SearchResult, SearchMatch } from '../../shared/interfaces/SearchResult.interface.js';
import { PlatformType } from '../../shared/enums/platform.enum.js';
import { AgentHealthMonitorService } from '../../services/AgentHealthMonitor.service.js';

import { DemoStoreService } from '../../services/DemoStore.service.js';

export interface SearchAgentInput {
  query: string;
  filters?: Record<string, unknown>;
}

export class SearchAgent extends BaseAgent<SearchAgentInput, SearchResult> {
  public readonly name = 'SearchAgent';
  public readonly type = AgentType.SEARCH;
  public readonly description = 'Performs hybrid semantic and keyword search across aggregated communication data';

  private healthMonitor: AgentHealthMonitorService;

  constructor() {
    super();
    this.healthMonitor = AgentHealthMonitorService.getInstance();
  }

  public async execute(input: SearchAgentInput): Promise<AgentResponse<SearchResult>> {
    const startTime = Date.now();
    try {
      const demoStore = DemoStoreService.getInstance();
      const result = demoStore.search(input.query, input.filters);
      const duration = Date.now() - startTime;
      result.searchTimeMs = duration;

      this.healthMonitor.recordExecution(this.name, duration, true);

      return this.createSuccessResponse(result, duration, `Hybrid search completed for "${input.query}"`);
    } catch (err: unknown) {

      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.healthMonitor.recordExecution(this.name, duration, false, errorMsg);
      return this.createErrorResponse(errorMsg, duration);
    }
  }
}
