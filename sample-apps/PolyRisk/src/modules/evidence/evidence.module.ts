import { Module } from '@nitrostack/core';
import { EvidenceTools } from './evidence.tools.js';
import { GWASCatalogService } from './gwas-catalog.service.js';
import { PubMedService } from './pubmed.service.js';
import { EvidenceFilterEngine } from './evidence-filter.engine.js';

@Module({
  name: 'evidence',
  description: 'GWAS Catalog and PubMed integration with evidence-quality filtering',
  controllers: [EvidenceTools],
  providers: [GWASCatalogService, PubMedService, EvidenceFilterEngine],
  exports: [GWASCatalogService, PubMedService, EvidenceFilterEngine],
})
export class EvidenceModule {}
