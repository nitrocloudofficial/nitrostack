import { Module } from '@nitrostack/core';
import { PacsTools } from './pacs.tools.js';
import { DataSourceGuard } from './pacs.datasource.js';

/**
 * PACS integration module -- read-only clinical context over MCP.
 *
 * Bridges the LangGraph clinical agent to a hospital picture archiving
 * and communication system. Currently backed by the simulated fixture
 * store in pacs.fixtures.ts; the module boundary is what lets a real
 * DICOMweb client replace it later without the agent side changing.
 *
 * DataSourceGuard is a provider, not a controller: it exposes no tools.
 * It implements OnModuleInit purely to refuse startup if DATA_SOURCE is
 * set to anything other than SIMULATED while no auth is configured --
 * see pacs.datasource.ts for why that interlock exists.
 */
@Module({
  name: 'pacs',
  description: 'Read-only prior-imaging and guideline lookup (currently simulated fixtures)',
  controllers: [PacsTools],
  providers: [DataSourceGuard],
})
export class PacsModule {}
