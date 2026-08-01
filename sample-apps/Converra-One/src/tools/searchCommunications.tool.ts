import { SearchWorkflowService } from '../workflows/SearchWorkflow.service.js';

export const searchCommunicationsTool = {
  name: 'searchCommunications',
  description: 'Performs natural language hybrid search across all communication history',
  execute: async (input: { query: string; filters?: Record<string, unknown> }) => {
    const service = new SearchWorkflowService();
    return service.search(input.query, input.filters);
  }
};
