/**
 * ForgeOps MCP Server — Root Application Module
 *
 * Wires all 6 domain modules into a single NitroStack MCP server:
 *   1. MES (Manufacturing Execution System)
 *   2. Maintenance Management
 *   3. Quality Management
 *   4. Materials & Procurement
 *   5. Simulation Engine
 *   6. Orchestrator (Copilot-level aggregation)
 */
import {
  McpApp,
  Module,
  ConfigModule,
  ToolDecorator as Tool,
  extractTools,
} from './nitrostack.js';
import { SystemHealthCheck } from './health/system.health.js';

// Domain Modules
import { MesModule } from './modules/mes/mes.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { QualityModule } from './modules/quality/quality.module.js';
import { MaterialsModule } from './modules/materials/materials.module.js';
import { SimulationModule } from './modules/simulation/simulation.module.js';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module.js';

type DecoratedClass = new (...args: any[]) => any;

class ModuleMetadataProbe {}
Module({ name: 'metadata-bridge-probe' })(ModuleMetadataProbe);
const rootModuleMetadataKey = Reflect.getMetadataKeys(
  ModuleMetadataProbe,
).find(
  (candidate) =>
    typeof candidate === 'symbol' && candidate.description === 'module:metadata',
);

function getMetadataBySymbolDescription<T>(
  target: DecoratedClass,
  description: string,
): T | undefined {
  const key = Reflect.getMetadataKeys(target).find(
    (candidate) =>
      typeof candidate === 'symbol' && candidate.description === description,
  );

  return key ? Reflect.getMetadata(key, target) as T : undefined;
}

/**
 * NitroStudio can open a project through a Windows junction and resolve the
 * root file and nested modules through different physical paths. NitroStack
 * currently uses local Symbols for decorator metadata, so those SDK instances
 * cannot see each other's metadata. Copy it into the root SDK instance before
 * the application module is evaluated.
 */
function bridgeDomainModule(moduleClass: DecoratedClass): void {
  const metadata = getMetadataBySymbolDescription<
    Parameters<typeof Module>[0] & {
    controllers?: DecoratedClass[];
    }
  >(moduleClass, 'module:metadata');

  if (!metadata) return;

  for (const controller of metadata.controllers ?? []) {
    if (extractTools(controller).length > 0) continue;

    const tools = getMetadataBySymbolDescription<Array<{
      methodName: string;
      options: Parameters<typeof Tool>[0];
    }>>(controller, 'tool:metadata');

    for (const tool of tools ?? []) {
      const descriptor = Object.getOwnPropertyDescriptor(
        controller.prototype,
        tool.methodName,
      );

      if (descriptor) {
        Tool(tool.options)(controller.prototype, tool.methodName, descriptor);
      }
    }
  }

  if (rootModuleMetadataKey) {
    Reflect.defineMetadata(rootModuleMetadataKey, metadata, moduleClass);
  }
}

[
  MesModule,
  MaintenanceModule,
  QualityModule,
  MaterialsModule,
  SimulationModule,
  OrchestratorModule,
].forEach(bridgeDomainModule);

@Module({
  name: 'app',
  description: 'ForgeOps — AI Decision Workbench MCP Server for Smart Manufacturing',
  imports: [
    ConfigModule.forRoot(),
    MesModule,
    MaintenanceModule,
    QualityModule,
    MaterialsModule,
    SimulationModule,
    OrchestratorModule,
  ],
  providers: [SystemHealthCheck],
})
export class ForgeOpsModule {}

// Keep the MCP application decorator visible to NitroStudio's project scanner.
// The decorated wrapper is separate from the root module so Node.js 24 never
// evaluates a decorator argument that references the class being initialized.
@McpApp({
  module: ForgeOpsModule,
  server: {
    name: 'forgeops-mcp',
    version: '1.0.0',
  },
  logging: {
    level: 'info',
  },
})
export class AppModule {}
