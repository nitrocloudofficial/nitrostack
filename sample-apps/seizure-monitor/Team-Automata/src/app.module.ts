import { McpApp, Module } from '@nitrostack/core';
import { CapTools } from './tools/cap.tools.js';
import { FillTools } from './tools/fill.tools.js';
import { MeshTools } from './tools/mesh.tools.js';
import { RepairTools } from './tools/repair.tools.js';
import { FillGeometryGuidePrompts } from './modules/bottle-cap-cad/bottle-cap-cad.prompts.js';

/**
 * Root module for the bottle-cap-cad MCP server.
 *
 * Four tools are registered:
 *   - generate_precise_cap  -> CadQuery (Python), structured JSON in, no image
 *   - fill                  -> CadQuery (Python), structured JSON in, no image
 *   - generate_visual_mesh  -> Meshy API (pure TS), raw image in, returns STL bytes
 *   - repair_mesh           -> PyMeshLab (Python), mesh URL or base64 in, returns STL bytes
 *
 * The STL from repair_mesh is the final deliverable handed back to the
 * user — there is no slicing/G-code stage in this pipeline.
 *
 * Vision/dimension-extraction from the source photo happens client-side
 * (in the MCP client, i.e. Claude) before any tool here is called. None
 * of these tools re-derive dimensions from pixels themselves.
 */
@Module({
  name: 'bottle-cap-cad',
  controllers: [CapTools, FillTools, MeshTools, RepairTools, FillGeometryGuidePrompts],
  // NitroStack's built-in OAuthModule is decorated with @Injectable(), which
  // self-registers it in the DI container the moment anything imports from
  // '@nitrostack/core' -- regardless of whether this app ever uses OAuth.
  // At startup, NitroStackServer.start() eagerly instantiates every
  // registered provider (DIContainer.instantiateAll), which tries to build
  // OAuthModule and fails because its 'OAUTH_CONFIG' constructor param was
  // never supplied (we don't call OAuthModule.forRoot() since this server
  // has no HTTP/OAuth surface). That failure is caught internally and only
  // logged as an error -- it doesn't stop the server -- but it's noisy.
  // Registering a harmless placeholder value for the 'OAUTH_CONFIG' token
  // lets that DI resolution succeed quietly. It has no effect on transport
  // selection: McpApplicationFactory.create() only switches to HTTP/dual
  // transport when OAuthModule.getConfig() (a separate static field, only
  // set by OAuthModule.forRoot()) is truthy, which this does not touch.
  providers: [{ provide: 'OAUTH_CONFIG', useValue: null }],
})
export class BottleCapModule {}

@McpApp({
  module: BottleCapModule,
  server: { name: 'bottle-cap-cad', version: '0.1.0' },
})
export class AppModule {}