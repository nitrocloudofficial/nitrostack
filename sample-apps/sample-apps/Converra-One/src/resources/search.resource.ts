import { SearchWorkflowService } from '../workflows/SearchWorkflow.service.js';

export const searchResource = {
  uri: 'resource://search/index',
  name: 'Search Engine Index',
  description: 'Search index statistics and recent natural language query results',
  read: async () => {
    const service = new SearchWorkflowService();
    return service.search('default');
  }
};
