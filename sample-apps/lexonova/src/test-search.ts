import { LegalTools } from './modules/legal/legal.tools.js';
import { LegalService } from './modules/legal/legal.service.js';

const service = new LegalService();
const tools = new LegalTools(service);

const result = await tools.searchLaw({ query: 'wages' }, { logger: console } as any);
console.log('=== search_law ===');
console.log(JSON.stringify(result, null, 2));

const result2 = await tools.getProcedure({ issue_type: 'complaint' }, { logger: console } as any);
console.log('=== get_procedure ===');
console.log(JSON.stringify(result2, null, 2));