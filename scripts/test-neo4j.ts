import { Neo4jService } from '../src/modules/aegis/graph/neo4j.service.js';
(async () => {
  const service = new Neo4jService();
  await service.onModuleInit();
  const result = await service.queryMuleGraph('ACC-4492-HDFC');
  console.log('RESULT:', JSON.stringify(result, null, 2));
  await service.onModuleDestroy();
})();
