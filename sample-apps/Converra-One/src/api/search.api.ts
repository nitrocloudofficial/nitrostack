import { SearchWorkflowService } from '../workflows/SearchWorkflow.service.js';

export async function executeSearch(query: string) {
  const service = new SearchWorkflowService();
  return service.search(query);
}
