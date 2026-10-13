import { Module } from '@nitrostack/core';
import { RegisterFactoryTools } from './register-factory.tools.js';
import { ComplianceTools } from './compliance.tools.js';
import { ClusterStateTools } from './cluster-state.tools.js';
import { SwarmControlTools } from './swarm-control.tools.js';
import { EcosystemMapTools } from './ecosystem-map.tools.js';
import { OpportunityFeedTools } from './opportunity-feed.tools.js';
import { ProductConceptsTools } from './product-concepts.tools.js';
import { WasteProfilesTools } from './waste-profiles.tools.js';
import { PathwayTools } from './pathway.tools.js';
import { CarbonMetricsTools } from './carbon-metrics.tools.js';
import { SimulationTools } from './simulation.tools.js';
import { ImpactStoryTools } from './impact-story.tools.js';
import { DistrictDashboardTools } from './district-dashboard.tools.js';
import { IngestTools } from './ingest.tools.js';
import { SymbioForgePrompts } from './symbioforge.prompts.js';

@Module({
  name: 'symbioforge',
  description: 'SymbioForge Autonomous Circular Manufacturing Intelligence Module',
  controllers: [
    RegisterFactoryTools,
    ComplianceTools,
    ClusterStateTools,
    SwarmControlTools,
    EcosystemMapTools,
    OpportunityFeedTools,
    ProductConceptsTools,
    WasteProfilesTools,
    PathwayTools,
    CarbonMetricsTools,
    SimulationTools,
    ImpactStoryTools,
    DistrictDashboardTools,
    IngestTools,
    SymbioForgePrompts,
  ]
})
export class SymbioForgeModule {}
